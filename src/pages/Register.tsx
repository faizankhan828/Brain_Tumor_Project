import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { apiRegister } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await apiRegister(values.name, values.email, values.password)
      setAuth(response)
      toast.success('Account created successfully')
      navigate('/upload')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Registration failed. Please try again.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="shell-panel p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Create account</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Join the MRI workflow</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Full name</label>
              <input
                type="text"
                className="glass-input"
                placeholder="Dr. Maya Singh"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name ? <p className="mt-2 text-sm text-rose-300">{errors.name.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                className="glass-input"
                placeholder="doctor@hospital.ai"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email ? <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Create password"
                  {...register('password', { required: 'Password is required', minLength: 6 })}
                />
                {errors.password ? (
                  <p className="mt-2 text-sm text-rose-300">Password must be at least 6 characters.</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Confirm password</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Repeat password"
                  {...register('confirmPassword', {
                    required: 'Confirm your password',
                    validate: (value) => value === watch('password') || 'Passwords do not match',
                  })}
                />
                {errors.confirmPassword ? (
                  <p className="mt-2 text-sm text-rose-300">{errors.confirmPassword.message}</p>
                ) : null}
              </div>
            </div>

            <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-300 transition hover:text-teal-200">
              Log in
            </Link>
          </p>
        </section>

        <section className="space-y-6 text-white">
          <div className="shell-panel p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Platform features</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
              MRI upload, AI prediction, and history review.
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Predictions are powered by a ResNet50 model with Grad-CAM visual explanations stored server-side.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Upload', 'Drag-and-drop JPEG or PNG scans'],
              ['Results', 'Confidence, heatmap, and class probabilities'],
              ['History', 'Review past predictions with PDF reports'],
              ['Responsive', 'Optimized for mobile, tablet, and desktop'],
            ].map(([title, description]) => (
              <div key={title} className="shell-panel p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
