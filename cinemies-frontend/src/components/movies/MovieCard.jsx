import { useState } from 'react'
import MoodScoreBar from './MoodScoreBar'
import { trackInteraction } from '../../api/user'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import '../../styles/movies.css'

export default function MovieCard({ movie, index = 0 }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const { setSelectedMovieDetails } = useCinemiesStore()

  const posterUrl = movie.poster_url
    || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)

  const handleClick = () => {
    setSelectedMovieDetails(movie)
    trackInteraction('movie_click', {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      match_score: movie.match_score,
    }).catch(err => console.error('Failed to track click', err))
  }

  return (
    <div
      className="movie-card"
      onClick={handleClick}
      style={{ '--delay': `${index * 0.06}s` }}
    >
      <div className="movie-card-poster">
        {posterUrl && !imgError ? (
          <>
            {!imgLoaded && <div className="movie-card-skeleton-img" />}
            <img
              src={posterUrl}
              alt={movie.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className="movie-card-no-poster">
            <span>{movie.title?.[0] || '?'}</span>
          </div>
        )}
        <div className="movie-card-poster-overlay" />
      </div>

      <div className="movie-card-body">
        <h3 className="movie-card-title">{movie.title}</h3>

        <div className="movie-card-meta">
          {movie.year && <span>{movie.year}</span>}
          {movie.vote_average > 0 && (
            <span className="movie-card-rating">★ {movie.vote_average.toFixed(1)}</span>
          )}
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <div className="movie-card-genres">
            {movie.genres.slice(0, 2).map(g => (
              <span key={g} className="movie-card-genre">{g}</span>
            ))}
          </div>
        )}

        {movie.match_score != null && (
          <MoodScoreBar score={movie.match_score} />
        )}

        {movie.reason && (
          <p className="movie-card-reason">{movie.reason}</p>
        )}
      </div>
    </div>
  )
}
