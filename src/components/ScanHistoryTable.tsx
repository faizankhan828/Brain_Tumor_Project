import { ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react'
import type { HistoryScan } from '../types'

interface ScanHistoryTableProps {
  scans: HistoryScan[]
  page: number
  pages: number
  total: number
  loading: boolean
  onPageChange: (page: number) => void
  onViewResult: (scan: HistoryScan) => void
  onDownloadReport: (scan: HistoryScan) => void
}

const CLASS_BADGE: Record<string, string> = {
  glioma: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  meningioma: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
  pituitary: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  notumor: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
}

const CLASS_LABELS: Record<string, string> = {
  glioma: 'Glioma',
  meningioma: 'Meningioma',
  pituitary: 'Pituitary',
  notumor: 'No Tumor',
}

function ConfidencePill({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'text-emerald-300'
      : value >= 60
        ? 'text-yellow-300'
        : 'text-rose-300'
  return <span className={`font-semibold ${color}`}>{value.toFixed(1)}%</span>
}

export function ScanHistoryTable({
  scans,
  page,
  pages,
  total,
  loading,
  onPageChange,
  onViewResult,
  onDownloadReport,
}: ScanHistoryTableProps) {
  return (
    <section className="shell-panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent scans</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {total} scan{total !== 1 ? 's' : ''} on record
          </p>
        </div>
        {pages > 1 && (
          <p className="text-xs text-slate-500">
            Page {page} of {pages}
          </p>
        )}
      </div>

      {/* Table (horizontally scrollable on mobile) */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.28em] text-slate-400">
            <tr>
              <th className="px-5 py-4 font-medium">Date</th>
              <th className="px-5 py-4 font-medium">Class</th>
              <th className="px-5 py-4 font-medium">Confidence</th>
              <th className="px-5 py-4 font-medium">Thumbnail</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                  <span className="ml-3">Loading history…</span>
                </td>
              </tr>
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  No scans yet. Upload an MRI image to generate your first result.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr
                  key={scan.scan_id}
                  className="align-middle text-sm text-slate-200 transition hover:bg-white/[0.03]"
                >
                  {/* Date */}
                  <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                    <p>{new Date(scan.date).toLocaleDateString()}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(scan.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </td>

                  {/* Class badge */}
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        CLASS_BADGE[scan.predicted_class] ?? CLASS_BADGE.glioma
                      }`}
                    >
                      {CLASS_LABELS[scan.predicted_class] ?? scan.predicted_class}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="whitespace-nowrap px-5 py-4">
                    <ConfidencePill value={scan.confidence * 100} />
                  </td>

                  {/* Thumbnail — loaded from /static/heatmaps/… */}
                  <td className="px-5 py-4">
                    <img
                      src={
                        scan.thumbnail.startsWith('/')
                          ? `${import.meta.env.VITE_API_URL ?? ''}${scan.thumbnail}`
                          : scan.thumbnail
                      }
                      alt={scan.filename}
                      className="h-14 w-20 rounded-xl object-cover border border-white/10"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onViewResult(scan)}
                        className="secondary-button !px-3 !py-2 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadReport(scan)}
                        className="secondary-button !px-3 !py-2 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="secondary-button !px-3 !py-2 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {/* Page numbers — show at most 5 */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              // Centre window around current page
              let start = Math.max(1, page - 2)
              const end = Math.min(pages, start + 4)
              start = Math.max(1, end - 4)
              const p = start + i
              if (p > pages) return null
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-9 w-9 rounded-xl text-sm font-medium transition ${
                    p === page
                      ? 'bg-teal-400 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="secondary-button !px-3 !py-2 disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
