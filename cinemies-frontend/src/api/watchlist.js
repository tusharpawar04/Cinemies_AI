import { apiClient } from './client'

/**
 * Watchlist API Functions
 */

export async function getWatchlist() {
  const res = await apiClient.get('/api/v1/users/watchlist')
  return res.data.data
}

export async function addToWatchlist(movieId) {
  const res = await apiClient.post('/api/v1/users/watchlist', { movieId })
  return res.data
}

export async function removeFromWatchlist(movieId) {
  const res = await apiClient.delete(`/api/v1/users/watchlist/${movieId}`)
  return res.data
}

/**
 * Watched API Functions
 */

export async function getWatched() {
  const res = await apiClient.get('/api/v1/users/watched')
  return res.data.data
}

export async function addToWatched(movieId, userRating = null) {
  const res = await apiClient.post('/api/v1/users/watched', { movieId, userRating })
  return res.data
}

export async function removeFromWatched(movieId) {
  const res = await apiClient.delete(`/api/v1/users/watched/${movieId}`)
  return res.data
}

/**
 * Streaming Availability
 */

export async function getStreamingPlatforms(movieId, country = 'US') {
  const res = await apiClient.get(`/api/v1/movies/${movieId}/streaming`, {
    params: { country }
  })
  return res.data.data
}
