import { useEffect, useRef, useCallback } from 'react'
import { useInfiniteMovies } from '../../hooks/useInfiniteMovies'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import MovieCard from './MovieCard'
import SkeletonCard from '../ui/SkeletonCard'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import { getMoodRecommendations } from '../../api/recommendations'

function IndustryFilter() {
  const { selectedIndustry, setIndustry, currentMood, setRecsLoading, setRecommendations, setRecsError } = useCinemiesStore()
  const industries = ['all', 'hollywood', 'bollywood', 'tollywood']

  const handleClick = async (ind) => {
    // Only fetch if we have a mood selected and industry is changing
    if (!currentMood || selectedIndustry === ind) return
    
    setIndustry(ind)
    setRecsLoading()
    
    try {
      const data = await getMoodRecommendations(currentMood, ind)
      const recs = data?.recommendations || data?.movies || data || []
      setRecommendations(Array.isArray(recs) ? recs : [], data?.source || 'ai')
    } catch (err) {
      console.error('Filter error:', err)
      setRecsError(err.response?.data?.error || err.message || 'Failed to filter')
    }
  }

  return (
    <div className="industry-filter">
      {industries.map(ind => (
        <button
          key={ind}
          className={`industry-btn ${selectedIndustry === ind ? 'active' : ''}`}
          onClick={() => handleClick(ind)}
          disabled={!currentMood}
        >
          {ind === 'all' ? 'All Industries' : ind.charAt(0).toUpperCase() + ind.slice(1)}
        </button>
      ))}
    </div>
  )
}

export default function InfiniteMovieFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isInfiniteLoading } = useInfiniteMovies()
  const { currentMood, recommendations, isLoadingRecs, recsError, recsSource } = useCinemiesStore()
  const sentinelRef = useRef()

  const handleIntersection = useCallback((entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '200px',
    })
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [handleIntersection])

  // Prefer API recommendations, fall back to infinite scroll data
  const apiMovies = recommendations || []
  const infiniteMovies = data?.pages?.flatMap(p => p.data) ?? []
  const moviesToShow = apiMovies.length > 0 ? apiMovies : infiniteMovies
  const isLoading = isLoadingRecs || isInfiniteLoading

  // Don't show the section if no mood is selected yet
  if (!currentMood) {
    return null
  }

  return (
    <section id="infinite-feed">
      <div className="feed-header">
        <span className="section-eyebrow">Curated for you</span>
        <h2 className="section-title">Movies That Match</h2>
        {recsSource && apiMovies.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginTop: '-0.5rem' }}>
            {recsSource === 'ai' ? '✨ AI-powered' : '📂 Cached'} • {apiMovies.length} results
          </p>
        )}
      </div>

      <IndustryFilter />

      {/* Error state */}
      {recsError && <ErrorState message={recsError} />}

      {/* Loading skeletons */}
      {isLoading && !recsError && (
        <div className="movies-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !recsError && moviesToShow.length === 0 && (
        <EmptyState mood={currentMood} />
      )}

      {/* Movies grid */}
      {!isLoading && moviesToShow.length > 0 && (
        <div className="movies-grid">
          {moviesToShow.map((movie, i) => (
            <MovieCard key={movie.tmdb_id || movie._id || i} movie={movie} index={i} currentMood={currentMood} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: '1px' }} />

      {isFetchingNextPage && <div className="loading-pulse">Loading more</div>}
      {!hasNextPage && moviesToShow.length > 0 && !apiMovies.length && (
        <div className="end-of-feed">— you've reached the end of this mood —</div>
      )}
    </section>
  )
}

