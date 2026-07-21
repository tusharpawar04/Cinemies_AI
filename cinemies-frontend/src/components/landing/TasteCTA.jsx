import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useAuthStore } from '../../store/useAuthStore'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG, MOOD_KEYS } from '../../data/moodConfig'

gsap.registerPlugin(ScrollTrigger)

export default function TasteCTA() {
  const { entryComplete } = useCinemiesStore()
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const sectionRef = useRef()

  useEffect(() => {
    if (!entryComplete || !sectionRef.current) return

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: sectionRef.current,
        start: 'top 75%',
      }

      gsap.from('.taste-cta-icon', {
        scrollTrigger: trigger,
        opacity: 0, scale: 0.5, duration: 0.6,
        ease: 'back.out(2)',
      })

      gsap.from('.taste-cta-title', {
        scrollTrigger: { ...trigger, start: 'top 70%' },
        opacity: 0, y: 25, duration: 0.7,
      })

      gsap.from('.taste-cta-desc', {
        scrollTrigger: { ...trigger, start: 'top 68%' },
        opacity: 0, y: 20, duration: 0.6,
      })

      gsap.from('.taste-mood-chip', {
        scrollTrigger: { ...trigger, start: 'top 65%' },
        opacity: 0, y: 15, scale: 0.9,
        duration: 0.5, stagger: 0.06,
        ease: 'back.out(1.3)',
      })

      gsap.from('.taste-cta-button', {
        scrollTrigger: { ...trigger, start: 'top 60%' },
        opacity: 0, y: 20, scale: 0.95,
        duration: 0.6, ease: 'back.out(1.5)',
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [entryComplete])

  if (!entryComplete) return null

  const hasCompletedCalibration = user?.profile?.tasteProfileGenerated

  const handleCTAClick = () => {
    if (isAuthenticated && hasCompletedCalibration) {
      const el = document.getElementById('moods')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else if (isAuthenticated) {
      navigate('/taste-calibration')
    } else {
      navigate('/register')
    }
  }

  const ctaText = isAuthenticated && hasCompletedCalibration
    ? 'Choose Your Mood'
    : 'Curate Your Taste'

  return (
    <section ref={sectionRef} id="taste-cta" className="taste-cta-section">
      {/* Round floating decorations */}
      <div className="taste-floater taste-floater--1" />
      <div className="taste-floater taste-floater--2" />
      <div className="taste-floater taste-floater--3" />

      <div className="taste-cta-icon">🎬</div>

      <h2 className="taste-cta-title">
        Discover <em>Your Cinema</em>
      </h2>

      <p className="taste-cta-desc">
        From Hollywood blockbusters to Bollywood classics — explore movies that match your unique taste.
      </p>

      {/* Removed mood chips from starting animation - they'll see moods after scrolling */}

      <button className="taste-cta-button" onClick={handleCTAClick}>
        {ctaText}
        <span className="cta-arrow">→</span>
      </button>
    </section>
  )
}
