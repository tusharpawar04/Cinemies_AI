import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import RatingCard from './RatingCard'
import ProgressBar from './ProgressBar'
import CompletionScreen from './CompletionScreen'
import { fetchCalibrationMovies, submitTasteProfile, skipCalibration } from '../../api/onboarding'
import { useAuthStore } from '../../store/useAuthStore'
import '../../styles/onboarding.css'

export default function TasteCalibrationFlow() {
  const navigate = useNavigate()
  const { setOnboardingComplete, setTasteProfile } = useAuthStore()

  const [phase, setPhase] = useState('welcome') // welcome | rating | submitting | complete | error
  const [movies, setMovies] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratings, setRatings] = useState(new Map())
  const [error, setError] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  // Fetch calibration movies
  useEffect(() => {
    if (phase === 'welcome') {
      fetchCalibrationMovies()
        .then(data => {
          setMovies(data.movies || [])
        })
        .catch(err => {
          console.error('Failed to fetch calibration movies:', err)
          setError('Failed to load movies. Please try again.')
        })
    }
  }, [phase])

  const handleRate = useCallback((tmdbId, rating) => {
    setRatings(prev => {
      const next = new Map(prev)
      next.set(tmdbId, rating)
      return next
    })

    // Move to next movie
    setTimeout(() => {
      if (currentIndex + 1 >= movies.length) {
        handleSubmit()
      } else {
        setCurrentIndex(prev => prev + 1)
      }
    }, 300)
  }, [currentIndex, movies.length])

  const handleSubmit = async () => {
    setPhase('submitting')
    setError(null)

    const ratedMovies = Array.from(ratings.entries()).map(([tmdbId, rating]) => ({
      tmdb_id: tmdbId,
      rating,
    }))

    try {
      const result = await submitTasteProfile(ratedMovies)
      setSubmitResult(result.data)
      setTasteProfile(result.data)
      setPhase('complete')
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create taste profile'
      setError(msg)
      setPhase('error')
    }
  }

  const handleSkip = async () => {
    try {
      await skipCalibration()
      setOnboardingComplete()
      navigate('/')
    } catch (err) {
      console.error('Skip failed:', err)
      setOnboardingComplete()
      navigate('/')
    }
  }

  const handleRetry = () => {
    setError(null)
    setPhase('rating')
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'rating' || !movies[currentIndex]) return

    const handleKey = (e) => {
      const movie = movies[currentIndex]
      if (e.key === 'ArrowLeft' || e.key === '1') {
        handleRate(movie.tmdb_id, -1)
      } else if (e.key === 'ArrowDown' || e.key === '2') {
        handleRate(movie.tmdb_id, 0)
      } else if (e.key === 'ArrowRight' || e.key === '3') {
        handleRate(movie.tmdb_id, 1)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentIndex, movies, handleRate])

  // Welcome screen
  if (phase === 'welcome') {
    return (
      <div className="calibration-page">
        <div className="calibration-ambient" />
        <motion.div
          className="calibration-welcome"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="welcome-icon">🎬</div>
          <h1>Let&apos;s Discover Your Taste</h1>
          <p>
            Rate {movies.length || 20} movies to help us understand what you love.
            This takes about 2 minutes and dramatically improves your recommendations.
          </p>
          <div className="welcome-actions">
            <button
              className="calibration-start-btn"
              onClick={() => setPhase('rating')}
              disabled={movies.length === 0}
            >
              {movies.length === 0 ? 'Loading movies...' : "Let's Go →"}
            </button>
            <button
              className="calibration-skip-link"
              onClick={() => setShowSkipConfirm(true)}
            >
              Skip for now
            </button>
          </div>

          {showSkipConfirm && (
            <motion.div
              className="skip-confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p>⚠️ Without taste calibration, recommendations won&apos;t be personalized to you.</p>
              <div className="skip-confirm-actions">
                <button onClick={handleSkip}>Skip Anyway</button>
                <button onClick={() => setShowSkipConfirm(false)} className="cancel">
                  I&apos;ll Rate Movies
                </button>
              </div>
            </motion.div>
          )}

          {error && <div className="calibration-error">{error}</div>}
        </motion.div>
      </div>
    )
  }

  // Submitting
  if (phase === 'submitting') {
    return (
      <div className="calibration-page">
        <div className="calibration-ambient" />
        <div className="calibration-submitting">
          <div className="submit-spinner" />
          <h2>Creating your taste profile...</h2>
          <p>Analyzing your preferences with AI</p>
        </div>
      </div>
    )
  }

  // Complete
  if (phase === 'complete') {
    return <CompletionScreen result={submitResult} onContinue={() => navigate('/')} />
  }

  // Error
  if (phase === 'error') {
    return (
      <div className="calibration-page">
        <div className="calibration-ambient" />
        <div className="calibration-error-screen">
          <div className="error-icon">😕</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="calibration-start-btn">
              Try Again
            </button>
            <button onClick={handleSkip} className="calibration-skip-link">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Rating phase
  const currentMovie = movies[currentIndex]

  return (
    <div className="calibration-page">
      <div className="calibration-ambient" />

      <div className="calibration-container">
        <ProgressBar current={currentIndex} total={movies.length} />

        <div className="calibration-card-area">
          <AnimatePresence mode="wait">
            {currentMovie && (
              <RatingCard
                key={currentMovie.tmdb_id}
                movie={currentMovie}
                onRate={(rating) => handleRate(currentMovie.tmdb_id, rating)}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="calibration-hint">
          <span>Keyboard: ← Bad · ↓ Skip · → Good</span>
        </div>
      </div>
    </div>
  )
}
