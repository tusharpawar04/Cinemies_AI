import {
  EffectComposer,
  Noise,
  ChromaticAberration,
  Vignette,
  Bloom
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

export default function PostFX() {
  return (
    <EffectComposer>
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.035}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.0006, 0.0006)}
      />
      <Vignette
        eskil={false}
        offset={0.3}
        darkness={0.75}
      />
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.025}
        height={300}
        intensity={0.25}
      />
    </EffectComposer>
  )
}
