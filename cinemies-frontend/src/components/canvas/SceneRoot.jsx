import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import IMAXEntry from '../theatre/IMAXEntry'
import TheatreScreen from '../theatre/TheatreScreen'
import SeatRows from '../theatre/SeatRows'
import EntryClipPlayer from '../theatre/EntryClipPlayer'
import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'
import { ENTRY_SEQUENCE_CLIP_IDS } from '../../data/topImdbMovies'
import { useClipPlayer } from '../../hooks/useClipPlayer'

function FogController() {
  const { scene } = useThree()
  const { currentMood } = useCinemiesStore()
  const targetFogColor = useRef(new THREE.Color(0x110820))

  useFrame((_, delta) => {
    const cfg = MOOD_CONFIG[currentMood]
    if (!cfg || !scene.fog) return
    targetFogColor.current.set(cfg.colors.fog)
    scene.fog.color.lerp(targetFogColor.current, delta * 1.5)
    scene.fog.density += (cfg.fogDensity - scene.fog.density) * delta * 2
  })

  return null
}

function TheatreGroup() {
  const { entryComplete } = useCinemiesStore()
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (entryComplete && groupRef.current) {
      groupRef.current.visible = groupRef.current.material
        ? groupRef.current.material.opacity > 0.01
        : true
    }
  })

  // Don't render theatre or video clips - causing "video unavailable" errors
  if (entryComplete) return null

  return (
    <group ref={groupRef}>
      <TheatreScreen />
      <SeatRows />
      {/* EntryClipPlayer removed - YouTube embeds causing errors */}
    </group>
  )
}

function SubtleScene() {
  const { entryComplete } = useCinemiesStore()
  if (!entryComplete) return null

  return (
    <>
      {/* Just stars — lightweight, subtle, beautiful */}
      <Stars
        radius={60}
        depth={50}
        count={600}
        factor={2.5}
        saturation={0.1}
        fade
        speed={0.3}
      />
    </>
  )
}

export default function SceneRoot() {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 2, 28], fov: 55, near: 0.1, far: 200 }}
        dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.8,
          powerPreference: 'high-performance',
        }}
        onCreated={({ scene }) => {
          scene.fog = new THREE.FogExp2(0x110820, 0.018)
          scene.background = new THREE.Color(0x030305)
        }}
      >
        <ambientLight intensity={0.12} />
        <pointLight position={[0, 5, 0]} intensity={0.2} color="#a78bfa" />

        <FogController />

        <Suspense fallback={null}>
          <IMAXEntry />
          <TheatreGroup />
          <SubtleScene />
          {/* No PostFX — saves 4 GPU passes per frame */}
        </Suspense>
      </Canvas>
    </div>
  )
}
