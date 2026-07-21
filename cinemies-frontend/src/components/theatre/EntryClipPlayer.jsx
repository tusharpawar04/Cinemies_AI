import { Html } from '@react-three/drei'

export default function EntryClipPlayer({ youtubeId, isTransitioning }) {
  if (!youtubeId) return null

  return (
    <Html
      transform
      position={[0, 0, -3.8]}
      scale={[1.2, 1.2, 1]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        width: '854px',
        height: '360px',
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.4s ease',
        overflow: 'hidden',
        borderRadius: '2px',
      }}>
        <iframe
          key={youtubeId}
          width="854"
          height="480"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&start=20&modestbranding=1&rel=0`}
          allow="autoplay"
          style={{
            border: 'none',
            transform: 'translateY(-60px)',
            pointerEvents: 'none',
          }}
          title="Entry clip"
        />
      </div>
    </Html>
  )
}
