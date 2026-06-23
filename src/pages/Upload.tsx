import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Download, FileX, ImagePlus, Info, LoaderCircle, UploadCloud } from 'lucide-react'
import { downloadReport, predictImage } from '../api/client'
import { HeatmapViewer } from '../components/HeatmapViewer'
import { InterpretationPanel } from '../components/InterpretationPanel'
import { ProbabilityChart } from '../components/ProbabilityChart'
import { ResultCard } from '../components/ResultCard'
import type { HistoryScan, PredictionResult } from '../types'

// ─── Location state types ─────────────────────────────────────────────────────
interface FromHistory {
  historyScan: HistoryScan
}

export function Upload() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // When navigating from History page, re-display a past scan
  useEffect(() => {
    const state = location.state as FromHistory | null
    if (state?.historyScan) {
      const scan = state.historyScan
      // Build a minimal PredictionResult so all components render correctly
      setResult({
        id: String(scan.scan_id),
        date: scan.date,
        predictedClass: scan.predicted_class,
        confidence: scan.confidence * 100,
        probabilities: {
          glioma: 0,
          meningioma: 0,
          notumor: 0,
          pituitary: 0,
        },
        previewUrl: scan.thumbnail.startsWith('/')
          ? `${import.meta.env.VITE_API_URL ?? ''}${scan.thumbnail}`
          : scan.thumbnail,
        heatmapUrl: scan.thumbnail.startsWith('/')
          ? `${import.meta.env.VITE_API_URL ?? ''}${scan.thumbnail}`
          : scan.thumbnail,
        imageName: scan.filename,
      })
      setPreviewUrl('')
    }
  }, [location.state])

  // Revoke blob URL on unmount / change
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = useCallback(
    (selected: File | null) => {
      if (!selected) return

      if (!['image/jpeg', 'image/png'].includes(selected.type)) {
        toast.error('Only JPEG and PNG files are supported')
        return
      }

      const MAX = 15 * 1024 * 1024
      if (selected.size > MAX) {
        toast.error('File must be under 15 MB')
        return
      }

      setFile(selected)
      setResult(null)
      setUploadPct(0)

      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(selected))
    },
    [previewUrl],
  )

  const handlePredict = async () => {
    if (!file) {
      toast.error('Choose a scan before uploading')
      return
    }

    setLoading(true)
    setUploadPct(0)

    try {
      const res = await predictImage(file, setUploadPct)
      // Attach the local blob URL as the preview for the original panel
      res.previewUrl = previewUrl
      setResult(res)
      toast.success('Prediction ready')
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Prediction failed — check the backend is running')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!result?.id) return
    setDownloadingPdf(true)
    try {
      await downloadReport(result.id, `scan_${result.id}_report.pdf`)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  const clearFile = () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setUploadPct(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // What the HeatmapViewer shows: prefer fresh result, fall back to history thumbnail
  const originalUrl = useMemo(() => result?.previewUrl || previewUrl, [result, previewUrl])
  const heatmapUrl = useMemo(() => result?.heatmapUrl || previewUrl, [result, previewUrl])
  const hasImage = Boolean(originalUrl)

  return (
    <div className="space-y-6">
      {/* ── Top section: upload zone + image viewer ── */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Upload zone */}
        <div className="shell-panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Upload scan</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                JPEG or PNG MRI image
              </h2>
            </div>
            <div className="rounded-2xl border border-teal-300/20 bg-teal-400/10 p-3 text-teal-200">
              <UploadCloud className="h-6 w-6" />
            </div>
          </div>

          {/* Drag-drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop zone — click or drag an MRI image here"
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
            className={`mt-6 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-6 text-center transition ${
              dragActive
                ? 'border-teal-300 bg-teal-400/10'
                : 'border-white/15 bg-white/5 hover:border-teal-300/60'
            }`}
          >
            <div className="rounded-full bg-slate-950/70 p-4 text-teal-300">
              <ImagePlus className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">
              Drag and drop an MRI image here
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Accepted formats: JPEG and PNG — max 15 MB — min 50 × 50 px
            </p>
            <button type="button" className="secondary-button mt-6">
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
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="MRI thumbnail"
                      className="h-12 w-12 shrink-0 rounded-xl object-cover border border-white/10"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Selected file</p>
                    <p className="mt-0.5 truncate text-sm text-slate-400">{file.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="secondary-button !px-3 !py-2"
                    onClick={clearFile}
                    aria-label="Remove selected file"
                  >
                    <FileX className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handlePredict}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        {uploadPct < 100 ? `Uploading ${uploadPct}%` : 'Analysing…'}
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        Analyse Scan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload progress bar */}
              {loading && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-[width] duration-300"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image viewer — always shown once we have a URL */}
        <div className="grid gap-6">
          {hasImage ? (
            <HeatmapViewer
              originalUrl={originalUrl}
              heatmapUrl={heatmapUrl}
              label={result?.imageName ?? file?.name ?? 'MRI'}
            />
          ) : (
            <section className="shell-panel flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <Info className="h-10 w-10 text-teal-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">
                Preview and heatmap appear here
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Upload an MRI image to view the original scan side-by-side with the
                Grad-CAM heatmap after prediction.
              </p>
            </section>
          )}
        </div>
      </section>

      {/* ── Results section ── */}
      {result ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <ResultCard result={result} />
            <InterpretationPanel result={result} />
          </div>
          <ProbabilityChart result={result} />
        </section>
      ) : (
        <section className="shell-panel p-6 text-slate-300">
          <h3 className="text-lg font-semibold text-white">Prediction details</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Results, confidence score, probability distribution, and clinical interpretation
            will appear here after the scan is analysed.
          </p>
        </section>
      )}

      {/* ── Action buttons ── */}
      {result && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="primary-button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloadingPdf ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/history')}
          >
            View scan history
          </button>
        </div>
      )}
    </div>
  )
}
