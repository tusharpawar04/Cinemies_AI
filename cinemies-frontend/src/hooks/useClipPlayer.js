import { useState, useEffect, useRef } from 'react'

export function useClipPlayer(clipIds, intervalMs = 2000) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!clipIds?.length) return

    timerRef.current = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % clipIds.length)
        setIsTransitioning(false)
      }, 400)
    }, intervalMs)

    return () => clearInterval(timerRef.current)
  }, [clipIds, intervalMs])

  return {
    currentClipId: clipIds?.[currentIndex],
    currentIndex,
    isTransitioning,
    stop: () => clearInterval(timerRef.current),
  }
}
