import { useState, useRef, useEffect, useCallback } from 'react';
import { Streamdown } from 'streamdown';
import { createMathPlugin } from '@streamdown/math';
import { code } from '@streamdown/code';
import { Pencil, X, Check, RotateCcw, Copy, ClipboardCheck } from 'lucide-react';

import { useLLM } from '../hooks/useLLM';
import { ReasoningBlock } from './ReasoningBlock';
import { ExecutableCodeBlock } from './ExecutableCodeBlock';
import type { ChatMessage } from '../hooks/LLMContext';
import type { PluginConfig } from 'streamdown';

const math = createMathPlugin({ singleDollarTextMath: true });

const EXEC_RENDERERS: PluginConfig['renderers'] = [
  {
    language: ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'sql', 'sqlite', 'html'],
    component: ExecutableCodeBlock,
  },
];

interface MessageBubbleProps {
  msg: ChatMessage;
  index: number;
  isStreaming?: boolean;
  thinkingSeconds?: number;
  isGenerating: boolean;
}

// LaTeX commands to auto-wrap with $…$ when found outside math context.
// `args` is the number of consecutive {…} groups the command consumes.
const MATH_COMMANDS: { prefix: string; args: number }[] = [
  { prefix: '\\boxed{', args: 1 },
  { prefix: '\\text{', args: 1 },
  { prefix: '\\textbf{', args: 1 },
  { prefix: '\\mathbf{', args: 1 },
  { prefix: '\\mathrm{', args: 1 },
  { prefix: '\\frac{', args: 2 },
];

/** Advance past a single `{…}` group (including nested braces). */
function skipBraceGroup(content: string, start: number): number {
  let depth = 1;
  let j = start;
  while (j < content.length && depth > 0) {
    if (content[j] === '{') depth++;
    else if (content[j] === '}') depth--;
    j++;
  }
  return j;
}

function wrapLatexMath(content: string): string {
  let result = '';
  let i = 0;
  // Track math context: null = not in math, "$" = inline, "$$" = display
  let mathContext: null | '$' | '$$' = null;

  while (i < content.length) {
    const cmd = !mathContext
      ? MATH_COMMANDS.find((c) => content.startsWith(c.prefix, i))
      : undefined;

    if (cmd) {
      let j = skipBraceGroup(content, i + cmd.prefix.length);

      for (let a = 1; a < cmd.args; a++) {
        if (content[j] === '{') {
          j = skipBraceGroup(content, j + 1);
        }
      }

      const expr = content.slice(i, j);
      result += '$' + expr + '$';
      i = j;
    } else if (content[i] === '$') {
      // Check for $$ (display math) vs $ (inline math)
      const isDouble = content[i + 1] === '$';
      const token = isDouble ? '$$' : '$';

      if (mathContext === token) {
        mathContext = null; // closing delimiter
      } else if (!mathContext) {
        mathContext = token; // opening delimiter
      }

      result += token;
      i += token.length;
    } else {
      result += content[i];
      i++;
    }
  }

  return result;
}

function prepareForMathDisplay(content: string): string {
  return wrapLatexMath(
    content
      .replace(/(?<!\\)\\\[/g, '$$$$')
      .replace(/\\\]/g, '$$$$')
      .replace(/(?<!\\)\\\(/g, '$$$$')
      .replace(/\\\)/g, '$$$$'),
  );
}

function makePlugins(): PluginConfig {
  return { math, code, renderers: EXEC_RENDERERS };
}

export function MessageBubble({
  msg,
  index,
  isStreaming,
  thinkingSeconds,
  isGenerating,
}: MessageBubbleProps) {
  const { reQuestion, reAnswer } = useLLM();
  const isUser = msg.role === 'user';
  const isThinking = !!isStreaming && !msg.content;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [msg.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleEdit = useCallback(() => {
    setEditValue(msg.content);
    setIsEditing(true);
  }, [msg.content]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(msg.content);
  }, [msg.content]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setIsEditing(false);
    reQuestion(index, trimmed);
  }, [editValue, reQuestion, index]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave],
  );

  if (isEditing) {
    return (
      <div data-msg-id={msg.id} className="flex justify-end">
        <div className="w-full max-w-[80%] flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-[#0000001f] bg-white px-4 py-3 text-sm text-black placeholder-[#6d6d6d] focus:border-[#5505af] focus:outline-none focus:ring-1 focus:ring-[#5505af] resize-none shadow-sm"
            rows={1}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#6d6d6d] hover:text-black border border-[#0000001f] hover:bg-[#f5f5f5] transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editValue.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1f1f1f] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check className="h-3 w-3" />
              Re-question
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-msg-id={msg.id} className={`group flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser && !isGenerating && (
        <button
          onClick={handleEdit}
          className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#6d6d6d] hover:text-black cursor-pointer"
          title="Edit message"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-black text-white rounded-br-md whitespace-pre-wrap'
            : 'bg-white text-black rounded-bl-md border border-[#0000001f] shadow-sm'
        }`}
      >
        {!isUser && msg.reasoning && (
          <ReasoningBlock
            reasoning={msg.reasoning}
            isThinking={isThinking}
            thinkingSeconds={thinkingSeconds ?? 0}
          />
        )}

        {msg.content ? (
          isUser ? (
            msg.content
          ) : (
            <Streamdown plugins={makePlugins()} parseIncompleteMarkdown={false} isAnimating={isStreaming}>
              {prepareForMathDisplay(msg.content)}
            </Streamdown>
          )
        ) : !isUser && !isStreaming ? (
          <p className="italic text-[#6d6d6d]">No response</p>
        ) : null}
      </div>

      {!isUser && !isStreaming && !isGenerating && (
        <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {msg.content && (
            <button
              onClick={handleCopy}
              className="rounded-md p-1 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? (
                <ClipboardCheck className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={() => reAnswer(index)}
            className="rounded-md p-1 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
            title="Re-answer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
