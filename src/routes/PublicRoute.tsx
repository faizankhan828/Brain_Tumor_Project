import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function PublicRoute() {
  const token = useAuthStore((state) => state.token)

  if (token) {
    return <Navigate to="/upload" replace />
  }

  return <Outlet />
}