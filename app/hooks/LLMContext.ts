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
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
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
}

export const LLMContext = createContext<LLMContextValue | null>(null);
