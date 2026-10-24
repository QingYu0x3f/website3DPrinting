import * as THREE from 'three';

export type SketchPlane = 'xy' | 'xz' | 'yz';
export type SketchTool = 'rectangle' | 'circle' | 'polygon';

export interface PlaneBasis {
  normal: THREE.Vector3;
  u: THREE.Vector3;
  v: THREE.Vector3;
  origin: THREE.Vector3;
}

/** 序列化的草图平面基（可存入 zustand 状态）。 */
export interface SketchBasisState {
  normal: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
  origin: [number, number, number];
  label: string;
}

/** 由法线构造一组平面内正交基（u × v = normal）。 */
function buildBasis(normal: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3): void {
  const ref = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  u.crossVectors(ref, normal).normalize();
  v.crossVectors(normal, u).normalize();
}

/** 三个标准草图平面：法线、平面内正交基（满足 u × v = normal）、原点。 */
export function getPlaneBasis(plane: SketchPlane): PlaneBasis {
  const origin = new THREE.Vector3(0, 0, 0);
  switch (plane) {
    case 'xy':
      return {
        normal: new THREE.Vector3(0, 0, 1),
        u: new THREE.Vector3(1, 0, 0),
        v: new THREE.Vector3(0, 1, 0),
        origin,
      };
    case 'xz':
      return {
        normal: new THREE.Vector3(0, 1, 0),
        u: new THREE.Vector3(1, 0, 0),
        v: new THREE.Vector3(0, 0, -1),
        origin,
      };
    case 'yz':
      return {
        normal: new THREE.Vector3(1, 0, 0),
        u: new THREE.Vector3(0, 1, 0),
        v: new THREE.Vector3(0, 0, 1),
        origin,
      };
  }
}

export const SKETCH_PLANE_LABELS: Record<SketchPlane, string> = {
  xy: 'XY · 前视图',
  xz: 'XZ · 俯视图',
  yz: 'YZ · 侧视图',
};

/** 由任意法线 + 面上一点构造平面基（用于拾取实体表面作为草图平面）。 */
export function basisFromNormalPoint(normal: THREE.Vector3, point: THREE.Vector3): PlaneBasis {
  const n = normal.clone().normalize();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  buildBasis(n, u, v);
  return { normal: n, u, v, origin: point.clone() };
}

/** 标准平面 → 序列化状态。 */
export function standardBasisState(plane: SketchPlane): SketchBasisState {
  return basisToState(getPlaneBasis(plane), SKETCH_PLANE_LABELS[plane]);
}

export function basisToState(basis: PlaneBasis, label: string): SketchBasisState {
  return {
    normal: basis.normal.toArray() as [number, number, number],
    u: basis.u.toArray() as [number, number, number],
    v: basis.v.toArray() as [number, number, number],
    origin: basis.origin.toArray() as [number, number, number],
    label,
  };
}

export function basisFromState(state: SketchBasisState): PlaneBasis {
  return {
    normal: new THREE.Vector3(...state.normal),
    u: new THREE.Vector3(...state.u),
    v: new THREE.Vector3(...state.v),
    origin: new THREE.Vector3(...state.origin),
  };
}

const CIRCLE_SEGMENTS = 48;

function toUV(basis: PlaneBasis, p: THREE.Vector3): { u: number; v: number } {
  const rel = p.clone().sub(basis.origin);
  return { u: rel.dot(basis.u), v: rel.dot(basis.v) };
}

function fromUV(basis: PlaneBasis, u: number, v: number): THREE.Vector3 {
  return basis.origin
    .clone()
    .addScaledVector(basis.u, u)
    .addScaledVector(basis.v, v);
}

/**
 * 根据当前工具与已拾取的世界坐标点，生成闭合的草图轮廓（世界坐标，逆时针）。
 * 返回 null 表示点数不足。
 */
export function buildProfilePolygon(
  tool: SketchTool,
  points: THREE.Vector3[],
  basis: PlaneBasis,
): THREE.Vector3[] | null {
  if (tool === 'rectangle') {
    if (points.length < 2) return null;
    const a = toUV(basis, points[0]);
    const b = toUV(basis, points[1]);
    const minU = Math.min(a.u, b.u);
    const maxU = Math.max(a.u, b.u);
    const minV = Math.min(a.v, b.v);
    const maxV = Math.max(a.v, b.v);
    return [
      fromUV(basis, minU, minV),
      fromUV(basis, maxU, minV),
      fromUV(basis, maxU, maxV),
      fromUV(basis, minU, maxV),
    ];
  }

  if (tool === 'circle') {
    if (points.length < 2) return null;
    const center = points[0];
    const radius = Math.max(1e-3, center.distanceTo(points[1]));
    const poly: THREE.Vector3[] = [];
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      poly.push(
        center.clone().addScaledVector(basis.u, Math.cos(t) * radius).addScaledVector(basis.v, Math.sin(t) * radius),
      );
    }
    return poly;
  }

  // polygon
  if (points.length < 3) return null;
  return points.map((p) => p.clone());
}