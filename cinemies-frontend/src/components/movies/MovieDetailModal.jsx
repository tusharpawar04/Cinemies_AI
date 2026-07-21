import { useEffect, useState } from 'react'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { useWatchlistStore } from '../../store/useWatchlistStore'
import { useAuthStore } from '../../store/useAuthStore'
import { getStreamingPlatforms } from '../../api/watchlist'
import MoodScoreBar from './MoodScoreBar'
import { trackInteraction } from '../../api/user'
import '../../styles/modal.css'

export default function MovieDetailModal() {
  const { selectedMovieDetails, setSelectedMovieDetails } = useCinemiesStore()
  const { isAuthenticated } = useAuthStore()
  const { 
    isInWatchlist, 
    isWatched, 
    addToWatchlist, 
    removeFromWatchlist,
    addToWatched,
    getWatchedDetails 
  } = useWatchlistStore()

  const [streamingData, setStreamingData] = useState(null)
  const [loadingStreaming, setLoadingStreaming] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (selectedMovieDetails) {
      document.body.style.overflow = 'hidden'
      
      // Log that the user viewed the details
      trackInteraction('movie_details_view', {
        tmdb_id: selectedMovieDetails.tmdb_id,
        title: selectedMovieDetails.title,
      }).catch(err => console.error('Failed to log detail view', err))

      // Fetch streaming platforms
      fetchStreamingPlatforms()
    } else {
      document.body.style.overflow = 'unset'
      setStreamingData(null)
      setShowRating(false)
      setUserRating(0)
    }
    
    return () => { 
      document.body.style.overflow = 'unset' 
    }
  }, [selectedMovieDetails])

  const fetchStreamingPlatforms = async () => {
    if (!selectedMovieDetails?.tmdb_id) return
    
    setLoadingStreaming(true)
    try {
      const data = await getStreamingPlatforms(selectedMovieDetails.tmdb_id)
      setStreamingData(data)
    } catch (err) {
      console.error('Failed to fetch streaming platforms:', err)
    } finally {
      setLoadingStreaming(false)
    }
  }

  const handleAddToWatchlist = async () => {
    if (!isAuthenticated || !selectedMovieDetails) return
    
    setActionLoading(true)
    try {
      const result = await addToWatchlist(selectedMovieDetails.tmdb_id)
      if (result.success) {
        trackInteraction('watchlist_add', { 
          tmdb_id: selectedMovieDetails.tmdb_id, 
          title: selectedMovieDetails.title 
        })
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFromWatchlist = async () => {
    if (!isAuthenticated || !selectedMovieDetails) return
    
    setActionLoading(true)
    try {
      await removeFromWatchlist(selectedMovieDetails.tmdb_id)
      trackInteraction('watchlist_remove', { 
        tmdb_id: selectedMovieDetails.tmdb_id, 
        title: selectedMovieDetails.title 
      })
    } catch (err) {
      console.error('Failed to remove from watchlist:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkAsWatched = async (rating = null) => {
    if (!isAuthenticated || !selectedMovieDetails) return
    
    setActionLoading(true)
    try {
      const result = await addToWatched(selectedMovieDetails.tmdb_id, rating)
      if (result.success) {
        trackInteraction('watch_complete', { 
          tmdb_id: selectedMovieDetails.tmdb_id, 
          title: selectedMovieDetails.title,
          user_rating: rating,
        })
        setShowRating(false)
      }
    } catch (err) {
      console.error('Failed to mark as watched:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (!selectedMovieDetails) return null

  const movie = selectedMovieDetails
  const movieId = movie.tmdb_id
  const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null

  const inWatchlist = isAuthenticated && isInWatchlist(movieId)
  const watched = isAuthenticated && isWatched(movieId)
  const watchedDetails = watched ? getWatchedDetails(movieId) : null

  return (
    <div className="modal-backdrop" onClick={() => setSelectedMovieDetails(null)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSelectedMovieDetails(null)}>✕</button>
        
        {backdropUrl && (
          <div className="modal-backdrop-img" style={{ backgroundImage: `url(${backdropUrl})` }}>
            <div className="modal-backdrop-overlay" />
          </div>
        )}

        <div className="modal-body">
          <div className="modal-poster">
            {posterUrl ? (
              <img src={posterUrl} alt={movie.title} />
            ) : (
              <div className="modal-no-poster">{movie.title?.[0] || '?'}</div>
            )}
          </div>
          
          <div className="modal-info">
            <h2 className="modal-title">{movie.title}</h2>
            
            <div className="modal-meta">
              {movie.year && <span>{movie.year}</span>}
              {movie.vote_average > 0 && <span className="modal-rating">★ {movie.vote_average.toFixed(1)}</span>}
              {movie.runtime && <span>{movie.runtime} min</span>}
            </div>

            {movie.genres && movie.genres.length > 0 && (
              <div className="modal-genres">
                {movie.genres.map(g => (
                  <span key={g} className="modal-genre">{g}</span>
                ))}
              </div>
            )}

            {movie.match_score != null && (
              <div className="modal-match-score">
                <div className="modal-match-label">Match Score</div>
                <MoodScoreBar score={movie.match_score} />
                {movie.reason && <p className="modal-reason">{movie.reason}</p>}
              </div>
            )}

            <div className="modal-overview">
              <h3>Overview</h3>
              <p>{movie.overview || "No overview available."}</p>
            </div>

            {/* Streaming Platforms */}
            <div className="modal-streaming">
              <h3>Where to Watch</h3>
              {loadingStreaming ? (
                <div className="streaming-loading">Loading platforms...</div>
              ) : streamingData && streamingData.platforms && streamingData.platforms.length > 0 ? (
                <div className="streaming-platforms">
                  {streamingData.platforms.slice(0, 6).map((platform) => (
                    <div key={platform.provider_id} className="streaming-platform">
                      <img 
                        src={`https://image.tmdb.org/t/p/original${platform.logo_path}`}
                        alt={platform.provider_name}
                        title={`${platform.provider_name} (${platform.type})`}
                      />
                      <span className="platform-type">{platform.type}</span>
                    </div>
                  ))}
                  {streamingData.platforms[0]?.link && (
                    <a 
                      href={streamingData.platforms[0].link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="streaming-link"
                    >
                      View All Options →
                    </a>
                  )}
                </div>
              ) : (
                <p className="streaming-unavailable">Streaming availability not found</p>
              )}
            </div>

            {/* Action Buttons */}
            {isAuthenticated && (
              <div className="modal-actions">
                {watched ? (
                  <div className="watched-status">
                    <span className="watched-badge">✓ Watched</span>
                    {watchedDetails?.user_rating && (
                      <span className="user-rating">Your Rating: {watchedDetails.user_rating}/10</span>
                    )}
                  </div>
                ) : (
                  <>
                    {!showRating ? (
                      <>
                        {inWatchlist ? (
                          <button 
                            className="modal-action-btn secondary"
                            onClick={handleRemoveFromWatchlist}
                            disabled={actionLoading}
                          >
                            ✓ In Watchlist
                          </button>
                        ) : (
                          <button 
                            className="modal-action-btn primary"
                            onClick={handleAddToWatchlist}
                            disabled={actionLoading}
                          >
                            + Add to Watchlist
                          </button>
                        )}
                        <button 
                          className="modal-action-btn primary"
                          onClick={() => setShowRating(true)}
                          disabled={actionLoading}
                        >
                          Mark as Watched
                        </button>
                      </>
                    ) : (
                      <div className="rating-section">
                        <p>Rate this movie (optional):</p>
                        <div className="rating-stars">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                            <button
                              key={star}
                              className={`star ${userRating >= star ? 'filled' : ''}`}
                              onClick={() => setUserRating(star)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <div className="rating-actions">
                          <button 
                            className="modal-action-btn primary"
                            onClick={() => handleMarkAsWatched(userRating || null)}
                            disabled={actionLoading}
                          >
                            {userRating > 0 ? `Submit Rating (${userRating}/10)` : 'Mark as Watched'}
                          </button>
                          <button 
                            className="modal-action-btn secondary"
                            onClick={() => setShowRating(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="modal-login-prompt">
                <p>Sign in to add to watchlist and track watched movies</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
