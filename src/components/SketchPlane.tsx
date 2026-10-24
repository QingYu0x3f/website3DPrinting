import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useModelStore } from '@/store/modelStore';
import { basisFromState } from '@/lib/sketch';
import { snapSketchPoint } from '@/lib/snap';

const SIZE = 40;
const VIEW_DISTANCE = 14;
const GRID_STEP = 1;

export default function SketchPlane() {
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const sketchBasis = useModelStore((s) => s.sketchBasis);
  const snapEnabled = useModelStore((s) => s.snapEnabled);
  const solids = useModelStore((s) => s.solids);
  const addSketchPoint = useModelStore((s) => s.addSketchPoint);
  const setSketchCursor = useModelStore((s) => s.setSketchCursor);

  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;

  const basis = useMemo(() => basisFromState(sketchBasis), [sketchBasis]);

  const quaternion = useMemo(() => {
    const m = new THREE.Matrix4().makeBasis(basis.u, basis.v, basis.normal);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [basis]);

  useEffect(() => {
    if (!isSketchMode || !controls) return;
    camera.position.copy(basis.origin).addScaledVector(basis.normal, VIEW_DISTANCE);
    camera.up.copy(basis.v);
    camera.lookAt(basis.origin);
    controls.target.copy(basis.origin);
    controls.update();
  }, [isSketchMode, basis, camera, controls]);

  if (!isSketchMode) return null;

  const snap = (p: THREE.Vector3) => {
    if (!snapEnabled) return p.clone();
    return snapSketchPoint(p, basis, solids.map((s) => s.geometry), GRID_STEP).point;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5) return;
    const p = snap(new THREE.Vector3(e.point.x, e.point.y, e.point.z));
    addSketchPoint([p.x, p.y, p.z]);
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = snap(new THREE.Vector3(e.point.x, e.point.y, e.point.z));
    setSketchCursor([p.x, p.y, p.z]);
  };

  return (
    <group position={basis.origin.toArray()} quaternion={quaternion}>
      <mesh onClick={handleClick} onPointerMove={handleMove} onPointerOut={() => setSketchCursor(null)}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshBasicMaterial color="#35d0c0" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <gridHelper args={[SIZE, SIZE, '#2f8f86', '#1c232e']} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}