import { useEffect, useRef, useState } from 'react'
import type { PredictionClass, PredictionResult } from '../types'

interface ResultCardProps {
  result: PredictionResult
}

// ─── Per-class color palette ──────────────────────────────────────────────────
const palette: Record<
  PredictionClass,
  { badge: string; bar: string; barBg: string; label: string }
> = {
  glioma: {
    badge: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    bar: 'bg-rose-400',
    barBg: 'bg-rose-400/15',
    label: 'Tumor detected',
  },
  meningioma: {
    badge: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
    bar: 'bg-orange-400',
    barBg: 'bg-orange-400/15',
    label: 'Tumor detected',
  },
  pituitary: {
    badge: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
    bar: 'bg-violet-400',
    barBg: 'bg-violet-400/15',
    label: 'Tumor detected',
  },
  notumor: {
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    bar: 'bg-emerald-400',
    barBg: 'bg-emerald-400/15',
    label: 'No tumor detected',
  },
}

/** Animated confidence progress bar */
function ConfidenceBar({
  value,
  barClass,
  bgClass,
}: {
  value: number
  barClass: string
  bgClass: string
}) {
  const [width, setWidth] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    // Small delay so the animation is visible after mount
    const timer = setTimeout(() => {
      raf.current = requestAnimationFrame(() => setWidth(value))
    }, 80)
    return () => {
      clearTimeout(timer)
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [value])

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${bgClass}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

// ─── Display label for class ──────────────────────────────────────────────────
const classDisplay: Record<PredictionClass, string> = {
  glioma: 'Glioma',
  meningioma: 'Meningioma',
  pituitary: 'Pituitary',
  notumor: 'No Tumor',
}

export function ResultCard({ result }: ResultCardProps) {
  const colors = palette[result.predictedClass] ?? palette.glioma

  return (
    <section className="shell-panel p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Prediction result</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {classDisplay[result.predictedClass]}
          </h2>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colors.badge}`}
          >
            {colors.label}
          </span>
        </div>

        {/* Confidence badge */}
        <div
          className={`rounded-2xl border px-4 py-3 text-right ${colors.badge}`}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Confidence</p>
          <p className="mt-1 text-3xl font-bold">{result.confidence.toFixed(1)}%</p>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="mt-5 space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Confidence level</span>
          <span>{result.confidence.toFixed(1)}%</span>
        </div>
        <ConfidenceBar
          value={result.confidence}
          barClass={colors.bar}
          bgClass={colors.barBg}
        />
      </div>

      {/* Meta grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Scan file</p>
          <p className="mt-2 truncate text-sm text-slate-100">{result.imageName}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Timestamp</p>
          <p className="mt-2 text-sm text-slate-100">
            {new Date(result.date).toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  )
}
