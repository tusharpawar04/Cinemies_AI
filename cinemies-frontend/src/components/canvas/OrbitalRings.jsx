import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'

export default function OrbitalRings() {
  const ring1 = useRef()
  const ring2 = useRef()
  const ring3 = useRef()
  const { currentMood } = useCinemiesStore()
  const targetColor = useRef(new THREE.Color('#a78bfa'))

  useFrame((state, delta) => {
    const cfg = MOOD_CONFIG[currentMood]
    if (cfg) targetColor.current.set(cfg.colors.primary)

    if (ring1.current) {
      ring1.current.rotation.z += delta * 0.08
      ring1.current.rotation.x += delta * 0.02
      ring1.current.material.color.lerp(targetColor.current, delta * 1.2)
    }
    if (ring2.current) {
      ring2.current.rotation.z -= delta * 0.06
      ring2.current.rotation.y += delta * 0.03
      ring2.current.material.color.lerp(targetColor.current, delta * 1.2)
    }
    if (ring3.current) {
      ring3.current.rotation.x += delta * 0.04
      ring3.current.rotation.z += delta * 0.1
      ring3.current.material.color.lerp(targetColor.current, delta * 1.2)
    }
  })

  const ringMaterial = { transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }

  return (
    <group>
      <mesh ref={ring1} rotation={[0.5, 0, 0]}>
        <torusGeometry args={[6, 0.015, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" {...ringMaterial} />
      </mesh>
      <mesh ref={ring2} rotation={[1.2, 0.5, 0]}>
        <torusGeometry args={[8, 0.01, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" {...ringMaterial} opacity={0.08} />
      </mesh>
      <mesh ref={ring3} rotation={[0.3, 1, 0.7]}>
        <torusGeometry args={[10, 0.008, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" {...ringMaterial} opacity={0.05} />
      </mesh>
    </group>
  )
}
