import { useEffect, useRef } from 'react'
import { Brain, Heart, Sparkles } from 'lucide-react'

interface LogoutModalProps {
  userName: string
  onDone: () => void
}

/**
 * Full-screen animated farewell shown briefly on sign-out.
 * Auto-dismisses after 3 s and calls onDone so the caller can
 * clear auth state and redirect to /login.
 */
export function LogoutModal({ userName, onDone }: LogoutModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDone, 3200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDone])

  const first = userName.split(' ')[0]

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#030b14]">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[80px]" />
      </div>

      {/* Card */}
      <div className="animate-fade-up relative flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.05] px-10 py-12 text-center shadow-2xl backdrop-blur-2xl sm:px-16">

        {/* Pulsing brain icon */}
        <div className="relative">
          <div className="animate-pulse-ring absolute inset-0 rounded-full bg-teal-400/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10">
            <Brain className="h-9 w-9 text-teal-400" />
          </div>
        </div>

        {/* Goodbye text */}
        <div className="space-y-2">
          <p className="section-eyebrow">Session ended</p>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Goodbye, {first}
            <span className="ml-2 inline-block animate-bounce">👋</span>
          </h2>
          <p className="mt-1 text-lg font-medium text-teal-300">
            Thank you for using NeuraScan AI
          </p>
        </div>

        <div className="divider w-64" />

        {/* Message */}
        <p className="max-w-xs text-sm leading-7 text-slate-400">
          Your session has been securely closed. Stay safe and see you next
          time.
        </p>

        {/* Decorative icons */}
        <div className="flex items-center gap-4 text-slate-600">
          <Heart className="h-4 w-4 text-rose-400/60" />
          <Sparkles className="h-4 w-4 text-teal-400/60" />
          <Heart className="h-4 w-4 text-rose-400/60" />
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full animate-[progress_3.2s_linear_forwards] rounded-full bg-gradient-to-r from-teal-400 to-indigo-400" />
        </div>
        <p className="text-xs text-slate-600">Redirecting to sign in…</p>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
