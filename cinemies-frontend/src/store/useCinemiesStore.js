import { create } from 'zustand'

export const useCinemiesStore = create((set) => ({
  // Entry phase
  entryComplete: false,
  setEntryComplete: (v) => set({ entryComplete: v }),

  // Current mood
  currentMood: 'mind_bending',
  setMood: (mood) => set({ currentMood: mood, selectedIndustry: 'all' }),

  // Industry filter
  selectedIndustry: 'all',
  setIndustry: (industry) => set({ selectedIndustry: industry }),

  // Hovered movie
  hoveredMovieId: null,
  setHoveredMovie: (id) => set({ hoveredMovieId: id }),

  // Selected movie for modal
  selectedMovieDetails: null,
  setSelectedMovieDetails: (movie) => set({ selectedMovieDetails: movie }),

  // Loading
  sceneReady: false,
  setSceneReady: (v) => set({ sceneReady: v }),
  clipLoaded: false,
  setClipLoaded: (v) => set({ clipLoaded: v }),

  // Recommendations from API
  recommendations: [],
  isLoadingRecs: false,
  recsError: null,
  recsSource: null, // 'ai' | 'fallback' | 'cache'
  setRecommendations: (recs, source = 'ai') => set({
    recommendations: recs,
    isLoadingRecs: false,
    recsError: null,
    recsSource: source,
  }),
  setRecsLoading: () => set({ isLoadingRecs: true, recsError: null }),
  setRecsError: (error) => set({ isLoadingRecs: false, recsError: error }),
}))

