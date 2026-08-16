import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

export default function ProtectedRoute() {
  const { authenticated } = useAuth()
  const location = useLocation()

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

export function GMRoute({ children }) {
  const { authenticated, isGM } = useAuth()
  const location = useLocation()

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!isGM) {
    return <Navigate to="/profile" replace />
  }
  return children
}
