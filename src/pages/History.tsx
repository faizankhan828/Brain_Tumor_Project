import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Activity, ClipboardList, FileText, TrendingUp } from 'lucide-react'
import { deleteScan, downloadReport, fetchHistory } from '../api/client'
import { ScanHistoryTable } from '../components/ScanHistoryTable'
import type { HistoryResponse, HistoryScan } from '../types'

const PAGE_SIZE = 10

export function History() {
  const navigate = useNavigate()
  const [data,          setData]          = useState<HistoryResponse | null>(null)
  const [page,          setPage]          = useState(1)
  const [loading,       setLoading]       = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [deletingId,    setDeletingId]    = useState<number | null>(null)

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetchHistory(p, PAGE_SIZE)
      setData(res); setPage(p)
    } catch { toast.error('Unable to load scan history') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadPage(1) }, [loadPage])

  const handleViewResult    = (scan: HistoryScan) =>
    navigate('/upload', { state: { historyScan: scan } })

  const handleDownloadReport = async (scan: HistoryScan) => {
    if (downloadingId === scan.scan_id) return
    setDownloadingId(scan.scan_id)
    try {
      await downloadReport(scan.scan_id, `scan_${scan.scan_id}_report.pdf`)
      toast.success('PDF downloaded')
    } catch { toast.error('Report download failed') }
    finally { setDownloadingId(null) }
  }

  const handleDeleteScan = async (scan: HistoryScan) => {
    if (deletingId !== null) return
    setDeletingId(scan.scan_id)
    try {
      await deleteScan(scan.scan_id)
      toast.success('Scan deleted')
      const remaining   = (data?.items ?? []).length - 1
      const goTo        = remaining === 0 && page > 1 ? page - 1 : page
      await loadPage(goTo)
    } catch { toast.error('Failed to delete scan') }
    finally { setDeletingId(null) }
  }

  const total  = data?.total ?? 0
  const pages  = data?.pages ?? 0

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="shell-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl
                            border border-teal-400/20 bg-teal-400/10 text-teal-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">Patient Record</p>
              <h2 className="text-xl font-bold text-white">Scan Timeline</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Review all past AI predictions, inspect confidence levels, download
                PDF reports, or remove scans you no longer need.
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {!loading && total > 0 && (
            <div className="flex gap-3">
              <div className="shell-panel px-4 py-2.5 text-center">
                <p className="text-xl font-bold text-white">{total}</p>
                <p className="section-label mt-0.5">Total Scans</p>
              </div>
              <div className="shell-panel px-4 py-2.5 text-center">
                <p className="text-xl font-bold text-white">{pages}</p>
                <p className="section-label mt-0.5">Pages</p>
              </div>
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: Activity,    text: 'AI Predictions' },
            { icon: TrendingUp,  text: 'Confidence Scores' },
            { icon: FileText,    text: 'PDF Reports' },
            { icon: ClipboardList, text: 'Full Timeline' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="stat-badge">
              <Icon className="h-3 w-3 text-teal-400" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <ScanHistoryTable
        scans={data?.items ?? []}
        page={data?.page ?? 1}
        pages={pages}
        total={total}
        loading={loading}
        deletingId={deletingId}
        onPageChange={loadPage}
        onViewResult={handleViewResult}
        onDownloadReport={handleDownloadReport}
        onDeleteScan={handleDeleteScan}
      />
    </div>
  )
}
