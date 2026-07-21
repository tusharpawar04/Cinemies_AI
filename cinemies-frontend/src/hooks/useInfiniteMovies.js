import { useInfiniteQuery } from '@tanstack/react-query'
import { useCinemiesStore } from '../store/useCinemiesStore'
import { apiClient } from '../api/client'
import { MOCK_MOVIES } from '../data/topImdbMovies'

export function useInfiniteMovies() {
  const { currentMood, selectedIndustry } = useCinemiesStore()

  return useInfiniteQuery({
    queryKey: ['movies', currentMood, selectedIndustry],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const { data } = await apiClient.get(`/api/v1/recommendations/mood/${currentMood}`, {
          params: {
            industry: selectedIndustry !== 'all' ? selectedIndustry : undefined,
            page: pageParam,
            limit: 12,
          }
        })
        return data
      } catch {
        // Fallback to mock data when backend is offline
        const filtered = MOCK_MOVIES.filter(m => {
          const moodMatch = m.mood_scores?.[currentMood] > 0.3
          const industryMatch = selectedIndustry === 'all' || m.industry.toLowerCase() === selectedIndustry
          return moodMatch && industryMatch
        })
        return { data: filtered, hasMore: false, nextPage: null }
      }
    },
    getNextPageParam: (lastPage) => lastPage?.hasMore ? lastPage.nextPage : undefined,
    staleTime: 1000 * 60 * 5,
  })
}
