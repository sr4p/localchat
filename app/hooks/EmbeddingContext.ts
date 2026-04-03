import { createContext } from 'react'

export type EmbeddingStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress?: number }
  | { state: 'ready' }
  | { state: 'error'; error: string }

export interface EmbeddingContextValue {
  status: EmbeddingStatus
  loadModel: () => void
  generate: (text: string) => Promise<number[]>
  generateBatch: (texts: string[]) => Promise<number[][]>
}

export const EmbeddingContext = createContext<EmbeddingContextValue | null>(null)
