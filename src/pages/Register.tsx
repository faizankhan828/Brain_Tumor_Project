import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit, Sparkles } from 'lucide-react'
import { apiRegister } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface RegisterFormValues {
  name: string; email: string; password: string; confirmPassword: string
}

const BENEFITS = [
  ['Upload',    'Drag-and-drop JPEG or PNG MRI scans'],
  ['AI Predict','ResNet50 with 4-class tumor detection'],
  ['Grad-CAM',  'Visual heatmaps showing key regions'],
  ['PDF Report','Auto-generated downloadable reports'],
  ['History',   'Full scan timeline with delete option'],
  ['Secure',    'JWT auth — your data stays private'],
]

export function Register() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((state) => state.setAuth)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<RegisterFormValues>()

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await apiRegister(values.name, values.email, values.password)
      setAuth(response)
      toast.success('Account created — welcome!')
      navigate('/upload')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Registration failed.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">

        {/* ── Left: form ─────────────────────────────────────── */}
        <div className="animate-fade-up card-elevated overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />

          <div className="p-7 sm:p-9">
            <div className="mb-7 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-400" />
              <div>
                <p className="section-label">New Account</p>
                <h2 className="text-xl font-bold text-white">Create your profile</h2>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Full name
                </label>
                <input
                  type="text" className="glass-input" placeholder="Dr. Maya Singh"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email address
                </label>
                <input
                  type="email" className="glass-input" placeholder="doctor@hospital.ai"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Password
                  </label>
                  <input
                    type="password" className="glass-input" placeholder="Min. 6 characters"
                    {...register('password', { required: true, minLength: 6 })}
                  />
                  {errors.password && <p className="mt-1.5 text-xs text-rose-400">Min 6 characters.</p>}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Confirm
                  </label>
                  <input
                    type="password" className="glass-input" placeholder="Repeat password"
                    {...register('confirmPassword', {
                      required: true,
                      validate: (v) => v === watch('password') || 'Passwords do not match',
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button type="submit" className="primary-button w-full py-3 mt-1" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 border-t border-white/[0.06] pt-5 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-teal-400 transition hover:text-teal-300">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: benefits ────────────────────────────────── */}
        <div className="animate-fade-up space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl
                            border border-teal-400/25 bg-teal-400/10 text-teal-300
                            shadow-[0_0_24px_rgba(20,184,166,0.25)]">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <p className="section-label">Medical AI Platform</p>
              <p className="text-lg font-bold text-white">Brain Tumor MRI Detector</p>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Everything you need for{' '}
              <span className="bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">
                MRI triage
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-8 text-slate-400">
              A complete AI-assisted workflow from scan upload to final PDF report — 
              all secured behind your personal account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map(([title, desc]) => (
              <div key={title} className="shell-panel p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
