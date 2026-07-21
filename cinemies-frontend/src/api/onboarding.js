import { apiClient } from './client'

export async function fetchCalibrationMovies() {
  const res = await apiClient.get('/api/v1/onboarding/movies')
  return res.data.data
}

export async function submitTasteProfile(ratedMovies) {
  const res = await apiClient.post('/api/v1/onboarding/taste-profile', {
    rated_movies: ratedMovies,
  })
  return res.data
}

export async function skipCalibration() {
  const res = await apiClient.post('/api/v1/onboarding/skip')
  return res.data
}
