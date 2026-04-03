import { useState, useEffect } from "react";
import { Brain, ChevronDown } from "lucide-react";

interface ReasoningBlockProps {
  reasoning: string;
  isThinking: boolean;
  thinkingSeconds: number;
}

export function ReasoningBlock({
  reasoning,
  isThinking,
  thinkingSeconds,
}: ReasoningBlockProps) {
  const [open, setOpen] = useState(isThinking);

  useEffect(() => {
    setOpen(isThinking);
  }, [isThinking]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-[#6d6d6d] hover:text-black transition-colors cursor-pointer"
      >
        <Brain className="h-3.5 w-3.5" />
        {isThinking ? (
          <span className="thinking-shimmer font-medium">Thinking…</span>
        ) : (
          <span>Thought for {thinkingSeconds}s</span>
        )}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-[#0000001f] bg-[#f5f5f5] px-3 py-2 text-xs text-[#6d6d6d] whitespace-pre-wrap">
          {reasoning.trim()}
        </div>
      )}
    </div>
  );
}
