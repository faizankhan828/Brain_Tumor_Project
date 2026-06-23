import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList } from 'lucide-react'
import { downloadReport, fetchHistory } from '../api/client'
import { ScanHistoryTable } from '../components/ScanHistoryTable'
import type { HistoryResponse, HistoryScan } from '../types'

const PAGE_SIZE = 10

export function History() {
  const navigate = useNavigate()
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetchHistory(p, PAGE_SIZE)
      setData(res)
    } catch {
      toast.error('Unable to load scan history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPage(1)
  }, [loadPage])

  const handleViewResult = (scan: HistoryScan) => {
    navigate('/upload', { state: { historyScan: scan } })
  }

  const handleDownloadReport = async (scan: HistoryScan) => {
    if (downloadingId === scan.scan_id) return
    setDownloadingId(scan.scan_id)
    try {
      await downloadReport(scan.scan_id, `scan_${scan.scan_id}_report.pdf`)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to download report — please try again')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section className="shell-panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-teal-300/20 bg-teal-400/10 p-3 text-teal-200">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">History</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Scan timeline</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              View all past predictions, inspect confidence levels, and download official
              PDF reports for any scan.
            </p>
          </div>
        </div>
      </section>

      {/* Table */}
      <ScanHistoryTable
        scans={data?.items ?? []}
        page={data?.page ?? 1}
        pages={data?.pages ?? 0}
        total={data?.total ?? 0}
        loading={loading}
        onPageChange={loadPage}
        onViewResult={handleViewResult}
        onDownloadReport={handleDownloadReport}
      />
    </div>
  )
}
