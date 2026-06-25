import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react'
import { apiLogin } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface LoginFormValues { email: string; password: string }

const FEATURES = [
  { icon: BrainCircuit, title: 'ResNet50 + Grad-CAM',  desc: 'State-of-the-art transfer learning with visual attribution heatmaps' },
  { icon: ShieldCheck,  title: 'JWT Authentication',    desc: 'Secure token-based sessions, all data belongs to your account' },
  { icon: Activity,     title: '4-Class Classification', desc: 'Glioma · Meningioma · Pituitary · No Tumor — all in one prediction' },
]

export function Login() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((state) => state.setAuth)
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await apiLogin(values.email, values.password)
      setAuth(response)
      toast.success('Welcome back!')
      navigate('/upload')
    } catch {
      toast.error('Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">

        {/* ── Left: branding ─────────────────────────────────── */}
        <div className="space-y-8 animate-fade-up">
          {/* Logo strip */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl
                            border border-teal-400/25 bg-teal-400/10 text-teal-300
                            shadow-[0_0_24px_rgba(20,184,166,0.25)]">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <p className="section-label">Medical AI Platform</p>
              <p className="text-lg font-bold text-white leading-tight">Brain Tumor MRI Detector</p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="max-w-lg text-4xl font-black leading-tight text-white sm:text-5xl">
              AI-Powered{' '}
              <span className="bg-gradient-to-r from-teal-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                MRI Analysis
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-8 text-slate-400">
              Upload brain MRI scans and receive instant AI classification with
              Grad-CAM visual explanations and downloadable clinical reports.
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="shell-panel flex items-start gap-4 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                                border border-teal-400/20 bg-teal-400/10 text-teal-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: form ────────────────────────────────────── */}
        <div className="animate-fade-up card-elevated overflow-hidden">
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />

          <div className="p-7 sm:p-9">
            <div className="mb-7 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-400" />
              <div>
                <p className="section-label">Secure Sign In</p>
                <h2 className="text-xl font-bold text-white">Welcome back</h2>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email address
                </label>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="doctor@hospital.ai"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="mt-2 text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Enter password"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <p className="mt-2 text-xs text-rose-400">{errors.password.message}</p>}
              </div>

              <button type="submit" className="primary-button w-full py-3" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 border-t border-white/[0.06] pt-5 text-center">
              <p className="text-sm text-slate-500">
                New to the platform?{' '}
                <Link to="/register" className="font-semibold text-teal-400 transition hover:text-teal-300">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
