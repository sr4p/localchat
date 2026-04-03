export interface ModelConfig {
  id: string
  displayName: string
  hfRepo: string
  dtype: 'q4' | 'q8' | 'fp16'
  type: 'local' | 'api'
  maxNewTokens: number
  supportsReasoning: boolean
}
