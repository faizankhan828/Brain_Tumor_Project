// ─── Tumor classes exactly as returned by the backend ────────────────────────
export type PredictionClass = 'glioma' | 'meningioma' | 'notumor' | 'pituitary'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  created_at: string
  /** UI-only avatar URL derived on the client side */
  avatar?: string
}

export interface AuthResponse {
  /** Backend sends "access_token", we normalise to "token" in the store */
  access_token: string
  token_type: string
  user: AuthUser
}

// ─── Prediction (POST /api/predict) ──────────────────────────────────────────
/**
 * Shape returned by the real FastAPI /api/predict endpoint.
 * `probabilities` is an ordered array: [glioma, meningioma, notumor, pituitary]
 */
export interface PredictResponse {
  /** The predicted class label */
  class: PredictionClass
  scan_id: number
  confidence: number
  probabilities: number[]
  heatmap_base64: string
}

/**
 * Normalised client-side prediction result used across all UI components.
 * Derived from PredictResponse after upload, or from HistoryScan when
 * navigating from the history page.
 */
export interface PredictionResult {
  /** scan_id from backend — used for PDF download */
  id: string
  date: string
  predictedClass: PredictionClass
  /** 0–100 percentage */
  confidence: number
  /** Map of class → probability (0–100) for chart display */
  probabilities: Record<string, number>
  /** URL for the original uploaded MRI (blob: or /static/uploads/…) */
  previewUrl: string
  /** Base64 PNG of the Grad-CAM heatmap (data:image/png;base64,…) */
  heatmapUrl: string
  imageName: string
}

// ─── History (GET /api/history) ───────────────────────────────────────────────
export interface HistoryScan {
  scan_id: number
  filename: string
  predicted_class: PredictionClass
  confidence: number
  date: string
  thumbnail: string
}

export interface HistoryResponse {
  items: HistoryScan[]
  page: number
  size: number
  total: number
  pages: number
}
