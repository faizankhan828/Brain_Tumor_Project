// Simplified mock API - bypasses complex Axios typing issues
import type { PredictionClass, PredictionResult } from '../types'

const HISTORY_KEY = 'btmd_history'

function generateId() {
  return `scan_${Date.now()}`
}

export async function mockLogin(email: string) {
  await new Promise(r => setTimeout(r, 600))
  return {
    token: `mock_${Math.random().toString(36).slice(2)}`,
    user: {
      name: email.split('@')[0],
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`,
      role: 'Radiology Analyst',
    },
  }
}

export async function mockRegister(name: string, email: string) {
  await new Promise(r => setTimeout(r, 600))
  return {
    token: `mock_${Math.random().toString(36).slice(2)}`,
    user: {
      name,
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      role: 'Radiology Analyst',
    },
  }
}

export async function predictImage(file: File): Promise<PredictionResult> {
  return mockPredict(file)
}

export async function mockPredict(file: File): Promise<PredictionResult> {
  await new Promise(r => setTimeout(r, 650))
  
  const classes: PredictionClass[] = ['glioma', 'meningioma', 'pituitary', 'notumor']
  const classIndex = file.name.charCodeAt(0) % 4
  const predictedClass = classes[classIndex]
  
  const baseProbs: Record<string, number> = {
    glioma: 20,
    meningioma: 20,
    pituitary: 20,
    'notumor': 40,
  }
  
  baseProbs[predictedClass] = predictedClass === 'notumor' ? 88 : 82
  
  const result: PredictionResult = {
    id: generateId(),
    date: new Date().toISOString(),
    predictedClass,
    confidence: baseProbs[predictedClass],
    probabilities: baseProbs,
    previewUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%230f172a'/%3E%3Ccircle cx='320' cy='210' r='100' fill='%232dd4bf' opacity='0.3'/%3E%3C/svg%3E`,
    heatmapUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%230f172a'/%3E%3Ccircle cx='320' cy='210' r='100' fill='%232dd4bf' opacity='0.3'/%3E%3C/svg%3E`,
    imageName: file.name,
  }
  
  // Save to history
  const history = [result, ...mockGetHistory()]
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  
  return result
}

export function mockGetHistory(): PredictionResult[] {
  const raw = localStorage.getItem(HISTORY_KEY)
  if (!raw) {
    const seed: PredictionResult[] = [
      {
        id: 'seed_001',
        date: new Date(Date.now() - 86400000).toISOString(),
        predictedClass: 'glioma',
        confidence: 92,
        probabilities: { glioma: 92, meningioma: 5, pituitary: 2, notumor: 1 },
        previewUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%230f172a'/%3E%3Ccircle cx='320' cy='210' r='100' fill='%23ef4444' opacity='0.4'/%3E%3C/svg%3E`,
        heatmapUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%230f172a'/%3E%3Ccircle cx='320' cy='210' r='100' fill='%23ef4444' opacity='0.4'/%3E%3C/svg%3E`,
        imageName: 'case_001.png',
      },
    ]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(seed))
    return seed
  }
  return JSON.parse(raw) as PredictionResult[]
}
