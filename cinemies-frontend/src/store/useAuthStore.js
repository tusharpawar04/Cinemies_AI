import { create } from 'zustand'
import { apiClient } from '../api/client'

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: localStorage.getItem('cinemies_token') || null,
  refreshToken: localStorage.getItem('cinemies_refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('cinemies_token'),
  isLoading: false,
  error: null,
  onboardingCompleted: false,
  hasTasteVector: false,
  tasteInsights: null,
  cohort: null,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post('/api/v1/auth/login', { email, password })
      const { user, accessToken, refreshToken } = res.data.data

      localStorage.setItem('cinemies_token', accessToken)
      localStorage.setItem('cinemies_refresh_token', refreshToken)

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        onboardingCompleted: user.onboardingCompleted || false,
      })

      return { success: true, user }
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Login failed'
      set({ isLoading: false, error: message })
      return { success: false, error: message }
    }
  },

  register: async ({ email, password, firstName, lastName }) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post('/api/v1/auth/register', {
        email, password, firstName, lastName,
      })
      const { user, accessToken, refreshToken } = res.data.data

      localStorage.setItem('cinemies_token', accessToken)
      localStorage.setItem('cinemies_refresh_token', refreshToken)

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        onboardingCompleted: false,
      })

      return { success: true, user }
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Registration failed'
      set({ isLoading: false, error: message })
      return { success: false, error: message }
    }
  },

  logout: () => {
    localStorage.removeItem('cinemies_token')
    localStorage.removeItem('cinemies_refresh_token')
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      hasTasteVector: false,
      tasteInsights: null,
      cohort: null,
    })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('cinemies_token')
    if (!token) {
      set({ isAuthenticated: false, isLoading: false })
      return false
    }

    set({ isLoading: true })
    try {
      const res = await apiClient.get('/api/v1/users/me')
      const { user, onboarding_completed, has_taste_vector, taste_insights, cohort } = res.data.data

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        onboardingCompleted: onboarding_completed,
        hasTasteVector: has_taste_vector,
        tasteInsights: taste_insights,
        cohort,
      })

      return true
    } catch (err) {
      // Token expired or invalid
      if (err.response?.status === 401) {
        localStorage.removeItem('cinemies_token')
        localStorage.removeItem('cinemies_refresh_token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
      return false
    }
  },

  setOnboardingComplete: () => {
    set({ onboardingCompleted: true })
  },

  setTasteProfile: (insights) => {
    set({
      hasTasteVector: true,
      onboardingCompleted: true,
      tasteInsights: insights,
    })
  },

  clearError: () => set({ error: null }),
}))
