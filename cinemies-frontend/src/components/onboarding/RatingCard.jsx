import { motion } from 'framer-motion'

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export default function RatingCard({ movie, onRate }) {
  const posterUrl = movie.poster_url || movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path || ''}`
    : null

  return (
    <motion.div
      className="rating-card"
      initial={{ x: 300, opacity: 0, rotateY: -15 }}
      animate={{ x: 0, opacity: 1, rotateY: 0 }}
      exit={{ x: -300, opacity: 0, rotateY: 15 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        className="rating-card-poster"
        style={{
          backgroundImage: posterUrl ? `url(${posterUrl})` : FALLBACK_GRADIENT,
        }}
      >
        {!posterUrl && (
          <div className="poster-fallback-text">{movie.title}</div>
        )}
        <div className="poster-overlay" />
      </div>

      <div className="rating-card-info">
        <h2 className="rating-card-title">{movie.title}</h2>
        <div className="rating-card-meta">
          <span className="rating-card-year">{movie.year}</span>
          {movie.vote_average > 0 && (
            <span className="rating-card-score">★ {movie.vote_average.toFixed(1)}</span>
          )}
          {movie.industry && movie.industry !== 'hollywood' && (
            <span className="rating-card-industry">{movie.industry}</span>
          )}
        </div>

        <div className="rating-card-genres">
          {(movie.genres || []).slice(0, 3).map(genre => (
            <span key={genre} className="genre-pill">{genre}</span>
          ))}
        </div>

        <p className="rating-card-overview">
          {movie.overview?.length > 180
            ? movie.overview.substring(0, 180) + '...'
            : movie.overview}
        </p>
      </div>

      <div className="rating-card-actions">
        <button
          className="rate-btn rate-bad"
          onClick={() => onRate(-1)}
          aria-label="Rate bad"
        >
          <span className="rate-icon">👎</span>
          <span className="rate-label">Bad</span>
        </button>

        <button
          className="rate-btn rate-neutral"
          onClick={() => onRate(0)}
          aria-label="Rate don't know"
        >
          <span className="rate-icon">🤷</span>
          <span className="rate-label">Don&apos;t Know</span>
        </button>

        <button
          className="rate-btn rate-good"
          onClick={() => onRate(1)}
          aria-label="Rate good"
        >
          <span className="rate-icon">👍</span>
          <span className="rate-label">Good</span>
        </button>
      </div>
    </motion.div>
  )
}
