import type { ModelConfig } from '../types/model';

export interface ModelConfigWithSize extends ModelConfig {
  /** Approximate download size in MB (for UX estimation). */
  estimatedSizeMB: number;
}

export const MODEL_REGISTRY: ModelConfigWithSize[] = [
  {
    id: 'lfm2-1.2b-thinking',
    displayName: 'LFM2.5 1.2B Thinking',
    hfRepo: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
    type: 'local',
    dtype: 'q4',
    maxNewTokens: 65536,
    supportsReasoning: true,
    estimatedSizeMB: 750,
  },
  {
    id: 'Gemma-4-E2B-it',
    displayName: 'Gemma 4 E2B IT',
    hfRepo: 'onnx-community/gemma-4-E2B-it-ONNX',
    type: 'local',
    dtype: 'q4',
    maxNewTokens: 8192,
    supportsReasoning: true,
    estimatedSizeMB: 7200,
  },
  {
    id: 'Gemma-4-E4B-it',
    displayName: 'Gemma 4 E4B IT',
    hfRepo: 'onnx-community/gemma-4-E4B-it-ONNX',
    type: 'local',
    dtype: 'q4',
    maxNewTokens: 8192,
    supportsReasoning: true,
    estimatedSizeMB: 9600,
  },
];

export function getModelById(id: string): ModelConfigWithSize | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export const DEFAULT_MODEL_ID = MODEL_REGISTRY[0].id;
