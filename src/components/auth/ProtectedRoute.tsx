import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute() {
  const { loading, appUser } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow">
        <Loader2 size={28} className="animate-spin text-neon-cyan" />
      </div>
    )
  }

  if (!appUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
