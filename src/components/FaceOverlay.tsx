import * as THREE from 'three';
import { useMemo } from 'react';
import type { FaceSelection } from '@/store/modelStore';
import { polygonToFlatGeometry } from '@/lib/geometry';

export default function FaceOverlay({ selection }: { selection: FaceSelection }) {
  const geometry = useMemo(() => {
    const polygon = selection.polygon.map((p) => new THREE.Vector3(...p));
    const normal = new THREE.Vector3(...selection.normal);
    return polygonToFlatGeometry(polygon, normal, 0.01);
  }, [selection]);

  const outline = useMemo(() => {
    const normal = new THREE.Vector3(...selection.normal).normalize();
    const pts = selection.polygon.map((p) =>
      new THREE.Vector3(...p).addScaledVector(normal, 0.012),
    );
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [selection]);

  if (!geometry) return null;

  return (
    <group renderOrder={999}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#ff8a3d"
          transparent
          opacity={0.42}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <lineLoop geometry={outline}>
        <lineBasicMaterial color="#ffc08a" transparent opacity={0.95} depthTest={false} />
      </lineLoop>
    </group>
  );
}
