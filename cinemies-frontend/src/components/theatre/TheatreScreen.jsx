import { useRef } from 'react'
import * as THREE from 'three'

export default function TheatreScreen() {
  const meshRef = useRef()

  return (
    <group position={[0, 0, -4]}>
      {/* Curved IMAX screen */}
      <mesh ref={meshRef} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[12, 12, 5, 64, 1, true, -0.4, 0.8]} />
        <meshBasicMaterial color="#111118" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Screen glow halo */}
      <mesh position={[0, 0, 0.3]}>
        <planeGeometry args={[14, 6]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.025}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ambient screen light */}
      <pointLight position={[0, 0, 1]} intensity={0.5} color="#8b7fcc" distance={8} decay={2} />
    </group>
  )
}
