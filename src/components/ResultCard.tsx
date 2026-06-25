import { useEffect, useRef, useState } from 'react'
import { Calendar, CheckCircle2, FileImage, XCircle } from 'lucide-react'
import type { PredictionClass, PredictionResult } from '../types'

interface ResultCardProps { result: PredictionResult }

const palette: Record<PredictionClass, {
  border: string; bg: string; badge: string; bar: string;
  glow: string; icon: string; label: string; isTumor: boolean
}> = {
  glioma: {
    border: 'border-rose-500/25', bg: 'bg-rose-500/[0.07]',
    badge: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    bar: 'from-rose-600 to-rose-400', glow: 'rgba(239,68,68,0.3)',
    icon: 'text-rose-400', label: 'Tumor Detected', isTumor: true,
  },
  meningioma: {
    border: 'border-orange-500/25', bg: 'bg-orange-500/[0.07]',
    badge: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
    bar: 'from-orange-600 to-orange-400', glow: 'rgba(249,115,22,0.3)',
    icon: 'text-orange-400', label: 'Tumor Detected', isTumor: true,
  },
  pituitary: {
    border: 'border-violet-500/25', bg: 'bg-violet-500/[0.07]',
    badge: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    bar: 'from-violet-600 to-violet-400', glow: 'rgba(139,92,246,0.3)',
    icon: 'text-violet-400', label: 'Tumor Detected', isTumor: true,
  },
  notumor: {
    border: 'border-emerald-500/25', bg: 'bg-emerald-500/[0.07]',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    bar: 'from-emerald-600 to-emerald-400', glow: 'rgba(16,185,129,0.3)',
    icon: 'text-emerald-400', label: 'No Tumor Detected', isTumor: false,
  },
}

const classDisplay: Record<PredictionClass, string> = {
  glioma: 'Glioma', meningioma: 'Meningioma',
  pituitary: 'Pituitary', notumor: 'No Tumor',
}

function AnimatedBar({ value, gradient }: { value: number; gradient: string }) {
  const [w, setW] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      raf.current = requestAnimationFrame(() => setW(value))
    }, 120)
    return () => { clearTimeout(t); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-[width] duration-700 ease-out`}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

export function ResultCard({ result }: ResultCardProps) {
  const c = palette[result.predictedClass] ?? palette.notumor
  const StatusIcon = c.isTumor ? XCircle : CheckCircle2

  return (
    <section className={`shell-panel overflow-hidden border ${c.border}`}>
      {/* Top colour strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${c.bar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${c.border} ${c.bg}`}>
              <StatusIcon className={`h-5 w-5 ${c.icon}`} />
            </div>
            <div>
              <p className="section-label">Prediction result</p>
              <h2 className="text-xl font-bold text-white">{classDisplay[result.predictedClass]}</h2>
            </div>
          </div>

          {/* Confidence badge */}
          <div className={`rounded-xl border px-4 py-2 text-right ${c.badge}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Confidence</p>
            <p className="text-3xl font-black tabular-nums">{result.confidence.toFixed(1)}%</p>
          </div>
        </div>

        {/* Status label */}
        <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.badge}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {c.label}
        </span>

        {/* Confidence bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Confidence level</span>
            <span className="tabular-nums">{result.confidence.toFixed(1)}%</span>
          </div>
          <AnimatedBar value={result.confidence} gradient={c.bar} />
        </div>

        {/* Meta */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              <FileImage className="h-3 w-3" /> Scan file
            </div>
            <p className="mt-1.5 truncate text-sm font-medium text-white">{result.imageName}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              <Calendar className="h-3 w-3" /> Timestamp
            </div>
            <p className="mt-1.5 text-sm font-medium text-white">
              {new Date(result.date).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
