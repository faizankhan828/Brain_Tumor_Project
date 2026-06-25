import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface NavbarProps {
  title: string
  onMenuClick: () => void
}

/* ── Full-screen sign-out confirmation overlay ─────────────────────────────── */
function SignOutOverlay({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="card-elevated overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-teal-400/40" />
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-teal-400/20 bg-teal-400/10">
                <LogOut className="h-8 w-8 text-teal-300" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-white">Thank you for using</h2>
            <p className="mt-1 bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-2xl font-bold text-transparent">
              Brain Tumor MRI Detector
            </p>

            {/* Message */}
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Your session has been protected with JWT authentication. All uploaded
              scans and reports remain securely stored in your account.
            </p>

            {/* Divider */}
            <div className="my-6 h-px bg-white/[0.06]" />

            {/* Stats row */}
            <div className="mb-6 flex justify-center gap-6">
              {[
                ['AI-Powered', 'ResNet50 + Grad-CAM'],
                ['Secure', 'JWT Protected'],
                ['4 Classes', 'Tumor Classification'],
              ].map(([label, value]) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-semibold text-teal-300">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="secondary-button flex-1"
              >
                <X className="h-4 w-4" />
                Stay signed in
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl
                           bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5
                           text-sm font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.35)]
                           transition-all hover:from-rose-500 hover:to-rose-400 active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Navbar({ title, onMenuClick }: NavbarProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [showSignOut, setShowSignOut] = useState(false)

  const handleConfirmSignOut = () => {
    setShowSignOut(false)
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050d18]/85 backdrop-blur-2xl">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg
                         border border-white/[0.08] bg-white/[0.05] text-slate-300
                         transition hover:bg-white/[0.1] hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div>
              <p className="section-label">Brain Tumor MRI Detector</p>
              <h1 className="text-base font-semibold text-white sm:text-lg">{title}</h1>
            </div>
          </div>

          {/* Right: user pill */}
          {user && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1.5 pl-3">
              <div className="hidden flex-col items-end sm:flex">
                <p className="text-sm font-semibold leading-none text-white">{user.name}</p>
                <p className="mt-0.5 text-xs leading-none text-slate-500">{user.role}</p>
              </div>

              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-lg border border-teal-400/20 object-cover"
                />
              )}

              <button
                type="button"
                onClick={() => setShowSignOut(true)}
                className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08]
                           bg-white/[0.06] px-3 text-xs font-medium text-slate-300
                           transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {showSignOut && (
        <SignOutOverlay
          onConfirm={handleConfirmSignOut}
          onCancel={() => setShowSignOut(false)}
        />
      )}
    </>
  )
}
