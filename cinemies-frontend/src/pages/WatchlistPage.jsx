import { useEffect, useState } from 'react'
import { useWatchlistStore } from '../store/useWatchlistStore'
import { useAuthStore } from '../store/useAuthStore'
import { apiClient } from '../api/client'
import Navbar from '../components/ui/Navbar'
import { useCinemiesStore } from '../store/useCinemiesStore'
import '../styles/watchlist.css'

export default function WatchlistPage() {
  const { watchlist, watched, fetchAll } = useWatchlistStore()
  const { user } = useAuthStore()
  const { setSelectedMovieDetails } = useCinemiesStore()
  
  const [watchlistMovies, setWatchlistMovies] = useState([])
  const [watchedMovies, setWatchedMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('watchlist') // 'watchlist' or 'watched'

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (watchlist.length > 0 || watched.length > 0) {
      fetchMovieDetails()
    } else {
      setLoading(false)
    }
  }, [watchlist, watched])

  const fetchMovieDetails = async () => {
    setLoading(true)
    try {
      // Fetch watchlist movies
      if (watchlist.length > 0) {
        const watchlistPromises = watchlist.map(id =>
          apiClient.get(`/api/v1/movies/${id}`).catch(() => null)
        )
        const watchlistResults = await Promise.all(watchlistPromises)
        setWatchlistMovies(
          watchlistResults
            .filter(res => res && res.data.success)
            .map(res => res.data.data)
        )
      }

      // Fetch watched movies
      if (watched.length > 0) {
        const watchedPromises = watched.map(id =>
          apiClient.get(`/api/v1/movies/${id}`).catch(() => null)
        )
        const watchedResults = await Promise.all(watchedPromises)
        setWatchedMovies(
          watchedResults
            .filter(res => res && res.data.success)
            .map(res => res.data.data)
        )
      }
    } catch (err) {
      console.error('Failed to fetch movie details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMovieClick = (movie) => {
    setSelectedMovieDetails(movie)
  }

  return (
    <div className="watchlist-page">
      <Navbar />
      
      <div className="watchlist-container">
        <div className="watchlist-header">
          <h1>My Collection</h1>
          <p>Track movies you want to watch and have watched</p>
        </div>

        <div className="watchlist-tabs">
          <button
            className={`tab ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            className={`tab ${activeTab === 'watched' ? 'active' : ''}`}
            onClick={() => setActiveTab('watched')}
          >
            Watched ({watched.length})
          </button>
        </div>

        {loading ? (
          <div className="watchlist-loading">
            <div className="spinner"></div>
            <p>Loading your movies...</p>
          </div>
        ) : (
          <div className="watchlist-content">
            {activeTab === 'watchlist' && (
              <div className="watchlist-grid">
                {watchlistMovies.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>Your watchlist is empty</h3>
                    <p>Start adding movies you want to watch!</p>
                  </div>
                ) : (
                  watchlistMovies.map(movie => (
                    <MovieCard
                      key={movie.tmdb_id}
                      movie={movie}
                      onClick={() => handleMovieClick(movie)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'watched' && (
              <div className="watchlist-grid">
                {watchedMovies.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <h3>No watched movies yet</h3>
                    <p>Mark movies as watched to track your viewing history!</p>
                  </div>
                ) : (
                  watchedMovies.map(movie => (
                    <MovieCard
                      key={movie.tmdb_id}
                      movie={movie}
                      onClick={() => handleMovieClick(movie)}
                      watched={true}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MovieCard({ movie, onClick, watched = false }) {
  const posterUrl = movie.poster_url || 
    (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)

  return (
    <div className="movie-card" onClick={onClick}>
      {watched && <div className="watched-badge">✓ Watched</div>}
      <div className="movie-card-poster">
        {posterUrl ? (
          <img src={posterUrl} alt={movie.title} />
        ) : (
          <div className="movie-card-no-poster">{movie.title?.[0] || '?'}</div>
        )}
      </div>
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <div className="movie-card-meta">
          {movie.year && <span>{movie.year}</span>}
          {movie.vote_average > 0 && <span className="rating">★ {movie.vote_average.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  )
}
