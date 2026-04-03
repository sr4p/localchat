import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Cpu } from 'lucide-react'
import { useLLM } from '../hooks/useLLM'

export function ModelSelector() {
  const { activeModelId, setActiveModelId, models, isGenerating } = useLLM()
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
    (id: string) => {
      setActiveModelId(id)
      setOpen(false)
    },
    [setActiveModelId],
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
        <div className="absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-xl border border-[#0000001f] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-rise-in">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6d6d6d]">Select model</p>
          </div>
          <div className="pb-2">
            {models.map((model) => {
              const isActive = model.id === activeModelId
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelect(model.id)}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-[#5505af]/5'
                      : 'hover:bg-[#f5f5f5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isActive ? 'text-[#5505af]' : 'text-black'}`}>
                      {model.displayName}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-[#5505af]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#5505af]">
                        Active
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] ${isActive ? 'text-[#5505af]/60' : 'text-[#6d6d6d]'}`}>
                    {model.type === 'local' ? 'On-device (WebGPU)' : 'Cloud API'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
