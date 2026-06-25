import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PredictionResult } from '../types'

interface ProbabilityChartProps { result: PredictionResult }

const CLASS_COLORS: Record<string, string> = {
  glioma:     '#f87171',
  meningioma: '#fb923c',
  notumor:    '#34d399',
  pituitary:  '#a78bfa',
}
const CLASS_LABELS: Record<string, string> = {
  glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary',
}

interface TooltipEntry {
  payload: { name: string; probability: number; fill: string }
}
function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null
  const { name, probability, fill } = payload[0].payload
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#0a1628]/95 px-4 py-3 shadow-2xl text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: fill }} />
        <span className="font-semibold text-white">{CLASS_LABELS[name] ?? name}</span>
      </div>
      <p className="text-slate-400 tabular-nums">{probability.toFixed(1)}% probability</p>
    </div>
  )
}

export function ProbabilityChart({ result }: ProbabilityChartProps) {
  const chartData = Object.entries(result.probabilities).map(([name, value]) => ({
    name,
    label:       CLASS_LABELS[name] ?? name,
    probability: value,
    fill:        CLASS_COLORS[name] ?? '#2dd4bf',
  }))

  const maxVal = Math.max(...chartData.map((d) => d.probability))

  return (
    <section className="shell-panel p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="section-label">Probability distribution</p>
          <h3 className="mt-1 text-lg font-bold text-white">All 4 Classes</h3>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-1.5">
          <p className="text-xs font-medium text-slate-400">
            Peak <span className="text-white font-semibold">{maxVal.toFixed(1)}%</span>
          </p>
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 52, bottom: 4, left: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis
              type="number" domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category" dataKey="label" width={86}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="probability" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} fillOpacity={0.9} />
              ))}
              <LabelList
                dataKey="probability"
                position="right"
                formatter={(v: number) => `${v.toFixed(1)}%`}
                style={{ fill: '#64748b', fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend dots */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-white/[0.06] pt-4">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.fill }} />
            {entry.label}
          </div>
        ))}
      </div>
    </section>
  )
}
