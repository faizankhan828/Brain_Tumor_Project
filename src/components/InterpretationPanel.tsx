import type { PredictionClass, PredictionResult } from '../types'

interface InterpretationPanelProps {
  result: PredictionResult
}

// ─── Per-class clinical descriptions ─────────────────────────────────────────
const interpretations: Record<
  PredictionClass,
  { title: string; description: string; characteristics: string[]; badge: string }
> = {
  glioma: {
    title: 'Glioma',
    badge: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    description:
      'Gliomas are primary brain tumors that arise from glial cells — the supportive tissue of the brain. They are the most common type of malignant brain tumor.',
    characteristics: [
      'Fast-growing and potentially aggressive',
      'Can affect any part of the brain or spinal cord',
      'Graded I–IV; high-grade (III–IV) require urgent treatment',
      'Symptoms: headaches, seizures, cognitive changes',
    ],
  },
  meningioma: {
    title: 'Meningioma',
    badge: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
    description:
      'Meningiomas arise from the meninges — the membranes surrounding the brain and spinal cord. They are the most common primary brain tumor overall.',
    characteristics: [
      'Typically slow-growing and often benign (grade I)',
      'More common in women and older adults',
      'Many are found incidentally and monitored without immediate treatment',
      'Surgery is curative in most accessible cases',
    ],
  },
  pituitary: {
    title: 'Pituitary Adenoma',
    badge: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
    description:
      'Pituitary tumors develop in the pituitary gland at the base of the brain. Most are benign adenomas that may cause hormonal imbalances.',
    characteristics: [
      'Usually benign and slow-growing',
      'May secrete excess hormones (functional adenomas)',
      'Can cause vision problems by pressing on the optic chiasm',
      'Treated with medication, surgery, or radiation depending on type',
    ],
  },
  notumor: {
    title: 'No Tumor Detected',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    description:
      'The model did not identify imaging features consistent with glioma, meningioma, or pituitary adenoma in this scan.',
    characteristics: [
      'Normal brain tissue patterns observed',
      'No suspicious mass, enhancement, or displacement detected',
      'Routine follow-up may still be warranted per clinical judgment',
      'AI findings should always be correlated with clinical symptoms',
    ],
  },
}

export function InterpretationPanel({ result }: InterpretationPanelProps) {
  const info = interpretations[result.predictedClass] ?? interpretations.notumor

  return (
    <section className="shell-panel p-5">
      <p className="text-sm text-slate-400">Interpretation</p>
      <h3 className="mt-1 text-lg font-semibold text-white">What the output means</h3>

      {/* Class badge */}
      <span
        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${info.badge}`}
      >
        {info.title}
      </span>

      {/* Description */}
      <p className="mt-4 text-sm leading-7 text-slate-300">{info.description}</p>

      {/* Characteristics */}
      <ul className="mt-4 space-y-2">
        {info.characteristics.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
            {item}
          </li>
        ))}
      </ul>

      {/* Medical disclaimer — always visible */}
      <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
        <p className="font-semibold uppercase tracking-[0.25em] text-amber-300">
          Medical disclaimer
        </p>
        <p className="mt-2 leading-6">
          This AI-assisted result is for informational support only and does{' '}
          <strong>not</strong> replace a diagnosis by a qualified clinician. Always consult
          a radiologist or oncologist before making any clinical decisions.
        </p>
      </div>
    </section>
  )
}
