import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Float } from '@react-three/drei'

export default function FloatingFragments({ count = 12 }) {
  const groupRef = useRef()

  const fragments = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 16 - 5,
      ],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ],
      scale: 0.3 + Math.random() * 0.8,
      speed: 0.1 + Math.random() * 0.3,
      floatIntensity: 0.5 + Math.random() * 1.5,
    }))
  }, [count])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.008
  })

  return (
    <group ref={groupRef}>
      {fragments.map((frag, i) => (
        <Float
          key={i}
          speed={frag.speed}
          rotationIntensity={0.3}
          floatIntensity={frag.floatIntensity}
          floatingRange={[-0.2, 0.2]}
        >
          <mesh
            position={frag.position}
            rotation={frag.rotation}
            scale={frag.scale}
          >
            <planeGeometry args={[0.8, 1.2]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.03 + Math.random() * 0.04}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}
