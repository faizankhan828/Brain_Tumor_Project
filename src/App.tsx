import { Navigate, BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicRoute } from './routes/PublicRoute'
import { AppShell } from './layout/AppShell'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Upload } from './pages/Upload'
import { History } from './pages/History'

function RootRedirect() {
  const token = useAuthStore((state) => state.token)

  return <Navigate to={token ? '/upload' : '/login'} replace />
}

function NotFoundRedirect() {
  toast.dismiss()
  return <Navigate to="/" replace />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/upload" element={<Upload />} />
            <Route path="/history" element={<History />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'rounded-2xl border border-slate-200 bg-white/95 text-slate-800 shadow-2xl',
          success: { iconTheme: { primary: '#0f766e', secondary: '#ecfeff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fef2f2' } },
        }}
      />
    </Router>
  )
}

export default App
