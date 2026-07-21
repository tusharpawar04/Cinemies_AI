import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import '../styles/auth.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordStrength = () => {
    const p = form.password
    if (p.length < 8) return { level: 0, label: '' }
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
    return { level: score, label: labels[score] }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    // Backend password requirements validation
    if (!/[A-Z]/.test(form.password)) {
      setLocalError('Password must contain at least one uppercase letter')
      return
    }
    if (!/[a-z]/.test(form.password)) {
      setLocalError('Password must contain at least one lowercase letter')
      return
    }
    if (!/[0-9]/.test(form.password)) {
      setLocalError('Password must contain at least one number')
      return
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
      setLocalError('Password must contain at least one special character (!@#$%^&*...)')
      return
    }

    const result = await register({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
    })

    if (result.success) {
      navigate('/taste-calibration')
    }
  }

  const strength = passwordStrength()

  return (
    <div className="auth-page">
      <div className="auth-ambient" />
      <div className="auth-card auth-card--register">
        <div className="auth-header">
          <h1 className="auth-logo">CINEMIES</h1>
          <p className="auth-subtitle">Join the cinematic experience</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {(error || localError) && (
            <div className="auth-error">{error || localError}</div>
          )}

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                placeholder="John"
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, uppercase, number, special char"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {form.password.length > 0 && (
              <>
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div
                      className={`password-strength-fill strength-${strength.level}`}
                      style={{ width: `${strength.level * 25}%` }}
                    />
                  </div>
                  <span className={`strength-label strength-${strength.level}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="password-requirements">
                  <div className={/[A-Z]/.test(form.password) ? 'req-met' : 'req-unmet'}>
                    {/[A-Z]/.test(form.password) ? '✓' : '○'} Uppercase letter
                  </div>
                  <div className={/[a-z]/.test(form.password) ? 'req-met' : 'req-unmet'}>
                    {/[a-z]/.test(form.password) ? '✓' : '○'} Lowercase letter
                  </div>
                  <div className={/[0-9]/.test(form.password) ? 'req-met' : 'req-unmet'}>
                    {/[0-9]/.test(form.password) ? '✓' : '○'} Number
                  </div>
                  <div className={/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? 'req-met' : 'req-unmet'}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? '✓' : '○'} Special character
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? <span className="auth-btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
