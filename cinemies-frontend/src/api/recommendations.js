import { apiClient } from './client'

export async function getMoodRecommendations(mood, industry = 'all') {
  const res = await apiClient.get(`/api/v1/recommendations/mood/${mood}`, {
    params: { industry },
    timeout: 5000,
  })
  return res.data.data
}

export async function getPersonalizedRecommendations(mood, limit = 10) {
  const res = await apiClient.post('/api/v1/recommendations/personalized', {
    mood,
    limit,
  })
  return res.data.data
}

export async function getAvailableMoods() {
  const res = await apiClient.get('/api/v1/recommendations/moods')
  return res.data.data
}

export async function clearUserCache() {
  const res = await apiClient.delete('/api/v1/recommendations/cache', {
    params: { type: 'user' },
  })
  return res.data
}
