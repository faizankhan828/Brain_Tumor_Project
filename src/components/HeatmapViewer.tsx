import { useEffect, useRef, useState } from 'react'
import { Maximize2, ScanSearch, X } from 'lucide-react'

interface HeatmapViewerProps {
  originalUrl: string
  heatmapUrl:  string
  label:       string
}

export function HeatmapViewer({ originalUrl, heatmapUrl, label }: HeatmapViewerProps) {
  const [mode,   setMode]   = useState<'original' | 'heatmap'>('original')
  const [zoomed, setZoomed] = useState(false)
  const dialogRef           = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    zoomed ? d.showModal() : d.close()
  }, [zoomed])

  const handleBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setZoomed(false)
  }

  const activeUrl = mode === 'original' ? originalUrl : heatmapUrl

  return (
    <>
      <section className="shell-panel p-5">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">Image viewer</p>
            <h3 className="mt-0.5 text-base font-bold text-white">Original vs Grad-CAM heatmap</h3>
          </div>

          {/* Toggle pill */}
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
            {(['original', 'heatmap'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                  mode === m
                    ? m === 'original'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-teal-400 text-slate-900 shadow-sm shadow-teal-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'heatmap' ? 'Grad-CAM' : 'Original'}
              </button>
            ))}
          </div>
        </div>

        {/* Two-panel grid */}
        <div className="grid grid-cols-2 gap-3">
          <Panel
            src={originalUrl}
            alt={`${label} — original`}
            caption="Original MRI"
            active={mode === 'original'}
            onZoom={() => { setMode('original'); setZoomed(true) }}
          />
          <Panel
            src={heatmapUrl}
            alt={`${label} — heatmap`}
            caption="Grad-CAM overlay"
            active={mode === 'heatmap'}
            onZoom={() => { setMode('heatmap'); setZoomed(true) }}
          />
        </div>

        {/* Hint */}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
          <ScanSearch className="h-3 w-3" />
          Click either panel to zoom full-screen
        </p>
      </section>

      {/* Lightbox */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        onClick={handleBackdrop}
        className="fixed inset-0 z-50 m-auto max-h-[92vh] max-w-[92vw] overflow-hidden
                   rounded-2xl border border-white/[0.1] bg-[#060e1a]/98 p-0 shadow-2xl
                   backdrop:bg-black/80 backdrop:backdrop-blur-md"
      >
        <div className="relative">
          <img
            src={activeUrl}
            alt={label}
            className="block max-h-[88vh] max-w-[90vw] object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center
                       rounded-xl border border-white/[0.15] bg-slate-900/90 text-white
                       transition hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060e1a] to-transparent
                          px-4 py-3 text-xs text-slate-400">
            {mode === 'original' ? 'Original scan' : 'Grad-CAM heatmap overlay'} — {label}
          </div>
        </div>
      </dialog>
    </>
  )
}

interface PanelProps {
  src: string; alt: string; caption: string
  active: boolean; onZoom: () => void
}
function Panel({ src, alt, caption, active, onZoom }: PanelProps) {
  return (
    <div
      onClick={onZoom}
      className={`group relative cursor-zoom-in overflow-hidden rounded-xl border transition-all duration-200 ${
        active
          ? 'border-teal-400/35 shadow-[0_0_16px_rgba(20,184,166,0.15)]'
          : 'border-white/[0.07] hover:border-white/[0.15]'
      } bg-slate-950/60`}
    >
      {src ? (
        <img
          src={src} alt={alt}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center text-xs text-slate-600">
          No image
        </div>
      )}

      {/* Zoom icon on hover */}
      <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center
                      rounded-lg border border-white/[0.15] bg-slate-900/80 text-slate-300
                      opacity-0 transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3 w-3" />
      </div>

      {/* Caption bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent px-2.5 py-2">
        <p className="text-[11px] text-slate-400">{caption}</p>
      </div>

      {/* Active indicator dot */}
      {active && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full
                        border border-teal-400/30 bg-teal-400/15 px-2 py-0.5">
          <span className="live-dot" />
          <span className="text-[10px] font-medium text-teal-300">Active</span>
        </div>
      )}
    </div>
  )
}
