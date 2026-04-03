import type { ModelConfig } from '../types/model'

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'lfm2-1.2b-thinking',
    displayName: 'LFM2.5 1.2B Thinking',
    hfRepo: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
    type: 'local',
    dtype: 'q4',
    maxNewTokens: 65536,
    supportsReasoning: true,
  },
  {
    id: 'smollm2-135m',
    displayName: 'SmolLM2 135M Instruct',
    hfRepo: 'HuggingFaceTB/SmolLM2-135M-Instruct-ONNX',
    type: 'local',
    dtype: 'q4',
    maxNewTokens: 8192,
    supportsReasoning: false,
  },
]

export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id)
}

export const DEFAULT_MODEL_ID = MODEL_REGISTRY[0].id
