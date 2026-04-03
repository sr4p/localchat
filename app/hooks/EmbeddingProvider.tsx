import { useRef, useState, useCallback, type ReactNode } from 'react'
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { EmbeddingContext, type EmbeddingStatus } from './EmbeddingContext'

const EMBEDDING_MODEL_ID = 'onnx-community/Qwen3-Embedding-0.6B-ONNX'

export function EmbeddingProvider({ children }: { children: ReactNode }) {
  const pipelineRef = useRef<Promise<FeatureExtractionPipeline> | null>(null)
  const [status, setStatus] = useState<EmbeddingStatus>({ state: 'idle' })
  const peakRef = useRef(0)

  const loadModel = useCallback(() => {
    if (pipelineRef.current) return

    pipelineRef.current = (async () => {
      peakRef.current = 0
      setStatus({ state: 'loading' })
      try {
        const p = await pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
          dtype: 'q4',
          device: 'webgpu',
          progress_callback: (p: any) => {
            if (p.status !== 'progress') return
            const raw = typeof p.progress === 'number' && Number.isFinite(p.progress) ? p.progress : 0
            const clamped = Math.min(100, Math.max(0, raw))
            peakRef.current = Math.max(peakRef.current, clamped)
            setStatus({ state: 'loading', progress: peakRef.current })
          },
        })
        setStatus({ state: 'ready' })
        return p
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatus({ state: 'error', error: msg })
        pipelineRef.current = null
        throw err
      }
    })()

    return pipelineRef.current
  }, [])

  const generate = useCallback(async (text: string): Promise<number[]> => {
    if (!pipelineRef.current) {
      throw new Error('Embedding model not loaded. Call loadModel() first.')
    }
    const p = await pipelineRef.current
    const output = await p(text, { pooling: 'mean', normalize: true })
    // output is a Tensor, convert to array
    const data = output.tolist()[0]
    return Array.from(data)
  }, [])

  const generateBatch = useCallback(async (texts: string[]): Promise<number[][]> => {
    if (!pipelineRef.current) {
      throw new Error('Embedding model not loaded. Call loadModel() first.')
    }
    const p = await pipelineRef.current
    const output = await p(texts, { pooling: 'mean', normalize: true })
    return output.tolist()
  }, [])

  return (
    <EmbeddingContext.Provider value={{ status, loadModel, generate, generateBatch }}>
      {children}
    </EmbeddingContext.Provider>
  )
}
