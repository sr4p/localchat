import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Plus, Clock, Zap, Hash } from "lucide-react";

import { useLLM } from "../hooks/useLLM";
import { MessageBubble } from "./MessageBubble";
import { StatusBar } from "./StatusBar";

const EXAMPLE_PROMPTS = [
  {
    label: "Solve x² + x - 12 = 0",
    prompt: "Solve x^2 + x - 12 = 0",
  },
  {
    label: "Explain quantum computing",
    prompt:
      "Explain quantum computing in simple terms. What makes it different from classical computing, and what are some real-world applications?",
  },
  {
    label: "Write a Python quicksort",
    prompt:
      "Write a clean, well-commented Python implementation of the quicksort algorithm. Include an example of how to use it.",
  },
  {
    label: "Solve a logic puzzle",
    prompt: "Five people were eating apples, A finished before B, but behind C. D finished before E, but behind B. What was the finishing order?",
  },
] as const;

function formatDurationSec(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round((sec % 60) * 10) / 10;
  return `${m}m ${s}s`;
}

/** High-resolution elapsed for live counter (updates every animation frame). */
function formatLiveElapsedSec(sec: number): string {
  if (sec < 60) return `${sec.toFixed(2)}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toFixed(2)}s`;
}

const TPS_SMOOTH = 0.22;
const TPS_DECAY = 0.92;

