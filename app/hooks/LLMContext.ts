import { createContext } from "react";

let nextMessageId = 0;

export function createMessageId(): number {
  return nextMessageId++;
}

export interface AssistantResponseMeta {
  /** Wall-clock seconds for the full generation (including prefill/stream). */
  durationSec: number;
  /** Approximate number of generated tokens (decoder steps). */
  tokenCount: number;
}

export interface ChatMessage {
  /** Local messages use a numeric counter; server-persisted messages use UUID strings. */
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  /** Display name of the model that produced this assistant message. */
  modelName?: string;
  /** Whether the message was generated locally (WebGPU) or via a remote API. */
  modelType?: "local" | "api";
  /** UUID of the parent message for branched conversations. */
  parentId?: string;
  /** Set when an assistant message finishes generating. */
  responseMeta?: AssistantResponseMeta;
}

export type LoadingStatus =
  | { state: "idle" }
  | { state: "loading"; progress?: number; message?: string }
  | { state: "ready" }
  | { state: "error"; error: string };

export type ReasoningEffort = "low" | "medium" | "high";

export interface LLMContextValue {
  status: LoadingStatus;
  messages: ChatMessage[];
  isGenerating: boolean;
  tps: number;
  /** `performance.now()` when the current generation started; null if idle. */
  generationStartPerf: number | null;
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  loadModel: () => void;
  send: (text: string) => void;
  stop: () => void;
  clearChat: () => void;
  editMessage: (index: number, newContent: string) => void;
  retryMessage: (index: number) => void;
  /** Replace message content and regenerate from that point onward. */
  reQuestion: (index: number, newContent: string) => void;
  /** Discard messages after index and regenerate with current model. */
  reAnswer: (index: number, model?: string) => void;
  /** Currently active conversation UUID; null when no conversation is open. */
  activeConversationId: string | null;
  /** Switch to an existing conversation by id, or pass null to clear. */
  setConversation: (id: string | null) => void;
  /** Create a new blank conversation and return its id. */
  createConversation: () => Promise<string>;
  /** Load an existing conversation (messages) from the server. */
  loadConversation: (id: string) => Promise<void>;
  /** Delete a conversation from the server and clear local state if active. */
  deleteConversation: (id: string) => Promise<void>;
  /** Model switching state. */
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  /** Available model configs from registry. */
  models: Array<{ id: string; displayName: string; type: string }>;
  /** Vector-based suggested questions from the same conversation. */
  suggestions: Array<{ content: string; similarity: number }>;
}

export const LLMContext = createContext<LLMContextValue | null>(null);
