import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { getUserProfile } from '../api/user'
import { clearUserCache } from '../api/recommendations'
import '../styles/profile.css'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, hasTasteVector, tasteInsights, checkAuth } = useAuthStore()
  const [showRecalibrate, setShowRecalibrate] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    getUserProfile()
      .then(data => setProfile(data))
      .catch(err => console.error('Failed to load profile:', err))
  }, [])

  const handleRecalibrate = () => {
    navigate('/taste-calibration')
  }

  const handleClearCache = async () => {
    try {
      await clearUserCache()
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 3000)
    } catch (err) {
      console.error('Failed to clear cache:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const insights = profile?.taste_insights || tasteInsights

  return (
    <div className="profile-page">
      <div className="profile-ambient" />

      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.firstName?.[0] || user?.email?.[0] || '?'}
          </div>
          <div className="profile-info">
            <h1>{user?.firstName} {user?.lastName || ''}</h1>
            <p className="profile-email">{user?.email}</p>
          </div>
        </div>

        {/* Taste Insights */}
        <div className="profile-section">
          <h2>Your Taste Profile</h2>

          {insights ? (
            <div className="taste-insights">
              <div className="insight-row">
                <span className="insight-label">Top Genres</span>
                <div className="insight-genres">
                  {insights.top_genres?.length > 0
                    ? insights.top_genres.map(g => (
                        <span key={g} className="insight-genre">{g}</span>
                      ))
                    : <span className="insight-empty">Not enough data</span>
                  }
                </div>
              </div>

              {insights.top_genres?.length > 0 && (
                <div className="genre-distribution">
                  {insights.top_genres.map((genre, i) => (
                    <div key={genre} className="genre-bar-row">
                      <span className="genre-bar-label">{genre}</span>
                      <div className="genre-bar-track">
                        <div
                          className="genre-bar-fill"
                          style={{ width: `${100 - i * 25}%`, '--hue': i * 120 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="insight-stats">
                <div className="insight-stat">
                  <span className="stat-num">{insights.total_ratings || 0}</span>
                  <span className="stat-desc">Movies Rated</span>
                </div>
                <div className="insight-stat">
                  <span className="stat-num">{insights.interaction_count || 0}</span>
                  <span className="stat-desc">Interactions</span>
                </div>
                <div className="insight-stat">
                  <span className="stat-num">{insights.profile_age_days || 0}d</span>
                  <span className="stat-desc">Profile Age</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-taste-banner">
              <p>You haven&apos;t calibrated your taste yet.</p>
              <button onClick={handleRecalibrate} className="profile-action-btn primary">
                Calibrate Now →
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-section">
          <h2>Actions</h2>
          <div className="profile-actions">
            {hasTasteVector && (
              <>
                <button
                  className="profile-action-btn secondary"
                  onClick={() => setShowRecalibrate(true)}
                >
                  🔄 Recalibrate Taste
                </button>

                {showRecalibrate && (
                  <div className="recalibrate-confirm">
                    <p>This will replace your current taste profile. Continue?</p>
                    <div className="confirm-actions">
                      <button onClick={handleRecalibrate}>Yes, Recalibrate</button>
                      <button onClick={() => setShowRecalibrate(false)} className="cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <button className="profile-action-btn secondary" onClick={handleClearCache}>
              🗑️ Clear Recommendation Cache
            </button>
            {cacheCleared && (
              <span className="cache-toast">✅ Cache cleared! Fresh recommendations await.</span>
            )}

            <button className="profile-action-btn danger" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        <button className="profile-back-btn" onClick={() => navigate('/')}>
          ← Back to Movies
        </button>
      </div>
    </div>
  )
}