function LiveGenerationMetrics({
  active,
  startPerf,
}: {
  active: boolean;
  startPerf: number | null;
}) {
  const { tps } = useLLM();
  const tpsRef = useRef(tps);
  tpsRef.current = tps;
  const smoothTpsRef = useRef(0);
  const [display, setDisplay] = useState({ elapsed: 0, tpsSmooth: 0 });

  useEffect(() => {
    if (!active || startPerf == null) {
      smoothTpsRef.current = 0;
      return;
    }

    smoothTpsRef.current = 0;
    let raf = 0;

    const tick = () => {
      const elapsed = (performance.now() - startPerf) / 1000;
      const target = tpsRef.current;
      let s = smoothTpsRef.current;
      if (target > 0) {
        s += (target - s) * TPS_SMOOTH;
      } else if (s > 0.02) {
        s *= TPS_DECAY;
      } else {
        s = 0;
      }
      smoothTpsRef.current = s;
      setDisplay({ elapsed, tpsSmooth: s });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, startPerf]);

  if (!active || startPerf == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#5505af]/25 bg-gradient-to-r from-[#f4efff] via-white to-[#f0e8ff] px-2 py-1 shadow-[0_1px_8px_rgba(85,5,175,0.12)] transition-[box-shadow,transform] duration-200 ease-out">
      <span className="inline-flex min-w-[4.25rem] items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#3d1d6b] ring-1 ring-[#5505af]/15 transition-colors duration-150">
        <Clock className="h-3 w-3 shrink-0 text-[#5505af]" />
        {formatLiveElapsedSec(display.elapsed)}
      </span>
      {display.tpsSmooth > 0.08 && (
        <span className="inline-flex min-w-[3.75rem] items-center gap-1 rounded-md bg-[#5505af]/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#5505af] ring-1 ring-[#5505af]/20 transition-colors duration-150">
          <Zap className="h-3 w-3 shrink-0" />
          {display.tpsSmooth.toFixed(1)} tok/s
        </span>
      )}
    </div>
  );
}

interface ChatInputProps {
  animated?: boolean;
}

function ChatInput({ animated }: ChatInputProps) {
  const {
    send,
    stop,
    status,
    isGenerating,
    messages,
    generationStartPerf,
  } = useLLM();
  const isReady = status.state === "ready";
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lastCompletedMeta = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.responseMeta != null)?.responseMeta;

  const showLiveStats = isGenerating;
  const showLastStats = !isGenerating && lastCompletedMeta != null;

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || !isReady || isGenerating) return;
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "7.5rem";
      }
      send(text);
    },
    [input, isReady, isGenerating, send],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={`w-full ${animated ? "animate-rise-in-delayed" : ""}`}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full rounded-xl border border-[#0000001f] bg-white px-4 py-3 pb-14 text-[15px] text-black placeholder-[#6d6d6d] focus:border-[#5505af] focus:outline-none focus:ring-1 focus:ring-[#5505af] disabled:opacity-50 resize-none max-h-40 shadow-sm"
            style={{ minHeight: "7.5rem", height: "7.5rem" }}
            placeholder={isReady ? "Type a message…" : "Loading model…"}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "7.5rem";
              e.target.style.height =
                Math.max(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={!isReady}
            autoFocus
          />

          <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 px-2 pb-1">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {showLiveStats && (
                <LiveGenerationMetrics
                  active={showLiveStats}
                  startPerf={generationStartPerf}
                />
              )}
              {showLastStats && lastCompletedMeta && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/80 px-2 py-1 shadow-[0_1px_8px_rgba(5,120,90,0.1)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
                    Last reply
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-emerald-900 ring-1 ring-emerald-500/20">
                    <Clock className="h-3 w-3 shrink-0 text-emerald-600" />
                    {formatDurationSec(lastCompletedMeta.durationSec)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-emerald-800 ring-1 ring-emerald-500/25">
                    <Hash className="h-3 w-3 shrink-0 text-emerald-600" />
                    {lastCompletedMeta.tokenCount.toLocaleString()} tokens
                  </span>
                </div>
              )}
            </div>
            {isGenerating ? (
              <button
                type="button"
                onClick={stop}
                className="flex shrink-0 items-center justify-center rounded-lg text-[#6d6d6d] hover:text-black transition-colors cursor-pointer"
                title="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isReady || !input.trim()}
                className="flex shrink-0 items-center justify-center rounded-lg text-[#6d6d6d] hover:text-black disabled:opacity-30 transition-colors cursor-pointer"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

interface ChatAppProps {
  onGoHome: () => void;
}

export function ChatApp({ onGoHome }: ChatAppProps) {
  const { messages, isGenerating, send, status, clearChat } = useLLM();
  const scrollRef = useRef<HTMLElement>(null);

  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingStartRef = useRef<number | null>(null);
  const thinkingSecondsMapRef = useRef<Map<number, number>>(new Map());
  const prevIsGeneratingRef = useRef(false);
  const messagesRef = useRef(messages);
  const thinkingSecondsRef = useRef(thinkingSeconds);
  messagesRef.current = messages;
  thinkingSecondsRef.current = thinkingSeconds;

  const isReady = status.state === "ready";
  const hasMessages = messages.length > 0;
  const showNewChat = isReady && hasMessages && !isGenerating;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating) {
      const lastMsg = messagesRef.current.at(-1);
      if (lastMsg?.role === "assistant" && lastMsg.reasoning && thinkingSecondsRef.current > 0) {
        thinkingSecondsMapRef.current.set(lastMsg.id, thinkingSecondsRef.current);
      }
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      thinkingStartRef.current = null;
      return;
    }

    thinkingStartRef.current = Date.now();
    setThinkingSeconds(0);

    const interval = setInterval(() => {
      if (thinkingStartRef.current) {
        setThinkingSeconds(
          Math.round((Date.now() - thinkingStartRef.current) / 1000),
        );
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const lastAssistant = messages.at(-1);
  useEffect(() => {
    if (isGenerating && lastAssistant?.role === "assistant" && lastAssistant.content) {
      thinkingStartRef.current = null;
    }
  }, [isGenerating, lastAssistant?.role, lastAssistant?.content]);

  return (
    <div className="flex h-full flex-col brand-surface text-black">
      <header className="flex-none flex items-center justify-between border-b border-[#0000001f] px-6 py-3 h-14">
        <button
          onClick={onGoHome}
          className="cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
          title="Back to home"
        >
          <img
            src="/liquid.svg"
            alt="Liquid AI"
            className="h-6 w-auto"
            draggable={false}
          />
        </button>
        <button
          onClick={clearChat}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-opacity duration-300 cursor-pointer ${
            showNewChat ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>
      </header>

      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mb-8 text-center animate-rise-in">
            <p className="text-3xl font-medium text-black">
              What can I help you with?
            </p>
          </div>

          <ChatInput animated />

          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl animate-rise-in-delayed">
            {EXAMPLE_PROMPTS.map(({ label, prompt }) => (
              <button
                key={label}
                onClick={() => send(prompt)}
                className="rounded-lg border border-[#0000001f] bg-white px-3 py-2 text-xs text-[#6d6d6d] hover:text-black hover:border-[#5505af] transition-colors cursor-pointer shadow-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <main
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 animate-fade-in"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {!isReady && <StatusBar />}

              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1 && msg.role === "assistant";
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    index={i}
                    isStreaming={isGenerating && isLast}
                    thinkingSeconds={isLast ? thinkingSeconds : thinkingSecondsMapRef.current.get(msg.id)}
                    isGenerating={isGenerating}
                  />
                );
              })}
            </div>
          </main>

          <footer className="flex-none px-4 py-3 animate-fade-in">
            <ChatInput animated />
          </footer>
        </>
      )}
    </div>
  );
}
