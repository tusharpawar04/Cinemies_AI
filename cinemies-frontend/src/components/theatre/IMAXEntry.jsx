import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useCinemiesStore } from '../../store/useCinemiesStore'

export default function IMAXEntry() {
  const { camera } = useThree()
  const { setEntryComplete, entryComplete } = useCinemiesStore()

  useEffect(() => {
    if (entryComplete) return

    camera.position.set(0, 2, 28)
    camera.lookAt(0, 0, 0)

    const tl = gsap.timeline({
      onComplete: () => {
        setEntryComplete(true)
        // Subtle final camera position - less dramatic
        gsap.to(camera.position, {
          x: 0, y: 0.5, z: 8,
          duration: 3,
          ease: 'power2.inOut'
        })
      }
    })

    // More subtle, smooth approach - like floating into a dream
    tl.to(camera.position, { 
      z: 22, 
      y: 1.8, 
      duration: 2, 
      ease: 'power1.inOut' 
    })
    
    tl.to(camera.position, { 
      z: 15, 
      y: 1.2, 
      duration: 1.8, 
      ease: 'power1.inOut' 
    })
    
    tl.to(camera.position, { 
      z: 10, 
      y: 0.8, 
      duration: 1.5, 
      ease: 'power1.out' 
    })

    return () => tl.kill()
  }, [])

  return null
}
