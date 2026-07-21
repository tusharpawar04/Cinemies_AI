import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useCinemiesStore } from '../store/useCinemiesStore'
import { MOOD_CONFIG } from '../data/moodConfig'

export function useMoodTransition() {
  const { currentMood } = useCinemiesStore()
  const prevMoodRef = useRef(currentMood)

  const applyCSSVariables = useCallback((mood) => {
    const cfg = MOOD_CONFIG[mood]
    if (!cfg) return
    const root = document.documentElement
    root.style.setProperty('--mood-primary', cfg.colors.primary)
    root.style.setProperty('--mood-secondary', cfg.colors.secondary)
    root.style.setProperty('--mood-accent', cfg.colors.accent)
    root.style.setProperty('--mood-glow', cfg.colors.glow)
  }, [])

  useEffect(() => {
    if (prevMoodRef.current !== currentMood) {
      applyCSSVariables(currentMood)
      prevMoodRef.current = currentMood

      if (import.meta.env.VITE_LOG_MOOD_TRANSITIONS === 'true') {
        console.log(`[Mood] → ${currentMood}`)
      }
    }
  }, [currentMood, applyCSSVariables])

  // Apply on mount
  useEffect(() => {
    applyCSSVariables(currentMood)
  }, [])

  return { currentMood, config: MOOD_CONFIG[currentMood] }
}
