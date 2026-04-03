import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
} from '@huggingface/transformers';
import { ThinkStreamParser, type ThinkDelta } from '../utils/think-parser';
import {
  LLMContext,
  createMessageId,
  type ChatMessage,
  type LoadingStatus,
  type ReasoningEffort,
} from './LLMContext';
import { useEmbedding } from './useEmbedding';
import { getModelById, DEFAULT_MODEL_ID, MODEL_REGISTRY } from '../utils/model-registry';
import { api } from '../utils/api-client';

interface PendingUserMsg {
  clientMsg: ChatMessage;
  conversationId: string;
}

interface SavedMessageResponse {
  id: string;
  role: string;
  content: string;
  reasoning: string | null;
  durationSec: number | null;
  tokenCount: number | null;
  modelName: string | null;
  modelType: 'local' | 'api' | null;
  parentId: string | null;
  createdAt: string;
}

interface ConversationDetailResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: SavedMessageResponse[];
}

function applyDeltas(msg: ChatMessage, deltas: ThinkDelta[]): ChatMessage {
  let { content, reasoning = '' } = msg;
  for (const delta of deltas) {
    if (delta.type === 'reasoning') reasoning += delta.textDelta;
    else content += delta.textDelta;
  }
  return { ...msg, content, reasoning };
}

function mapServerMessageToClient(m: SavedMessageResponse): ChatMessage {
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    reasoning: m.reasoning ?? undefined,
    modelName: m.modelName ?? undefined,
    modelType: m.modelType ?? undefined,
    parentId: m.parentId ?? undefined,
    responseMeta:
      m.durationSec != null || m.tokenCount != null
        ? { durationSec: m.durationSec ?? 0, tokenCount: m.tokenCount ?? 0 }
        : undefined,
  };
}

