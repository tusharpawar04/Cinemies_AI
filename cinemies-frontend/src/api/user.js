import { apiClient } from './client'

export async function getUserProfile() {
  const res = await apiClient.get('/api/v1/users/me')
  return res.data.data
}

export async function getFullProfile() {
  const res = await apiClient.get('/api/v1/users/profile')
  return res.data.data
}

export async function updateProfile(data) {
  const res = await apiClient.put('/api/v1/users/profile', data)
  return res.data
}

export async function trackInteraction(type, metadata = {}) {
  try {
    await apiClient.post('/api/v1/interactions', {
      interactionType: type,
      metadata,
    })
  } catch (err) {
    console.warn('Failed to track interaction:', err.message)
  }
}
