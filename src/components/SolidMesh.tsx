import type { MutableRefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Solid, FaceSelection } from '@/store/modelStore';
import { extractFace } from '@/lib/geometry';

interface Props {
  solid: Solid;
  onSelect: (face: FaceSelection) => void;
  pointerDownRef: MutableRefObject<{ x: number; y: number } | null>;
  interactive?: boolean;
}

export default function SolidMesh({ solid, onSelect, pointerDownRef, interactive = true }: Props) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const down = pointerDownRef.current;
    if (down) {
      const dx = e.nativeEvent.clientX - down.x;
      const dy = e.nativeEvent.clientY - down.y;
      if (Math.hypot(dx, dy) > 5) return;
    }

    const triIndex = e.faceIndex ?? 0;
    const face = extractFace(solid.geometry, triIndex);
    if (!face) return;

    onSelect({
      solidId: solid.id,
      triIndex,
      normal: face.normal.toArray() as [number, number, number],
      point: face.point.toArray() as [number, number, number],
      polygon: face.polygon.map((p) => p.toArray() as [number, number, number]),
    });
  };

  return (
    <mesh
      geometry={solid.geometry}
      onClick={interactive ? handleClick : undefined}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              document.body.style.cursor = 'default';
            }
          : undefined
      }
    >
      <meshStandardMaterial color="#52627a" roughness={0.5} metalness={0.32} />
    </mesh>
  );
}
