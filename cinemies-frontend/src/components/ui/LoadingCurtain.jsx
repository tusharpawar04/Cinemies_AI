import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useCinemiesStore } from '../../store/useCinemiesStore'

const MOVIE_SCENES = [
  { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800', title: 'Inception' },
  { url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800', title: 'Cinema' },
  { url: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800', title: 'Film' },
]

export default function LoadingCurtain() {
  const curtainRef = useRef()
  const barRef = useRef()
  const logoRef = useRef()
  const sceneRef = useRef()
  const [visible, setVisible] = useState(true)
  const [currentScene, setCurrentScene] = useState(0)

  useEffect(() => {
    // Subtle scene transitions
    const sceneInterval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % MOVIE_SCENES.length)
    }, 2000)

    // Animate loading bar smoothly
    gsap.to(barRef.current, { 
      width: '100%', 
      duration: 2.5, 
      ease: 'power1.inOut' 
    })

    // Fade in logo with subtle scale
    gsap.fromTo(logoRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, ease: 'power2.out' }
    )

    return () => clearInterval(sceneInterval)
  }, [])

  useEffect(() => {
    if (!visible) return
    
    // Smoother, longer curtain lift
    const timer = setTimeout(() => {
      gsap.to(curtainRef.current, {
        opacity: 0,
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: () => setVisible(false),
      })
    }, 2800)
    
    return () => clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    // Smooth scene crossfade
    if (sceneRef.current) {
      gsap.fromTo(sceneRef.current,
        { opacity: 0 },
        { opacity: 0.15, duration: 1.2, ease: 'power2.inOut' }
      )
    }
  }, [currentScene])

  if (!visible) return null

  return (
    <div ref={curtainRef} className="loading-curtain">
      {/* Background movie scenes with subtle transitions */}
      <div 
        ref={sceneRef}
        className="curtain-scene"
        style={{
          backgroundImage: `url(${MOVIE_SCENES[currentScene].url})`,
        }}
      />
      
      <div className="curtain-content">
        <div ref={logoRef} className="curtain-logo">CINEMIES</div>
        <div className="curtain-tagline">Your Mood. Your Movies.</div>
        <div className="curtain-bar">
          <div ref={barRef} className="curtain-bar-fill" />
        </div>
      </div>
    </div>
  )
}
