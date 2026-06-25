import { AlertTriangle, BookOpen, Info } from 'lucide-react'
import type { PredictionClass, PredictionResult } from '../types'

interface InterpretationPanelProps { result: PredictionResult }

const info: Record<PredictionClass, {
  title: string; grade: string; gradeColor: string
  description: string; facts: string[]
}> = {
  glioma: {
    title: 'Glioma',
    grade: 'High-priority review', gradeColor: 'text-rose-400 bg-rose-400/10 border-rose-400/25',
    description:
      'Gliomas arise from glial cells — the supportive tissue of the brain and spinal cord. They represent the most common type of malignant primary brain tumor.',
    facts: [
      'Can be fast-growing and aggressive (Grade III–IV)',
      'Presents with headaches, seizures, or cognitive changes',
      'Treatment involves surgery, radiation, and chemotherapy',
      'Graded I–IV; higher grades require urgent intervention',
    ],
  },
  meningioma: {
    title: 'Meningioma',
    grade: 'Typically benign', gradeColor: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
    description:
      'Meningiomas originate from the meninges — the protective membranes surrounding the brain. They are the most common primary brain tumor overall.',
    facts: [
      'Usually slow-growing and benign (Grade I)',
      'More common in women and adults over 50',
      'Many cases monitored without immediate surgery',
      'Surgery is curative in most surgically accessible cases',
    ],
  },
  pituitary: {
    title: 'Pituitary Adenoma',
    grade: 'Usually benign', gradeColor: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
    description:
      'Pituitary tumors develop in the pituitary gland at the base of the brain. Most are benign adenomas that may cause hormonal disruption.',
    facts: [
      'Typically benign and slow-growing',
      'May secrete excess hormones (functional adenomas)',
      'Can press on the optic chiasm, causing vision loss',
      'Treated with medication, surgery, or radiation',
    ],
  },
  notumor: {
    title: 'No Tumor Detected',
    grade: 'Normal pattern', gradeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    description:
      'The model did not identify imaging features consistent with glioma, meningioma, or pituitary adenoma in this scan.',
    facts: [
      'Normal brain tissue patterns observed',
      'No suspicious mass or displacement detected',
      'Routine clinical follow-up may still be warranted',
      'Correlate AI findings with patient history and symptoms',
    ],
  },
}

export function InterpretationPanel({ result }: InterpretationPanelProps) {
  const data = info[result.predictedClass] ?? info.notumor

  return (
    <section className="shell-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl
                        border border-white/[0.08] bg-white/[0.05] text-teal-400">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <p className="section-label">Clinical interpretation</p>
          <h3 className="mt-0.5 text-base font-bold text-white">What the result means</h3>
        </div>
      </div>

      {/* Grade badge */}
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${data.gradeColor}`}>
        <Info className="h-3 w-3" />
        {data.grade}
      </div>

      {/* Description */}
      <p className="text-sm leading-7 text-slate-400">{data.description}</p>

      {/* Fact bullets */}
      <ul className="space-y-2">
        {data.facts.map((fact) => (
          <li key={fact} className="flex items-start gap-2.5 text-sm text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
            {fact}
          </li>
        ))}
      </ul>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Medical Disclaimer
            </p>
            <p className="mt-1.5 text-xs leading-6 text-amber-200/80">
              This AI-assisted result is for <strong>informational support only</strong> and does not
              replace assessment by a qualified clinician. Always consult a radiologist or
              oncologist before making any clinical decisions.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
