import { useEffect, useRef } from 'react'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'
import gsap from 'gsap'

export default function MoodAtmosphere() {
  const { currentMood } = useCinemiesStore()
  const iframeRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    const clip = MOOD_CONFIG[currentMood]?.atmosphereClip
    if (!clip || !containerRef.current) return

    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        if (iframeRef.current) {
          iframeRef.current.src = `https://www.youtube.com/embed/${clip.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${clip.youtubeId}&controls=0&start=${clip.startAt}&modestbranding=1`
        }
        gsap.to(containerRef.current, { opacity: 1, duration: 1.2, delay: 0.3 })
      }
    })
  }, [currentMood])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.07,
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
        title="Mood atmosphere"
        style={{
          width: '177.78vh',
          height: '100vh',
          minWidth: '100vw',
          minHeight: '56.25vw',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: 'none',
          pointerEvents: 'none',
        }}
        allow="autoplay"
      />
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        fontFamily: 'monospace',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.1em',
      }}>
        {MOOD_CONFIG[currentMood]?.atmosphereClip?.creditTitle}
      </div>
    </div>
  )
}
