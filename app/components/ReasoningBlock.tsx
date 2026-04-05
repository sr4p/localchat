import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, ChevronDown } from 'lucide-react';

const MAX_THINKING_LINES = 12;
const LINE_HEIGHT = 19; // 12px * 1.5 ≈ 18px, rounded up
const MAX_HEIGHT = MAX_THINKING_LINES * LINE_HEIGHT;

interface ReasoningBlockProps {
  reasoning: string;
  isThinking: boolean;
  thinkingSeconds: number;
}

export function ReasoningBlock({ reasoning, isThinking, thinkingSeconds }: ReasoningBlockProps) {
  const [open, setOpen] = useState(isThinking);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(isThinking);
  }, [isThinking]);

  // Keep reasoning container scrolled to bottom while thinking
  useEffect(() => {
    if (!isThinking || !containerRef.current) return;

    const tick = () => {
      if (!containerRef.current) return;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    };

    const raf = requestAnimationFrame(tick);
    const raf2 = requestAnimationFrame(() => setTimeout(tick, 50));
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, [reasoning, isThinking]);

  const handleExpand = useCallback(() => {
    setOpen((v: boolean) => !v);
  }, []);

  return (
    <div className="mb-3">
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 text-xs text-[#6d6d6d] hover:text-black transition-colors cursor-pointer"
      >
        <Brain className="h-3.5 w-3.5" />
        {isThinking ? (
          <span className="thinking-shimmer font-medium">Thinking…</span>
        ) : (
          <span>Thought for {thinkingSeconds}s</span>
        )}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div
          ref={containerRef}
          className="mt-2 overflow-y-auto overscroll-contain"
          style={{
            maxHeight: isThinking ? `${MAX_HEIGHT}px` : undefined,
            scrollBehavior: isThinking ? 'auto' : 'smooth',
          }}
        >
          <div className="rounded-lg border border-[#0000001f] bg-[#f5f5f5] px-3 py-2 text-xs text-[#6d6d6d] whitespace-pre-wrap leading-relaxed">
            {reasoning.trim()}
          </div>
        </div>
      )}
    </div>
  );
}
