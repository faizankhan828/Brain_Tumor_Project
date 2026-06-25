import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Eye, Trash2 } from 'lucide-react'
import type { HistoryScan } from '../types'

interface ScanHistoryTableProps {
  scans:        HistoryScan[]
  page:         number
  pages:        number
  total:        number
  loading:      boolean
  deletingId:   number | null
  onPageChange:     (page: number)     => void
  onViewResult:     (scan: HistoryScan) => void
  onDownloadReport: (scan: HistoryScan) => void
  onDeleteScan:     (scan: HistoryScan) => void
}

const CLASS_BADGE: Record<string, string> = {
  glioma:     'border-rose-400/25     bg-rose-400/10     text-rose-300',
  meningioma: 'border-orange-400/25   bg-orange-400/10   text-orange-300',
  pituitary:  'border-violet-400/25   bg-violet-400/10   text-violet-300',
  notumor:    'border-emerald-400/25  bg-emerald-400/10  text-emerald-300',
}
const CLASS_LABELS: Record<string, string> = {
  glioma: 'Glioma', meningioma: 'Meningioma',
  pituitary: 'Pituitary', notumor: 'No Tumor',
}

function ConfBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-400' : value >= 60 ? 'bg-yellow-400' : 'bg-rose-400'
  const text  = value >= 80 ? 'text-emerald-300' : value >= 60 ? 'text-yellow-300' : 'text-rose-300'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{value.toFixed(1)}%</span>
    </div>
  )
}

function DeleteBtn({ scan, isDeleting, onDelete }: {
  scan: HistoryScan; isDeleting: boolean; onDelete: (s: HistoryScan) => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (isDeleting) return (
    <button disabled className="secondary-button !py-1.5 !px-3 text-xs opacity-50">
      <span className="h-3 w-3 animate-spin rounded-full border border-rose-400 border-t-transparent" />
      Deleting…
    </button>
  )

  if (confirming) return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(false); onDelete(scan) }}
      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40
                 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300
                 transition hover:bg-rose-500/30"
    >
      <Trash2 className="h-3 w-3" />Confirm
    </button>
  )

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); setConfirming(true)
        setTimeout(() => setConfirming(false), 3000)
      }}
      className="secondary-button !py-1.5 !px-3 text-xs hover:border-rose-400/30 hover:text-rose-400"
    >
      <Trash2 className="h-3 w-3" />Delete
    </button>
  )
}

export function ScanHistoryTable({
  scans, page, pages, total, loading, deletingId,
  onPageChange, onViewResult, onDownloadReport, onDeleteScan,
}: ScanHistoryTableProps) {
  return (
    <section className="shell-panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-white">Scan Records</h3>
          <p className="text-xs text-slate-500">{total} total scan{total !== 1 ? 's' : ''}</p>
        </div>
        {pages > 1 && (
          <p className="text-xs text-slate-600">Page {page} of {pages}</p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.06]">
          <thead className="bg-white/[0.03] text-left">
            <tr>
              {['Date & Time', 'Classification', 'Confidence', 'Thumbnail', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-500">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent align-middle" />
                  <span className="ml-3">Loading records…</span>
                </td>
              </tr>
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-500">
                  No scans yet — upload an MRI to generate your first result.
                </td>
              </tr>
            ) : scans.map((scan) => (
              <tr key={scan.scan_id} className="transition-colors hover:bg-white/[0.02]">
                {/* Date */}
                <td className="whitespace-nowrap px-5 py-4">
                  <p className="text-sm text-white">{new Date(scan.date).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500">{new Date(scan.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>

                {/* Class */}
                <td className="whitespace-nowrap px-5 py-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    CLASS_BADGE[scan.predicted_class] ?? CLASS_BADGE.glioma
                  }`}>
                    {CLASS_LABELS[scan.predicted_class] ?? scan.predicted_class}
                  </span>
                </td>

                {/* Confidence */}
                <td className="px-5 py-4">
                  <ConfBar value={scan.confidence * 100} />
                </td>

                {/* Thumbnail */}
                <td className="px-5 py-4">
                  <img
                    src={scan.thumbnail.startsWith('/')
                      ? `${import.meta.env.VITE_API_URL ?? ''}${scan.thumbnail}`
                      : scan.thumbnail}
                    alt={scan.filename}
                    className="h-12 w-16 rounded-lg border border-white/[0.08] object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => onViewResult(scan)}
                      className="secondary-button !py-1.5 !px-3 text-xs"
                    >
                      <Eye className="h-3 w-3" />View
                    </button>
                    <button
                      onClick={() => onDownloadReport(scan)}
                      className="secondary-button !py-1.5 !px-3 text-xs"
                    >
                      <Download className="h-3 w-3" />PDF
                    </button>
                    <DeleteBtn
                      scan={scan}
                      isDeleting={deletingId === scan.scan_id}
                      onDelete={onDeleteScan}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="secondary-button !py-2 !px-3 text-xs disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />Prev
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              let start = Math.max(1, page - 2)
              const end = Math.min(pages, start + 4)
              start = Math.max(1, end - 4)
              const p = start + i
              if (p > pages) return null
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition ${
                    p === page
                      ? 'bg-teal-400 text-slate-950'
                      : 'border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                  }`}
                >{p}</button>
              )
            })}
          </div>

          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="secondary-button !py-2 !px-3 text-xs disabled:opacity-40"
          >
            Next<ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  )
}
