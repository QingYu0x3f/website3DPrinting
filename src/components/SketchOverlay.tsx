import * as THREE from 'three';
import { useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import { basisFromState, buildProfilePolygon } from '@/lib/sketch';
import { polygonToFlatGeometry } from '@/lib/geometry';

interface LineLoopProps {
  points: THREE.Vector3[];
  color: string;
  opacity?: number;
}

function LineLoop({ points, color, opacity = 0.95 }: LineLoopProps) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
    </lineLoop>
  );
}

interface FillProps {
  polygon: THREE.Vector3[];
  normal: THREE.Vector3;
  color: string;
  opacity: number;
}

function Fill({ polygon, normal, color, opacity }: FillProps) {
  const geometry = useMemo(
    () => polygonToFlatGeometry(polygon, normal, 0.012),
    [polygon, normal],
  );
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

export default function SketchOverlay() {
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const sketchBasis = useModelStore((s) => s.sketchBasis);
  const sketchTool = useModelStore((s) => s.sketchTool);
  const sketchDraft = useModelStore((s) => s.sketchDraft);
  const sketchCursor = useModelStore((s) => s.sketchCursor);
  const snapEnabled = useModelStore((s) => s.snapEnabled);

  const basis = useMemo(() => basisFromState(sketchBasis), [sketchBasis]);
  const draftPts = useMemo(() => sketchDraft.map((p) => new THREE.Vector3(...p)), [sketchDraft]);
  const cursorPt = useMemo(() => (sketchCursor ? new THREE.Vector3(...sketchCursor) : null), [sketchCursor]);

  // 闭合预览（矩形/圆在 1 点时即随光标实时成形；多边形在 ≥3 点时闭合预览）
  const closedPoly = useMemo(() => {
    if (sketchTool === 'rectangle' || sketchTool === 'circle') {
      if (draftPts.length >= 2) return buildProfilePolygon(sketchTool, draftPts, basis);
      if (draftPts.length === 1 && cursorPt) return buildProfilePolygon(sketchTool, [draftPts[0], cursorPt], basis);
      return null;
    }
    if (draftPts.length >= 3) return draftPts.map((p) => p.clone());
    return null;
  }, [sketchTool, draftPts, cursorPt, basis]);

  const markerGeo = useMemo(() => {
    if (draftPts.length === 0) return null;
    return new THREE.BufferGeometry().setFromPoints(draftPts);
  }, [draftPts]);

  const cursorGeo = useMemo(() => {
    if (!cursorPt) return null;
    return new THREE.BufferGeometry().setFromPoints([cursorPt]);
  }, [cursorPt]);

  // 多边形连线 + 橡皮筋（最后一个点 → 光标）
  const lineGeo = useMemo(() => {
    const segs: THREE.Vector3[] = [];
    if (sketchTool === 'polygon') {
      for (let i = 0; i < draftPts.length - 1; i++) segs.push(draftPts[i], draftPts[i + 1]);
      if (draftPts.length >= 1 && cursorPt) segs.push(draftPts[draftPts.length - 1], cursorPt);
    }
    if (segs.length < 2) return null;
    const positions: number[] = [];
    for (const p of segs) positions.push(p.x, p.y, p.z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [sketchTool, draftPts, cursorPt]);

  if (!isSketchMode) return null;

  return (
    <group renderOrder={998}>
      {closedPoly ? (
        <>
          <Fill polygon={closedPoly} normal={basis.normal} color={snapEnabled ? '#35d0c0' : '#8f7aff'} opacity={0.3} />
          <LineLoop points={closedPoly} color="#7ff0e4" />
        </>
      ) : null}

      {lineGeo && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial color="#7ff0e4" transparent opacity={0.85} depthTest={false} />
        </lineSegments>
      )}

      {markerGeo && (
        <points geometry={markerGeo}>
          <pointsMaterial color="#7ff0e4" size={0.14} sizeAttenuation={false} depthTest={false} />
        </points>
      )}

      {cursorGeo && (
        <points geometry={cursorGeo}>
          <pointsMaterial color={snapEnabled ? '#35d0c0' : '#8f7aff'} size={0.1} sizeAttenuation={false} depthTest={false} />
        </points>
      )}
    </group>
  );
}