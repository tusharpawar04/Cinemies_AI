import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'

// Landing components
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import WatchlistPage from './pages/WatchlistPage'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'

// Components
import TasteCalibrationFlow from './components/onboarding/TasteCalibrationFlow'
import ProtectedRoute from './components/auth/ProtectedRoute'

export default function App() {
  const { checkAuth, isAuthenticated, onboardingCompleted } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Routes>
      {/* Root: Landing for visitors, HomePage for authenticated with onboarding done */}
      <Route 
        path="/" 
        element={
          !isAuthenticated 
            ? <LandingPage /> 
            : !onboardingCompleted 
              ? <Navigate to="/taste-calibration" replace /> 
              : <HomePage />
        } 
      />
      
      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes */}
      <Route
        path="/taste-calibration"
        element={
          <ProtectedRoute>
            <TasteCalibrationFlow />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <WatchlistPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
