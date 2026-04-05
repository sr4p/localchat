import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Clock, Zap, Hash, PanelLeft, PanelLeftClose, Keyboard, Search, ChevronLeft } from "lucide-react";
import { SearchModal } from "./SearchModal";
import { RightPanel } from "./RightPanel";

import { useLLM } from "../hooks/useLLM";
import { MessageBubble } from "./MessageBubble";
import { StatusBar } from "./StatusBar";
import { ModelSelector } from "./ModelSelector";
import { MessageTree } from "./MessageTree";
import { ConversationList } from "./ConversationList";
import { SettingsPage } from "./SettingsPage";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { TokenBudgetBanner } from "./TokenBudgetBanner";
import { useAppSettings } from "../hooks/useAppSettings";
import { CodeExecContext } from "../context/CodeExecContext";

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

/** Live elapsed counter — one decimal place. */
function formatLiveElapsedSec(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toFixed(1)}s`;
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

function SuggestionStrip({ suggestions, send }: { suggestions: { content: string }[]; send: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const scrollLeft = () => {
    ref.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  return (
    <div className="mx-auto mb-2 max-w-3xl animate-rise-in">
      <div className="relative flex items-center gap-1.5">
        {scrollable && (
          <button
            type="button"
            onClick={scrollLeft}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/90 text-[11px] text-[#6d6d6d] hover:text-black hover:bg-white transition-colors cursor-pointer shadow-sm ring-1 ring-[#0000001f]"
            title="Scroll left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          ref={ref}
          className="flex flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain py-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => send(s.content)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-[#0000001f] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3d3d3d] hover:border-[#5505af]/50 hover:text-[#5505af] hover:bg-[#f5f3ff] transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Zap className="h-3 w-3 shrink-0 text-[#5505af]/50" />
              {s.content.length > 48 ? s.content.slice(0, 48) + "…" : s.content}
            </button>
          ))}
        </div>
      </div>
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

          <div className="absolute bottom-2.5 left-2 right-2 flex items-center justify-between gap-2 px-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <ModelSelector />
              {showLiveStats && (
                <LiveGenerationMetrics
                  active={showLiveStats}
                  startPerf={generationStartPerf}
                />
              )}
              {showLastStats && lastCompletedMeta && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/80 px-2 py-1 shadow-[0_1px_8px_rgba(5,120,90,0.1)]">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6d6d6d] hover:text-black transition-colors cursor-pointer"
                title="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isReady || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6d6d6d] hover:text-black disabled:opacity-30 transition-colors cursor-pointer"
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
  const { messages, isGenerating, send, status, clearChat, suggestions, canUndo, canRedo, undo, redo, viewMode, setViewMode, sidebarOpen, setSidebarOpen, activePage, setActivePage, stop } = useLLM();
  const { settings, update, reset } = useAppSettings();
  const scrollRef = useRef<HTMLElement>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | number | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { setConversation } = useLLM();

  // Keyboard shortcuts: Ctrl+Z / Cmd+Shift+Z / ? / Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInInput = tag === 'TEXTAREA' || tag === 'INPUT';

      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
        || /Mac/.test(navigator.userAgent);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // ? — toggle shortcuts (only when not in input)
      if (e.key === '?' && !isInInput) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl+K — toggle search (only when not in input)
      if ((mod || e.altKey) && e.key === 'k' && !isInInput) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // Escape — close modals, or stop generation (only when not in input)
      if (e.key === 'Escape') {
        if (shortcutsOpen) {
          e.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (isGenerating && !isInInput) {
          e.preventDefault();
          stop();
          return;
        }
      }

      // Undo/Redo — ignore when user is typing
      if (isInInput) return;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo, shortcutsOpen, isGenerating, stop]);

  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingStartRef = useRef<number | null>(null);
  const thinkingSecondsMapRef = useRef<Map<string | number, number>>(new Map());
  const prevIsGeneratingRef = useRef(false);
  const messagesRef = useRef(messages);
  const thinkingSecondsRef = useRef(thinkingSeconds);
  messagesRef.current = messages;
  thinkingSecondsRef.current = thinkingSeconds;

  const isReady = status.state === "ready";
  const hasMessages = messages.length > 0;

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

  // Settings helpers
  const totalTokensUsed = messages.reduce(
    (sum, m) => sum + (m.responseMeta?.tokenCount ?? 0),
    0,
  );

  const handleResetDefaults = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="flex h-full brand-surface text-black">
      {/* Sidebar */}
      {sidebarOpen && <ConversationList onToggle={() => setSidebarOpen(false)} />}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex-none flex items-center justify-between border-b border-[#0000001f] px-4 py-2 h-14">
          {/* Left: sidebar toggle + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center rounded-md p-1.5 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
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
          </div>

          {/* Right: search + shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center rounded-lg p-1.5 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              title="Search messages (⌘K)"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShortcutsOpen(true)}
              className="flex items-center justify-center rounded-lg p-1.5 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main content area */}
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

                {viewMode === 'tree' ? (
                  <div className="rounded-2xl border border-[#0000001f] bg-white p-2 shadow-sm">
                    <MessageTree
                      messages={messages}
                      onSelect={(id) => {
                        setSelectedTreeId(id);
                        const el = document.querySelector(`[data-msg-id="${id}"]`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      selectedId={selectedTreeId}
                    />
                  </div>
                ) : null}

                <CodeExecContext.Provider value={{
                  enablePythonExec: settings.enablePythonExec ?? false,
                  enableSQLExec: settings.enableSQLExec ?? false,
                }}>
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1 && msg.role === "assistant";
                  return (
                    <div
                      key={msg.id}
                      data-msg-id={msg.id}
                      className={selectedTreeId === msg.id ? 'ring-2 ring-[#5505af]/30 rounded-2xl' : ''}
                    >
                      <MessageBubble
                        msg={msg}
                        index={i}
                        isStreaming={isGenerating && isLast}
                        thinkingSeconds={isLast ? thinkingSeconds : thinkingSecondsMapRef.current.get(msg.id)}
                        isGenerating={isGenerating}
                      />
                    </div>
                  );
                })}
                </CodeExecContext.Provider>
              </div>
            </main>

            {/* Token budget banner */}
            {settings.tokenBudget != null && (
              <div className="px-4 pt-2">
                <TokenBudgetBanner
                  tokensUsed={totalTokensUsed}
                  budget={settings.tokenBudget}
                />
              </div>
            )}

            <footer className="flex-none px-4 py-3 animate-fade-in">
              {/* Suggestion strip above input */}
              {suggestions.length > 0 && !isGenerating && <SuggestionStrip suggestions={suggestions} send={send} />}

              <ChatInput animated />
            </footer>
          </>
        )}
      </div>

      {/* Right panel */}
      <RightPanel
        activePage={activePage}
        viewMode={viewMode}
        canUndo={canUndo}
        canRedo={canRedo}
        isGenerating={isGenerating}
        onSetActivePage={setActivePage}
        onNewChat={clearChat}
        onSearch={() => setSearchOpen(true)}
        onUndo={undo}
        onRedo={redo}
        onToggleTree={() => setViewMode(viewMode === 'linear' ? 'tree' : 'linear')}
        onShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Settings modal */}
      {activePage === 'settings' && (
        <SettingsPage
          settings={settings}
          update={update}
          onResetDefaults={handleResetDefaults}
          onGoToChat={() => setActivePage('chat')}
          totalTokenCount={totalTokensUsed}
        />
      )}

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToConversation={(convId, _msgId) => {
          setConversation(convId);
        }}
      />
    </div>
  );
}
