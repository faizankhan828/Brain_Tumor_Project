import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import type {
  AuthResponse,
  HistoryResponse,
  PredictResponse,
  PredictionClass,
  PredictionResult,
} from '../types'

// ─── Axios instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 60_000, // prediction + Grad-CAM can take several seconds
})

// Attach JWT on every request if we have one
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Backend class names → internal type ─────────────────────────────────────
const BACKEND_CLASSES: PredictionClass[] = ['glioma', 'meningioma', 'notumor', 'pituitary']

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password })
  return data
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', { name, email, password })
  return data
}

// ─── Predict ──────────────────────────────────────────────────────────────────
/**
 * Upload an MRI file, run inference + Grad-CAM, return a normalised
 * PredictionResult that the UI components can consume directly.
 */
export async function predictImage(
  file: File,
  onUploadProgress?: (pct: number) => void,
): Promise<PredictionResult> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post<PredictResponse>('/api/predict', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onUploadProgress && evt.total) {
        onUploadProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    },
  })

  // Convert ordered probability array → labelled record (0–100 scale)
  const probabilities: Record<string, number> = {}
  BACKEND_CLASSES.forEach((cls, i) => {
    probabilities[cls] = parseFloat(((data.probabilities[i] ?? 0) * 100).toFixed(1))
  })

  return {
    id: String(data.scan_id),
    date: new Date().toISOString(),
    predictedClass: data.class,
    confidence: parseFloat((data.confidence * 100).toFixed(1)),
    probabilities,
    previewUrl: '',   // caller provides a local blob URL
    heatmapUrl: `data:image/png;base64,${data.heatmap_base64}`,
    imageName: file.name,
  }
}

// ─── History ──────────────────────────────────────────────────────────────────
export async function fetchHistory(page = 1, size = 10): Promise<HistoryResponse> {
  const { data } = await api.get<HistoryResponse>('/api/history', { params: { page, size } })
  return data
}

// ─── PDF Report ───────────────────────────────────────────────────────────────
/**
 * Fetch the PDF report for a scan and trigger a browser file download.
 */
export async function downloadReport(scanId: number | string, filename: string): Promise<void> {
  const response = await api.get(`/api/report/${scanId}`, {
    responseType: 'blob',
  })

  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
