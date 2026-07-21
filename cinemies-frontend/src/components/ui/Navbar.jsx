import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { useAuthStore } from '../../store/useAuthStore'
import MoodPill from './MoodPill'

export default function Navbar() {
  const { entryComplete } = useCinemiesStore()
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show navbar logo only after scrolling past the hero section (~700px)
      setIsScrolled(window.scrollY > 700)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className={`navbar ${!entryComplete ? 'hidden' : ''} ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className={`navbar-logo ${isScrolled ? 'navbar-logo-visible' : ''}`}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>CINEMIES</Link>
      </div>
      <div className="navbar-right">
        <MoodPill />
        {isAuthenticated ? (
          <div className="navbar-user">
            <Link to="/profile" className="navbar-avatar" title="Profile">
              {user?.firstName?.[0] || user?.email?.[0] || '?'}
            </Link>
          </div>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="navbar-login">Sign in</Link>
          </div>
        )}
      </div>
    </nav>
  )
}

