import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useModelStore } from '@/store/modelStore';
import { buildExtrusionGeometry, polygonToFlatGeometry } from '@/lib/geometry';
import { basisFromNormalPoint } from '@/lib/sketch';

export default function SketchExtrudeGizmo() {
  const activeProfile = useModelStore((s) => s.activeProfile);
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const sketchDistance = useModelStore((s) => s.sketchDistance);
  const sketchDirection = useModelStore((s) => s.sketchDirection);
  const sketchOpMode = useModelStore((s) => s.sketchOpMode);
  const setSketchDistance = useModelStore((s) => s.setSketchDistance);
  const setSketchDirection = useModelStore((s) => s.setSketchDirection);
  const commitSketchOp = useModelStore((s) => s.commitSketchOp);

  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const raycaster = useThree((s) => s.raycaster);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
    enabled: boolean;
  } | null;

  const [dragging, setDragging] = useState(false);
  const didDragRef = useRef(false);

  const normal = useMemo(
    () => (activeProfile ? new THREE.Vector3(...activeProfile.normal).normalize() : null),
    [activeProfile],
  );
  const origin = useMemo(
    () => (activeProfile ? new THREE.Vector3(...activeProfile.origin) : null),
    [activeProfile],
  );
  const polygon = useMemo(
    () => (activeProfile ? activeProfile.polygon.map((p) => new THREE.Vector3(...p)) : null),
    [activeProfile],
  );

  const dirSign = sketchDirection === 'forward' ? 1 : -1;
  const signedDistance = dirSign * Math.abs(sketchDistance);

  const prism = useMemo(
    () => (polygon && normal ? buildExtrusionGeometry(polygon, normal, signedDistance) : null),
    [polygon, normal, signedDistance],
  );

  const arrowQuat = useMemo(() => {
    if (!normal) return new THREE.Quaternion();
    const axis = normal.clone().multiplyScalar(dirSign);
    if (axis.lengthSq() < 1e-9) axis.copy(normal);
    axis.normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  }, [normal, dirSign]);

  const profileFlat = useMemo(
    () => (polygon && normal ? polygonToFlatGeometry(polygon, normal, 0.02) : null),
    [polygon, normal],
  );
  const profileOutline = useMemo(
    () => (polygon ? new THREE.BufferGeometry().setFromPoints(polygon) : null),
    [polygon],
  );

  // 进入拉伸时，将相机摆到斜向视角，方便看清与拖拽箭头
  useEffect(() => {
    if (!activeProfile || !normal || !origin || !controls) return;
    const fb = basisFromNormalPoint(normal, origin);
    const dir = normal
      .clone()
      .multiplyScalar(0.6)
      .addScaledVector(fb.u, 0.75)
      .addScaledVector(fb.v, 0.45)
      .normalize();
    camera.position.copy(origin).addScaledVector(dir, 14);
    camera.up.set(0, 1, 0);
    camera.lookAt(origin);
    controls.target.copy(origin);
    controls.update();
  }, [activeProfile, normal, origin, camera, controls]);

  useEffect(() => {
    if (!dragging || !normal || !origin) return;

    // 拖拽平面：包含拉伸轴线、并朝向相机，从而把鼠标位移映射到轴线上
    const toCam = camera.position.clone().sub(origin);
    toCam.addScaledVector(normal, -toCam.dot(normal));
    if (toCam.lengthSq() < 1e-8) {
      toCam.crossVectors(normal, new THREE.Vector3(1, 0, 0));
      if (toCam.lengthSq() < 1e-8) toCam.crossVectors(normal, new THREE.Vector3(0, 1, 0));
    }
    toCam.normalize();
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, origin);

    const onMove = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane, hit)) {
        didDragRef.current = true;
        const d = hit.clone().sub(origin).dot(normal);
        setSketchDistance(d);
        setSketchDirection(d >= 0 ? 'forward' : 'backward');
      }
    };
    const onUp = () => {
      setDragging(false);
      if (didDragRef.current) commitSketchOp();
    };

    if (controls) controls.enabled = false;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (controls) controls.enabled = true;
    };
  }, [dragging, normal, origin, gl, raycaster, camera, controls, setSketchDistance, setSketchDirection, commitSketchOp]);

  if (!activeProfile || !normal || !origin || !polygon || isSketchMode) return null;

  const color = sketchOpMode === 'extrude' ? '#35d0c0' : '#ff5470';
  const len = Math.max(0.2, sketchDistance);

  const startDrag = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    didDragRef.current = false;
    setDragging(true);
  };
  const hover = () => {
    document.body.style.cursor = 'grabbing';
  };
  const unhover = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <group renderOrder={999}>
      {profileFlat && (
        <mesh geometry={profileFlat}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}
      {profileOutline && (
        <lineLoop geometry={profileOutline}>
          <lineBasicMaterial color={color} transparent opacity={0.95} depthTest={false} />
        </lineLoop>
      )}

      {prism && (
        <mesh geometry={prism}>
          <meshBasicMaterial color={color} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      <group position={origin.toArray()} quaternion={arrowQuat}>
        <mesh position={[0, len / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, len, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, len, 0]} onPointerDown={startDrag} onPointerOver={hover} onPointerOut={unhover}>
          <coneGeometry args={[0.2, 0.5, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, len, 0]} onPointerDown={startDrag} onPointerOver={hover} onPointerOut={unhover}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}