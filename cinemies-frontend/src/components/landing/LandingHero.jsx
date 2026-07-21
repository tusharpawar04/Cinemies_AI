import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useAuthStore } from '../../store/useAuthStore'
import { useCinemiesStore } from '../../store/useCinemiesStore'

export default function LandingHero() {
  const { entryComplete } = useCinemiesStore()
  const { isAuthenticated } = useAuthStore()
  const containerRef = useRef()
  const titleRef = useRef()
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!entryComplete || hasAnimated.current) return
    hasAnimated.current = true

    // Split title into letter spans
    if (titleRef.current) {
      const text = titleRef.current.textContent
      titleRef.current.innerHTML = text
        .split('')
        .map(ch => `<span class="letter">${ch}</span>`)
        .join('')
    }

    // Simple, fast timeline
    const tl = gsap.timeline({ delay: 0.3 })

    tl.to('.hero-orb', { opacity: 1, duration: 1.5, stagger: 0.2 })

    tl.to('.hero-eyebrow-text', {
      opacity: 1, y: 0, duration: 0.5,
    }, 0.2)

    tl.fromTo('.hero-title-main .letter', {
      y: 60, opacity: 0, rotateX: -90,
    }, {
      y: 0, opacity: 1, rotateX: 0,
      duration: 0.7, stagger: 0.04,
      ease: 'back.out(1.4)',
    }, 0.4)

    tl.to('.hero-subtitle-text', {
      opacity: 1, y: 0, duration: 0.5,
    }, '-=0.3')

    tl.to('.hero-cta-group', {
      opacity: 1, y: 0, duration: 0.5,
    }, '-=0.2')

    tl.to('.hero-auth-links', { opacity: 1, duration: 0.4 }, '-=0.1')
    tl.to('.hero-scroll-indicator', { opacity: 1, duration: 0.6 }, '-=0.1')

    return () => tl.kill()
  }, [entryComplete])

  if (!entryComplete) return null

  const handleScrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section ref={containerRef} className="landing-hero">
      <div className="hero-orb hero-orb--1" style={{ opacity: 0 }} />
      <div className="hero-orb hero-orb--2" style={{ opacity: 0 }} />
      <div className="hero-orb hero-orb--3" style={{ opacity: 0 }} />

      <div className="hero-content">
        <span className="hero-eyebrow-text" style={{ transform: 'translateY(20px)' }}>
          MOOD-FIRST CINEMA
        </span>

        <h1 ref={titleRef} className="hero-title-main">
          CINEMIES
        </h1>

        <p className="hero-subtitle-text" style={{ transform: 'translateY(15px)' }}>
          You know how you feel. We know what to watch.
          Discover movies from Hollywood, Bollywood & Tollywood — matched to your mood.
        </p>

        <div className="hero-cta-group" style={{ transform: 'translateY(15px)' }}>
          <button className="hero-cta-primary" onClick={() => handleScrollTo('moods')}>
            Explore Moods
            <span style={{ fontSize: '1.1em' }}>↓</span>
          </button>
          {!isAuthenticated && (
            <Link to="/register" className="hero-cta-secondary">
              Create Account
            </Link>
          )}
        </div>

        {!isAuthenticated && (
          <div className="hero-auth-links">
            <Link to="/login" className="hero-auth-link">Sign In</Link>
            <div className="hero-auth-divider" />
            <Link to="/register" className="hero-auth-link">Create Account</Link>
          </div>
        )}
      </div>

      <div className="hero-scroll-indicator">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  )
}
