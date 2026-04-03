import { useContext } from 'react'
import { EmbeddingContext, type EmbeddingContextValue } from './EmbeddingContext'

export function useEmbedding(): EmbeddingContextValue {
  const ctx = useContext(EmbeddingContext)
  if (!ctx) throw new Error('useEmbedding must be used within <EmbeddingProvider>')
  return ctx
}
