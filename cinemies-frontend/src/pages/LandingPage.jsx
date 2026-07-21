import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCinemiesStore } from '../store/useCinemiesStore'
import { useMoodTransition } from '../hooks/useMoodTransition'

// Components
import SceneRoot from '../components/canvas/SceneRoot'
import Navbar from '../components/ui/Navbar'
import LoadingCurtain from '../components/ui/LoadingCurtain'
import MoodTransitionVeil from '../components/mood/MoodTransitionVeil'
import MoodSelector from '../components/mood/MoodSelector'
import InfiniteMovieFeed from '../components/movies/InfiniteMovieFeed'
import AboutSection from '../components/credits/AboutSection'
import CreditsRoll from '../components/credits/CreditsRoll'
import MovieDetailModal from '../components/movies/MovieDetailModal'

// Landing sections
import LandingHero from '../components/landing/LandingHero'
import ParallaxShowcase from '../components/landing/ParallaxShowcase'
import TasteCTA from '../components/landing/TasteCTA'

// Styles
import '../styles/landing.css'

gsap.registerPlugin(ScrollTrigger)

function ScrollAnimations() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.section-title').forEach(el => {
        if (el.closest('.parallax-showcase') || el.closest('.taste-cta-section')) return

        gsap.from(el, {
          clipPath: 'inset(100% 0 0 0)',
          y: 30, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        })
      })

      gsap.from('.mood-card', {
        y: 60, opacity: 0, duration: 0.7,
        stagger: 0.1, ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '#moods', start: 'top 70%' }
      })
    })
    return () => ctx.revert()
  }, [])

  return null
}

export default function LandingPage() {
  useMoodTransition()

  return (
    <>
      <LoadingCurtain />
      <SceneRoot />
      <MoodTransitionVeil />

      <div className="content-layer">
        <Navbar />
        <LandingHero />
        <ParallaxShowcase />
        <TasteCTA />
        <div className="section-divider" />
        <MoodSelector />
        <InfiniteMovieFeed />
        <AboutSection />
        <CreditsRoll />
      </div>

      <ScrollAnimations />
      <MovieDetailModal />
    </>
  )
}
