import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'

export default function ParticleField({ count = 800 }) {
  const pointsRef = useRef()
  const { currentMood } = useCinemiesStore()

  const { positions, sizes, baseOpacities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const baseOpacities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Spread particles in a large sphere
      const r = 8 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      sizes[i] = 0.02 + Math.random() * 0.06
      baseOpacities[i] = 0.3 + Math.random() * 0.7
    }

    return { positions, sizes, baseOpacities }
  }, [count])

  const targetColor = useRef(new THREE.Color(MOOD_CONFIG.mind_bending.colors.primary))

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const cfg = MOOD_CONFIG[currentMood]
    if (cfg) {
      targetColor.current.set(cfg.colors.primary)
      pointsRef.current.material.color.lerp(targetColor.current, delta * 1.5)
      pointsRef.current.material.opacity += (cfg.particleOpacity - pointsRef.current.material.opacity) * delta * 2
    }

    // Gentle rotation
    pointsRef.current.rotation.y += delta * 0.015
    pointsRef.current.rotation.x += delta * 0.005

    // Twinkle effect via time
    const time = state.clock.elapsedTime
    const posArr = pointsRef.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += Math.sin(time * 0.3 + i * 0.1) * 0.0008
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#a78bfa"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
