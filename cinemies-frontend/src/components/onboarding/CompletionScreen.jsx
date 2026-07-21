import { motion } from 'framer-motion'
import '../../styles/onboarding.css'

export default function CompletionScreen({ result, onContinue }) {
  return (
    <div className="calibration-page">
      <div className="calibration-ambient calibration-ambient--success" />

      <motion.div
        className="completion-screen"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.div
          className="completion-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          🎉
        </motion.div>

        <h1 className="completion-title">Your Taste Profile is Ready!</h1>
        <p className="completion-subtitle">
          Based on your ratings, we&apos;ve learned your unique preferences.
          Your recommendations are now personalized just for you.
        </p>

        {result && (
          <div className="completion-stats">
            <div className="stat-item">
              <span className="stat-value">{result.liked_count || result.rating_distribution?.good || 0}</span>
              <span className="stat-label">Movies Loved</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{result.disliked_count || result.rating_distribution?.bad || 0}</span>
              <span className="stat-label">Not Your Style</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">384</span>
              <span className="stat-label">Taste Dimensions</span>
            </div>
          </div>
        )}

        <motion.button
          className="completion-cta"
          onClick={onContinue}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Explore Movies →
        </motion.button>

        {/* Confetti particles */}
        <div className="confetti-container">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                '--delay': `${Math.random() * 2}s`,
                '--x': `${Math.random() * 100}vw`,
                '--hue': Math.random() * 360,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
