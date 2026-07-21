import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

export default function ProtectedRoute({ children, requireOnboarding = false }) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuthStore()

  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireOnboarding && !onboardingCompleted) {
    return <Navigate to="/taste-calibration" replace />
  }

  return children
}
