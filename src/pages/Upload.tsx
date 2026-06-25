import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Activity, ArrowRight, BrainCircuit, Download,
  FileX, History, ImagePlus, Info, LoaderCircle, UploadCloud,
} from 'lucide-react'
import { downloadReport, predictImage } from '../api/client'
import { HeatmapViewer }       from '../components/HeatmapViewer'
import { InterpretationPanel } from '../components/InterpretationPanel'
import { ProbabilityChart }    from '../components/ProbabilityChart'
import { ResultCard }          from '../components/ResultCard'
import type { HistoryScan, PredictionResult } from '../types'

interface FromHistory { historyScan: HistoryScan }

/* ── Stats strip shown above the upload zone ───────────────────────────────── */
const STATS = [
  { label: 'Classes',    value: '4',        sub: 'glioma · meningioma · notumor · pituitary' },
  { label: 'Model',      value: 'ResNet50',  sub: 'ImageNet pretrained + fine-tuned'          },
  { label: 'Heatmap',    value: 'Grad-CAM',  sub: 'Visual region attribution'                 },
  { label: 'Report',     value: 'PDF',       sub: 'Auto-generated clinical report'            },
]

export function Upload() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate     = useNavigate()
  const location     = useLocation()

  const [file,           setFile]           = useState<File | null>(null)
  const [previewUrl,     setPreviewUrl]     = useState<string>('')
  const [dragActive,     setDragActive]     = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [uploadPct,      setUploadPct]      = useState(0)
  const [result,         setResult]         = useState<PredictionResult | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  /* Restore a history scan */
  useEffect(() => {
    const state = location.state as FromHistory | null
    if (!state?.historyScan) return
    const scan = state.historyScan
    const thumb = scan.thumbnail.startsWith('/')
      ? `${import.meta.env.VITE_API_URL ?? ''}${scan.thumbnail}`
      : scan.thumbnail
    setResult({
      id: String(scan.scan_id),
      date: scan.date,
      predictedClass: scan.predicted_class,
      confidence: scan.confidence * 100,
      probabilities: { glioma: 0, meningioma: 0, notumor: 0, pituitary: 0 },
      previewUrl: thumb,
      heatmapUrl: thumb,
      imageName: scan.filename,
    })
    setPreviewUrl('')
  }, [location.state])

  useEffect(() => {
    return () => { if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const handleFile = useCallback((selected: File | null) => {
    if (!selected) return
    if (!['image/jpeg', 'image/png'].includes(selected.type)) {
      toast.error('Only JPEG and PNG files are supported')
      return
    }
    if (selected.size > 15 * 1024 * 1024) {
      toast.error('File must be under 15 MB')
      return
    }
    setFile(selected)
    setResult(null)
    setUploadPct(0)
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(selected))
  }, [previewUrl])

  const handlePredict = async () => {
    if (!file) { toast.error('Select a scan first'); return }
    setLoading(true); setUploadPct(0)
    try {
      const res = await predictImage(file, setUploadPct)
      res.previewUrl = previewUrl
      setResult(res)
      toast.success('Analysis complete')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Prediction failed — is the backend running?')
    } finally { setLoading(false) }
  }

  const handleDownloadPdf = async () => {
    if (!result?.id) return
    setDownloadingPdf(true)
    try {
      await downloadReport(result.id, `scan_${result.id}_report.pdf`)
      toast.success('PDF downloaded')
    } catch { toast.error('Report download failed') }
    finally { setDownloadingPdf(false) }
  }

  const clearFile = () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setFile(null); setPreviewUrl(''); setResult(null); setUploadPct(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragActive(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  const originalUrl = useMemo(() => result?.previewUrl || previewUrl, [result, previewUrl])
  const heatmapUrl  = useMemo(() => result?.heatmapUrl  || previewUrl, [result, previewUrl])
  const hasImage    = Boolean(originalUrl)

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(({ label, value, sub }) => (
          <div key={label} className="shell-panel px-4 py-3">
            <p className="section-label">{label}</p>
            <p className="mt-1 text-base font-bold text-white">{value}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main row: upload + viewer ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">

        {/* Upload panel */}
        <div className="shell-panel p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">New scan</p>
              <h2 className="mt-1 text-xl font-bold text-white">Upload MRI Image</h2>
              <p className="mt-1 text-sm text-slate-500">JPEG or PNG · max 15 MB · min 50 × 50 px</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl
                            border border-teal-400/20 bg-teal-400/10 text-teal-300">
              <UploadCloud className="h-5 w-5" />
            </div>
          </div>

          {/* Drop zone */}
          <div
            role="button" tabIndex={0}
            aria-label="Click or drag an MRI image here"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
            className={`mt-5 flex min-h-52 cursor-pointer flex-col items-center justify-center
                        rounded-2xl border-2 border-dashed px-6 text-center transition-all duration-200 ${
                          dragActive
                            ? 'border-teal-400 bg-teal-400/10 scale-[1.01]'
                            : 'border-white/[0.1] bg-white/[0.02] hover:border-teal-400/40 hover:bg-white/[0.04]'
                        }`}
          >
            <div className={`rounded-2xl p-3.5 transition-colors ${
              dragActive ? 'bg-teal-400/20 text-teal-300' : 'bg-white/[0.06] text-slate-400'
            }`}>
              <ImagePlus className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">
              {dragActive ? 'Release to upload' : 'Drag & drop or click to browse'}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">JPEG, PNG accepted</p>
            <button type="button" className="secondary-button mt-4 text-xs">
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Selected file row */}
          {file && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="h-11 w-11 shrink-0 rounded-lg border border-white/[0.1] object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Ready to analyse</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{file.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg
                               border border-white/[0.08] bg-white/[0.05] text-slate-400
                               transition hover:border-rose-400/30 hover:text-rose-400"
                    aria-label="Remove file"
                  >
                    <FileX className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="primary-button text-xs"
                    onClick={handlePredict}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        {uploadPct < 100 ? `${uploadPct}%` : 'Analysing…'}
                      </>
                    ) : (
                      <>
                        <Activity className="h-3.5 w-3.5" />
                        Analyse Scan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {loading && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{uploadPct < 100 ? 'Uploading…' : 'Running AI inference…'}</span>
                    <span>{uploadPct}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300
                                 transition-[width] duration-300"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image viewer */}
        <div>
          {hasImage ? (
            <HeatmapViewer
              originalUrl={originalUrl}
              heatmapUrl={heatmapUrl}
              label={result?.imageName ?? file?.name ?? 'MRI'}
            />
          ) : (
            <div className="shell-panel flex min-h-52 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl
                              border border-teal-400/20 bg-teal-400/10 text-teal-400">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-white">Preview & Heatmap</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Upload an MRI scan to see the original image alongside the
                  Grad-CAM heatmap after prediction.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Original MRI', 'Grad-CAM Overlay', 'Click to Zoom'].map((t) => (
                  <span key={t} className="stat-badge">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {result ? (
        <div className="animate-fade-up grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <ResultCard result={result} />
            <InterpretationPanel result={result} />
          </div>
          <ProbabilityChart result={result} />
        </div>
      ) : (
        <div className="shell-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl
                            border border-white/[0.08] bg-white/[0.05] text-slate-500">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Awaiting scan analysis</p>
              <p className="text-xs text-slate-500">
                Predicted class, confidence score, probability chart and clinical
                interpretation will appear here once a scan is processed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Action bar ───────────────────────────────────────────────── */}
      {result && (
        <div className="animate-fade-up flex flex-wrap gap-3">
          <button
            type="button"
            className="primary-button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {downloadingPdf ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/history')}
          >
            <History className="h-4 w-4" />
            Scan History
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