export function LLMProvider({ children }: { children: ReactNode }) {
  const generatorRef = useRef<Promise<TextGenerationPipeline> | null>(null);
  const stoppingCriteria = useRef(new InterruptableStoppingCriteria());
  const loadProgressPeakRef = useRef(0);
  const activeModelIdRef = useRef<string>(DEFAULT_MODEL_ID);

  const embedding = useEmbedding();

  const [status, setStatus] = useState<LoadingStatus>({ state: 'idle' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [tps, setTps] = useState(0);
  const [generationStartPerf, setGenerationStartPerf] = useState<number | null>(null);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');

  // Session state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string>(DEFAULT_MODEL_ID);

  // Suggestions
  const [suggestions, setSuggestions] = useState<Array<{ content: string; similarity: number }>>(
    [],
  );

  // Pending user messages for embedding sync
  const pendingEmbeddingQueueRef = useRef<PendingUserMsg[]>([]);

  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  messagesRef.current = messages;
  isGeneratingRef.current = isGenerating;
  activeConversationIdRef.current = activeConversationId;
  activeModelIdRef.current = activeModelId;

  // Auto-load embedding model when conversation is active
  useEffect(() => {
    if (activeConversationId && embedding.status.state === 'idle') {
      embedding.loadModel();
    }
  }, [activeConversationId]);

  // Load conversations on mount
  useEffect(() => {
    api
      .get<Array<{ id: string; title: string; messageCount: number; updatedAt: string }>>(
        '/api/conversations',
      )
      .then((list) => {
        console.log(`[LLMProvider] Loaded ${list.length} conversations`);
      })
      .catch((e) => console.error('[LLMProvider] Could not load conversations:', e));
  }, []);

  // Persist pending embeddings when embedding is ready
  useEffect(() => {
    if (embedding.status.state !== 'ready') return;
    const queue = pendingEmbeddingQueueRef.current;
    pendingEmbeddingQueueRef.current = [];
    for (const pending of queue) {
      enqueueEmbeddingGeneration(pending);
    }
  }, [embedding.status.state]);

  const enqueueEmbeddingGeneration = useCallback(
    async (pending: PendingUserMsg) => {
      if (embedding.status.state === 'ready') {
        try {
          const vec = await embedding.generate(pending.clientMsg.content);
          await api.post('/api/embeddings/sync', {
            items: [{ messageId: pending.clientMsg.id.toString(), embedding: vec }],
          });
        } catch (e) {
          console.error('[LLMProvider] Embedding sync failed:', e);
        }
      } else {
        pendingEmbeddingQueueRef.current.push(pending);
      }
    },
    [embedding],
  );

  const loadGenerator = useCallback(async () => {
    if (generatorRef.current) return generatorRef.current;
    const modelConfig = getModelById(activeModelIdRef.current)!;

    generatorRef.current = (async () => {
      loadProgressPeakRef.current = 0;
      setStatus({ state: 'loading', message: 'Downloading model…' });
      try {
        const gen = await pipeline('text-generation', modelConfig.hfRepo, {
          dtype: modelConfig.dtype,
          device: 'webgpu',
          progress_callback: (p: any) => {
            if (p.status !== 'progress' || !p.file?.endsWith('.onnx_data')) return;
            const raw =
              typeof p.progress === 'number' && Number.isFinite(p.progress) ? p.progress : 0;
            const clamped = Math.min(100, Math.max(0, raw));
            const progress = Math.max(loadProgressPeakRef.current, clamped);
            loadProgressPeakRef.current = progress;
            setStatus({
              state: 'loading',
              progress,
              message: `Downloading model… ${Math.round(progress)}%`,
            });
          },
        });
        setStatus({ state: 'ready' });
        return gen;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus({ state: 'error', error: msg });
        generatorRef.current = null;
        throw err;
      }
    })();

    return generatorRef.current;
  }, []);

  const loadModel = useCallback(() => {
    loadGenerator();
  }, [loadGenerator]);

  const runGeneration = useCallback(
    async (chatHistory: ChatMessage[]) => {
      const generator = await loadGenerator();
      const genStartPerf = performance.now();
      setIsGenerating(true);
      setGenerationStartPerf(genStartPerf);
      setTps(0);
      stoppingCriteria.current.reset();

      const parser = new ThinkStreamParser();
      let tokenCount = 0;
      let firstTokenTime = 0;

      const assistantIdx = chatHistory.length;
      setMessages((prev) => [
        ...prev,
        { id: createMessageId(), role: 'assistant', content: '', reasoning: '' },
      ]);

      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: false,
        callback_function: (output: string) => {
          if (output === '</s>') return;
          const deltas = parser.push(output);
          if (deltas.length === 0) return;
          setMessages((prev) => {
            const updated = [...prev];
            updated[assistantIdx] = applyDeltas(updated[assistantIdx], deltas);
            return updated;
          });
        },
        token_callback_function: () => {
          tokenCount++;
          if (tokenCount === 1) {
            firstTokenTime = performance.now();
          } else {
            const elapsed = (performance.now() - firstTokenTime) / 1000;
            if (elapsed > 0) {
              setTps(Math.round(((tokenCount - 1) / elapsed) * 10) / 10);
            }
          }
        },
      });

      const apiMessages = chatHistory.map((m) => ({ role: m.role, content: m.content }));
      const modelConfig = getModelById(activeModelIdRef.current)!;

      try {
        await generator(apiMessages, {
          max_new_tokens: modelConfig.maxNewTokens,
          streamer,
          stopping_criteria: stoppingCriteria.current,
          do_sample: modelConfig.supportsReasoning,
        });
      } catch (err) {
        console.error('Generation error:', err);
      }

      const remaining = parser.flush();
      if (remaining.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = applyDeltas(updated[assistantIdx], remaining);
          return updated;
        });
      }

      const durationSec = Math.round(((performance.now() - genStartPerf) / 1000) * 10) / 10;

      // Build final assistant message
      let assistantMsgRef: ChatMessage | null = null;
      setMessages((prev) => {
        const updated = [...prev];
        const prevRow = prev[assistantIdx];
        assistantMsgRef = {
          ...updated[assistantIdx],
          content: parser.content.trim() || prevRow.content,
          reasoning: parser.reasoning.trim() || prevRow.reasoning,
          modelName: modelConfig.displayName,
          modelType: modelConfig.type as 'local' | 'api',
          responseMeta: { durationSec, tokenCount },
        };
        updated[assistantIdx] = assistantMsgRef!;
        return updated;
      });

      // Persist assistant message to DB
      if (activeConversationIdRef.current && assistantMsgRef && 'id' in assistantMsgRef) {
        try {
          const saved = await api.post<SavedMessageResponse>('/api/messages', {
            conversationId: activeConversationIdRef.current,
            role: 'assistant',
            content: (assistantMsgRef as ChatMessage).content,
            reasoning: (assistantMsgRef as ChatMessage).reasoning,
            durationSec,
            tokenCount,
            modelName: modelConfig.displayName,
            modelType: modelConfig.type,
          });
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantIdx]) {
              updated[assistantIdx] = { ...updated[assistantIdx], id: saved.id };
            }
            return updated;
          });
        } catch (e) {
          console.error('[LLMProvider] Failed to persist assistant message:', e);
        }
      }

      setGenerationStartPerf(null);
      setIsGenerating(false);

      // Fetch vector-based suggestions from DB
      const userMsg = messagesRef.current.filter((m) => m.role === 'user').at(-1);
      if (userMsg && activeConversationIdRef.current && embedding.status.state === 'ready') {
        try {
          const vec = await embedding.generate(userMsg.content);
          const excludeIds = [userMsg.id.toString()];
          const results = await api.post<Array<{ content: string; similarity: number }>>(
            '/api/embeddings/suggestions',
            {
              conversationId: activeConversationIdRef.current,
              embedding: vec,
              excludeMessageIds: excludeIds,
              limit: 3,
            },
          );
          setSuggestions(results);
        } catch {
          // suggestions are non-critical — don't break the UX
        }
      }
    },
    [loadGenerator, embedding],
  );

  const send = useCallback(
    (text: string) => {
      if (isGeneratingRef.current) return;
      setSuggestions([]);

      // Auto-create conversation if none exists
      const createAndSend = async (convId: string) => {
        setActiveConversationId(convId);
        activeConversationIdRef.current = convId;

        const userMsg: ChatMessage = {
          id: createMessageId(),
          role: 'user',
          content: text,
        };

        setMessages((prev) => [...prev, userMsg]);

        // Persist user message to DB
        try {
          const saved = await api.post<SavedMessageResponse>('/api/messages', {
            conversationId: convId,
            role: 'user',
            content: text,
          });
          userMsg.id = saved.id;
          enqueueEmbeddingGeneration({ clientMsg: userMsg, conversationId: convId });
        } catch (e) {
          console.error('[LLMProvider] Failed to persist user message:', e);
        }

        runGeneration([...messagesRef.current]);
      };

      if (activeConversationIdRef.current) {
        const userMsg: ChatMessage = {
          id: createMessageId(),
          role: 'user',
          content: text,
        };
        setMessages((prev) => [...prev, userMsg]);

        // Persist + enqueue embedding
        const persistAndGen = async () => {
          try {
            const saved = await api.post<SavedMessageResponse>('/api/messages', {
              conversationId: activeConversationIdRef.current,
              role: 'user',
              content: text,
            });
            userMsg.id = saved.id;
            enqueueEmbeddingGeneration({
              clientMsg: userMsg,
              conversationId: activeConversationIdRef.current!,
            });
          } catch (e) {
            console.error('[LLMProvider] Failed to persist user message:', e);
          }
          runGeneration([...messagesRef.current]);
        };
        persistAndGen();
      } else {
        api
          .post<{ id: string; title: string }>('/api/conversations', { title: text.slice(0, 50) })
          .then((conv) => createAndSend(conv.id))
          .catch((e) => {
            console.error('[LLMProvider] Failed to create conversation:', e);
            // Fallback: just add to local state without persisting
            const userMsg: ChatMessage = { id: createMessageId(), role: 'user', content: text };
            setMessages((prev) => [...prev, userMsg]);
          });
      }
    },
    [runGeneration, enqueueEmbeddingGeneration],
  );

  const stop = useCallback(() => {
    stoppingCriteria.current.interrupt();
  }, []);

  const clearChat = useCallback(() => {
    if (isGeneratingRef.current) return;
    setActiveConversationId(null);
    activeConversationIdRef.current = null;
    setMessages([]);
  }, []);

  const editMessage = useCallback(
    (index: number, newContent: string) => {
      if (isGeneratingRef.current) return;

      setMessages((prev) => {
        const updated = prev.slice(0, index);
        updated.push({ ...prev[index], content: newContent });
        return updated;
      });

      const updatedHistory = messagesRef.current.slice(0, index);
      updatedHistory.push({
        ...messagesRef.current[index],
        content: newContent,
      });

      if (messagesRef.current[index]?.role === 'user') {
        setTimeout(() => runGeneration(updatedHistory), 0);
      }
    },
    [runGeneration],
  );

  const retryMessage = useCallback(
    (index: number) => {
      if (isGeneratingRef.current) return;

      const history = messagesRef.current.slice(0, index);
      setMessages(history);
      setTimeout(() => runGeneration(history), 0);
    },
    [runGeneration],
  );

  // Session management
  const createConversation = useCallback(async (): Promise<string> => {
    const conv = await api.post<{ id: string }>('/api/conversations', {});
    setActiveConversationId(conv.id);
    activeConversationIdRef.current = conv.id;
    setMessages([]);
    return conv.id;
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const data = await api.get<ConversationDetailResponse>(`/api/conversations/${id}`);
    setActiveConversationId(id);
    activeConversationIdRef.current = id;
    setMessages(data.messages.map(mapServerMessageToClient));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await api.delete(`/api/conversations/${id}`);
    if (activeConversationIdRef.current === id) {
      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setMessages([]);
    }
  }, []);

  const setConversation = useCallback(
    (id: string | null) => {
      if (id === null) {
        clearChat();
      } else {
        loadConversation(id);
      }
    },
    [loadConversation, clearChat],
  );

  const reQuestion = useCallback(
    (index: number, newContent: string) => {
      if (isGeneratingRef.current) return;
      const originalMsg = messagesRef.current[index];
      if (!originalMsg) return;

      const history = messagesRef.current.slice(0, index);

      setMessages((prev) => {
        const updated = prev.slice(0, index);
        updated.push({ ...originalMsg, content: newContent });
        return updated;
      });

      // Persist branched user message with parentId
      if (activeConversationIdRef.current) {
        api
          .post('/api/messages', {
            conversationId: activeConversationIdRef.current,
            role: 'user',
            content: newContent,
            parentId: originalMsg.id.toString(),
          })
          .catch((e) => console.error('[LLMProvider] Re-question persist failed:', e));
      }

      history.push({ ...originalMsg, content: newContent });
      setTimeout(() => runGeneration(history), 0);
    },
    [runGeneration],
  );

  const reAnswer = useCallback(
    (index: number, _modelId?: string) => {
      if (isGeneratingRef.current) return;
      const assistantMsg = messagesRef.current[index];
      if (!assistantMsg) return;

      const history = messagesRef.current.slice(0, index);
      setMessages(history);
      setTimeout(() => runGeneration(history), 0);
    },
    [runGeneration],
  );

  return (
    <LLMContext.Provider
      value={{
        status,
        messages,
        isGenerating,
        tps,
        generationStartPerf,
        reasoningEffort,
        setReasoningEffort,
        activeConversationId,
        activeModelId,
        setActiveModelId,
        setConversation,
        createConversation,
        loadConversation,
        deleteConversation,
        loadModel,
        send,
        stop,
        clearChat,
        editMessage,
        retryMessage,
        reQuestion,
        reAnswer,
        suggestions,
        models: MODEL_REGISTRY.map((m) => ({ id: m.id, displayName: m.displayName, type: m.type })),
      }}
    >
      {children}
    </LLMContext.Provider>
  );
}
