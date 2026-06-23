import { useEffect, useRef, useState } from 'react'
import { Maximize2, X } from 'lucide-react'

interface HeatmapViewerProps {
  /** Blob URL or data URL of the original MRI image */
  originalUrl: string
  /** data:image/png;base64,… string returned by the backend Grad-CAM */
  heatmapUrl: string
  label: string
}

export function HeatmapViewer({ originalUrl, heatmapUrl, label }: HeatmapViewerProps) {
  const [mode, setMode] = useState<'original' | 'heatmap'>('original')
  const [zoomed, setZoomed] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open / close the zoom lightbox
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (zoomed) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [zoomed])

  // Close on backdrop click
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setZoomed(false)
  }

  const activeUrl = mode === 'original' ? originalUrl : heatmapUrl

  return (
    <>
      <section className="shell-panel p-5">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Image viewer</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Original vs Grad-CAM heatmap</h3>
          </div>

          {/* Toggle */}
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode('original')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'original' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => setMode('heatmap')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'heatmap'
                  ? 'bg-teal-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Heatmap
            </button>
          </div>
        </div>

        {/* Two-panel side-by-side layout */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Original panel */}
          <PanelCard
            src={originalUrl}
            alt={`${label} — original`}
            caption="Original MRI"
            active={mode === 'original'}
            onZoom={() => {
              setMode('original')
              setZoomed(true)
            }}
          />
          {/* Heatmap panel */}
          <PanelCard
            src={heatmapUrl}
            alt={`${label} — Grad-CAM heatmap`}
            caption="Grad-CAM heatmap overlay"
            active={mode === 'heatmap'}
            onZoom={() => {
              setMode('heatmap')
              setZoomed(true)
            }}
          />
        </div>
      </section>

      {/* Zoom lightbox */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        className="fixed inset-0 z-50 m-auto max-h-[90vh] max-w-[90vw] overflow-hidden rounded-3xl border border-white/15 bg-slate-950/95 p-0 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <img
            src={activeUrl}
            alt={label}
            className="block max-h-[85vh] max-w-[88vw] object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-white transition hover:bg-slate-700"
            aria-label="Close zoom"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent px-4 py-3 text-sm text-slate-300">
            {mode === 'original' ? 'Original scan' : 'Grad-CAM heatmap overlay'} — {label}
          </div>
        </div>
      </dialog>
    </>
  )
}

// ─── Inner panel card ─────────────────────────────────────────────────────────
interface PanelCardProps {
  src: string
  alt: string
  caption: string
  active: boolean
  onZoom: () => void
}

function PanelCard({ src, alt, caption, active, onZoom }: PanelCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition ${
        active ? 'border-teal-400/40' : 'border-white/10'
      } bg-slate-950/70`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="aspect-square w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onClick={onZoom}
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center text-xs text-slate-500">
          No image
        </div>
      )}

      {/* Zoom button */}
      <button
        type="button"
        onClick={onZoom}
        aria-label={`Zoom ${caption}`}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-900/70 text-slate-300 opacity-0 transition hover:bg-slate-700 group-hover:opacity-100"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Caption bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent px-3 py-2.5 text-xs text-slate-300">
        {caption}
      </div>
    </div>
  )
}
