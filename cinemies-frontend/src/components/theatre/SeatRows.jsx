import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

export default function SeatRows() {
  const meshRef = useRef()
  const rows = 12
  const seatsPerRow = 20
  const total = rows * seatsPerRow

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!meshRef.current) return

    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        dummy.position.set(
          (s - seatsPerRow / 2) * 0.55,
          r * 0.18 - 1.5,
          r * 0.7 + 1
        )
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(idx, dummy.matrix)
        idx++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[null, null, total]} frustumCulled={false}>
      <boxGeometry args={[0.4, 0.5, 0.4]} />
      <meshStandardMaterial color="#0a0a14" roughness={1} metalness={0} />
    </instancedMesh>
  )
}
