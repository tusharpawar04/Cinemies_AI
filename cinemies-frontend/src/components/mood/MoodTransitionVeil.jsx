import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'

export default function MoodTransitionVeil() {
  const { currentMood } = useCinemiesStore()
  const veilRef = useRef()
  const isFirstRef = useRef(true)

  useEffect(() => {
    // Skip first mount
    if (isFirstRef.current) { isFirstRef.current = false; return }
    if (!veilRef.current) return

    const color = MOOD_CONFIG[currentMood]?.colors?.primary || '#a78bfa'

    gsap.timeline()
      .to(veilRef.current, {
        opacity: 0.35,
        backgroundColor: color,
        duration: 0.12,
        ease: 'none',
      })
      .to(veilRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      })
  }, [currentMood])

  return (
    <div
      ref={veilRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
        opacity: 0,
        backgroundColor: 'transparent',
      }}
    />
  )
}
