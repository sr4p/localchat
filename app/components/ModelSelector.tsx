import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Cpu, Trash2, Loader2, ArrowDownToLine } from 'lucide-react'
import { useLLM } from '../hooks/useLLM'
import { getModelById } from '../utils/model-registry'

export function ModelSelector() {
  const { activeModelId, setActiveModelId, models, isGenerating, modelStatuses, loadModel, clearModel } = useLLM()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const current = models.find((m) => m.id === activeModelId) ?? models[0]

  const handleSelect = useCallback(
    (modelId: string) => {
      const model = getModelById(modelId)
      if (!model) return
      setActiveModelId(modelId)
      setOpen(false)
      const mStatus = modelStatuses?.[modelId]
      if (mStatus === 'idle') {
        loadModel(modelId)
      }
    },
    [setActiveModelId, modelStatuses, loadModel],
  )

  const handleDownload = useCallback(
    (modelId: string) => {
      loadModel(modelId)
    },
    [loadModel],
  )

  const handleDeleteCache = useCallback(
    (modelId: string) => {
      if (modelId === activeModelId) return
      clearModel(modelId)
    },
    [activeModelId, clearModel],
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !isGenerating && setOpen((v) => !v)}
        disabled={isGenerating}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
          isGenerating
            ? 'bg-[#5505af]/5 text-[#5505af]/40 cursor-not-allowed'
            : 'bg-[#5505af]/10 text-[#5505af] hover:bg-[#5505af]/15 cursor-pointer'
        }`}
        title={isGenerating ? 'Cannot change model while generating' : 'Change model'}
      >
        <Cpu className="h-3 w-3" />
        {current?.displayName ?? 'Model'}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-[#0000001f] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-rise-in">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6d6d6d]">Select model</p>
          </div>
          {models.map((model, idx) => {
            const isActive = model.id === activeModelId
            const mStatus = modelStatuses?.[model.id]
            const progress = typeof mStatus === 'number' ? mStatus : null
            const isDl = progress !== null && progress > 0 && mStatus !== 'ready'
            const isReady = mStatus === 'ready'
            const showDownload = !isActive && !isDl && !isReady
            const showDelete = !isActive && isReady

            return (
              <div key={model.id} className="group">
                {/* Row: info + actions */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isDl && handleSelect(model.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelect(model.id)
                    }
                  }}
                  className={`relative flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-[#5505af]/5' : 'hover:bg-[#f5f5f5] cursor-pointer'
                  } ${isDl ? 'cursor-wait' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${isActive ? 'text-[#5505af]' : 'text-black'}`}
                      >
                        {model.displayName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="rounded-full bg-[#5505af]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#5505af]">
                            Active
                          </span>
                        )}
                        {isDl && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5505af]">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {Math.round(progress!)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] ${isActive ? 'text-[#5505af]/60' : 'text-[#6d6d6d]'}`}
                    >
                      On-device (WebGPU) · ~{model.estimatedSizeMB} MB
                    </span>
                    {isDl && progress != null && (
                      <div className="mt-1.5 h-1 w-full rounded-full bg-[#0000001a] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#5505AF_0%,#CD82F0_60%,#FF5F1E_100%)] transition-[width] duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Action buttons on right side, aligned with text */}
                  {showDownload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(model.id)
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#5505af] hover:bg-[#5505af]/10 transition-colors"
                      title={`Download ${model.displayName}`}
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      Download
                    </button>
                  )}
                  {showDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCache(model.id)
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#6d6d6d] hover:text-red-500 hover:bg-red-50 transition-colors"
                      title={`Delete ${model.displayName} from cache`}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>

                {/* Divider between cards */}
                {idx < models.length - 1 && (
                  <div className="mx-3 border-b border-[#0000000f]" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
