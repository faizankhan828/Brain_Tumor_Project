import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { apiLogin } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface LoginFormValues {
  email: string
  password: string
}

export function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await apiLogin(values.email, values.password)
      setAuth(response)
      toast.success('Login successful')
      navigate('/upload')
    } catch {
      toast.error('Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 text-white">
          <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-teal-100">
            Brain Tumor MRI Detector
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
            Fast MRI triage with a clean clinical workflow.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Log in to upload scans, view AI predictions, inspect probability charts, and review your scan history.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Protected', 'JWT authentication via secure backend'],
              ['AI-Powered', 'ResNet50 classification with Grad-CAM'],
              ['Responsive', 'Mobile, tablet, and desktop layouts'],
            ].map(([title, description]) => (
              <div key={title} className="shell-panel p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="shell-panel p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Sign in</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Welcome back</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                className="glass-input"
                placeholder="radiologist@hospital.ai"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email ? <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Password</label>
              <input
                type="password"
                className="glass-input"
                placeholder="Enter password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password ? <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p> : null}
            </div>

            <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-teal-300 transition hover:text-teal-200">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
