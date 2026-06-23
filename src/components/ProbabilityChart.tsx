import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PredictionResult } from '../types'

interface ProbabilityChartProps {
  result: PredictionResult
}

// Class-specific colours matching ResultCard palette
const CLASS_COLORS: Record<string, string> = {
  glioma: '#f87171',      // rose-400
  meningioma: '#fb923c',  // orange-400
  notumor: '#34d399',     // emerald-400
  pituitary: '#a78bfa',   // violet-400
}

// Human-readable labels
const CLASS_LABELS: Record<string, string> = {
  glioma: 'Glioma',
  meningioma: 'Meningioma',
  notumor: 'No Tumor',
  pituitary: 'Pituitary',
}

interface TooltipPayloadEntry {
  value: number
  name: string
  payload: { name: string; probability: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null
  const { name, probability } = payload[0].payload
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold capitalize text-white">{CLASS_LABELS[name] ?? name}</p>
      <p className="mt-1 text-slate-300">{probability.toFixed(1)}%</p>
    </div>
  )
}

export function ProbabilityChart({ result }: ProbabilityChartProps) {
  const chartData = Object.entries(result.probabilities).map(([name, value]) => ({
    name,
    label: CLASS_LABELS[name] ?? name,
    probability: value,
    fill: CLASS_COLORS[name] ?? '#2dd4bf',
  }))

  return (
    <section className="shell-panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Class probabilities</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Model distribution</h3>
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-teal-300">All 4 classes</p>
      </div>

      {/* Horizontal bar chart — wider label column on narrow screens */}
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 0, left: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="4 8"
              stroke="rgba(255,255,255,0.07)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={88}
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="probability" radius={[0, 8, 8, 0]} maxBarSize={28}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="probability"
                position="right"
                formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(1)}%` : `${v}%`}
                style={{ fill: '#94a3b8', fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: entry.fill }}
            />
            {entry.label}
          </div>
        ))}
      </div>
    </section>
  )
}
