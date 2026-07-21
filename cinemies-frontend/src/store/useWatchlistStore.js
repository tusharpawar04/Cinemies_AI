import { create } from 'zustand'
import { 
  getWatchlist, 
  addToWatchlist as apiAddToWatchlist, 
  removeFromWatchlist as apiRemoveFromWatchlist,
  getWatched,
  addToWatched as apiAddToWatched,
  removeFromWatched as apiRemoveFromWatched,
} from '../api/watchlist'

export const useWatchlistStore = create((set, get) => ({
  // State
  watchlist: [],
  watched: [],
  watchedMetadata: [],
  isLoading: false,
  error: null,
  initialized: false,

  // Actions
  fetchWatchlist: async () => {
    try {
      set({ isLoading: true, error: null })
      const data = await getWatchlist()
      set({ 
        watchlist: data.watchlist || [],
        isLoading: false,
        initialized: true,
      })
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
      set({ 
        error: err.response?.data?.message || 'Failed to load watchlist',
        isLoading: false,
      })
    }
  },

  fetchWatched: async () => {
    try {
      set({ isLoading: true, error: null })
      const data = await getWatched()
      set({ 
        watched: data.watched || [],
        watchedMetadata: data.watchedMetadata || [],
        isLoading: false,
        initialized: true,
      })
    } catch (err) {
      console.error('Failed to fetch watched:', err)
      set({ 
        error: err.response?.data?.message || 'Failed to load watched list',
        isLoading: false,
      })
    }
  },

  fetchAll: async () => {
    const { fetchWatchlist, fetchWatched } = get()
    await Promise.all([fetchWatchlist(), fetchWatched()])
  },

  addToWatchlist: async (movieId) => {
    try {
      const result = await apiAddToWatchlist(movieId)
      set(state => ({
        watchlist: [...state.watchlist, movieId],
        error: null,
      }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add to watchlist'
      set({ error: message })
      return { success: false, error: message }
    }
  },

  removeFromWatchlist: async (movieId) => {
    try {
      await apiRemoveFromWatchlist(movieId)
      set(state => ({
        watchlist: state.watchlist.filter(id => id !== movieId),
        error: null,
      }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove from watchlist'
      set({ error: message })
      return { success: false, error: message }
    }
  },

  addToWatched: async (movieId, userRating = null) => {
    try {
      await apiAddToWatched(movieId, userRating)
      set(state => ({
        watched: [...state.watched, movieId],
        watchedMetadata: [
          ...state.watchedMetadata,
          { tmdb_id: movieId, watched_at: new Date().toISOString(), user_rating: userRating }
        ],
        // Remove from watchlist if present
        watchlist: state.watchlist.filter(id => id !== movieId),
        error: null,
      }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to mark as watched'
      set({ error: message })
      return { success: false, error: message }
    }
  },

  removeFromWatched: async (movieId) => {
    try {
      await apiRemoveFromWatched(movieId)
      set(state => ({
        watched: state.watched.filter(id => id !== movieId),
        watchedMetadata: state.watchedMetadata.filter(m => m.tmdb_id !== movieId),
        error: null,
      }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove from watched'
      set({ error: message })
      return { success: false, error: message }
    }
  },

  // Utility functions
  isInWatchlist: (movieId) => {
    return get().watchlist.includes(movieId)
  },

  isWatched: (movieId) => {
    return get().watched.includes(movieId)
  },

  getWatchedDetails: (movieId) => {
    const metadata = get().watchedMetadata
    return metadata.find(m => m.tmdb_id === movieId) || null
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    watchlist: [],
    watched: [],
    watchedMetadata: [],
    isLoading: false,
    error: null,
    initialized: false,
  }),
}))
