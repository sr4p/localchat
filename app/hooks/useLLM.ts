import { useContext } from "react";
import { LLMContext, type LLMContextValue } from "./LLMContext";

export function useLLM(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) throw new Error("useLLM must be used within <LLMProvider>");
  return ctx;
}
