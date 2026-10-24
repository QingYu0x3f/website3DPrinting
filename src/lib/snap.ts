import * as THREE from 'three';
import type { PlaneBasis } from './sketch';

export type SnapKind = 'none' | 'vertex' | 'edge' | 'grid';

export interface SnapResult {
  point: THREE.Vector3;
  kind: SnapKind;
}

export interface SnapOptions {
  /** 顶点吸附半径（世界单位） */
  vertexTol?: number;
  /** 边吸附半径（世界单位） */
  edgeTol?: number;
  /** 网格吸附半径（平面内距离） */
  gridTol?: number;
}

const PLANE_EPS = 0.02;

function planeDistance(p: THREE.Vector3, origin: THREE.Vector3, normal: THREE.Vector3): number {
  return p.dot(normal) - origin.dot(normal);
}

function closestOnSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const lenSq = abx * abx + aby * aby + abz * abz;
  if (lenSq < 1e-12) {
    out.copy(a);
    return p.distanceTo(a);
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  out.set(a.x + abx * t, a.y + aby * t, a.z + abz * t);
  return p.distanceTo(out);
}

/**
 * 对草图取点进行吸附：优先几何顶点 → 边 → 网格。
 * 仅考虑位于草图平面（或其交线）上的几何，以贴近 CAD 的预期。
 */
export function snapSketchPoint(
  raw: THREE.Vector3,
  basis: PlaneBasis,
  geometries: THREE.BufferGeometry[],
  gridStep: number,
  opts?: SnapOptions,
): SnapResult {
  const vertexTol = opts?.vertexTol ?? 0.45;
  const edgeTol = opts?.edgeTol ?? 0.35;
  const gridTol = opts?.gridTol ?? gridStep * 0.5;

  const { normal, origin } = basis;

  // 1) 几何顶点（位于草图平面内）
  let bestVertex: THREE.Vector3 | null = null;
  let bestVertexDist = Infinity;
  // 2) 几何边（平面内线段最近点 / 与平面交点）
  let bestEdge: THREE.Vector3 | null = null;
  let bestEdgeDist = Infinity;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const closest = new THREE.Vector3();

  for (const g of geometries) {
    const pos = g.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos || pos.count < 3) continue;
    const index = g.getIndex();
    const triCount = index ? index.count / 3 : pos.count / 3;

    const read = (i: number, out: THREE.Vector3) => {
      const ix = index ? index.getX(i) : i;
      out.fromBufferAttribute(pos, ix);
    };

    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      read(i0, a);
      read(i0 + 1, b);
      read(i0 + 2, c);

      // 顶点
      if (Math.abs(planeDistance(a, origin, normal)) < PLANE_EPS) {
        const d = raw.distanceTo(a);
        if (d < vertexTol && d < bestVertexDist) {
          bestVertexDist = d;
          bestVertex = a.clone();
        }
      }
      if (Math.abs(planeDistance(b, origin, normal)) < PLANE_EPS) {
        const d = raw.distanceTo(b);
        if (d < vertexTol && d < bestVertexDist) {
          bestVertexDist = d;
          bestVertex = b.clone();
        }
      }
      if (Math.abs(planeDistance(c, origin, normal)) < PLANE_EPS) {
        const d = raw.distanceTo(c);
        if (d < vertexTol && d < bestVertexDist) {
          bestVertexDist = d;
          bestVertex = c.clone();
        }
      }

      // 边：在平面内，或跨越平面
      for (const [pa, pb] of [
        [a, b],
        [b, c],
        [c, a],
      ] as [THREE.Vector3, THREE.Vector3][]) {
        const da = planeDistance(pa, origin, normal);
        const db = planeDistance(pb, origin, normal);
        if (Math.abs(da) < PLANE_EPS && Math.abs(db) < PLANE_EPS) {
          const d = closestOnSegment(raw, pa, pb, closest);
          if (d < edgeTol && d < bestEdgeDist) {
            bestEdgeDist = d;
            bestEdge = closest.clone();
          }
        } else if (da * db < 0) {
          // 线段与平面相交
          const t = da / (da - db);
          closest.copy(pa).lerp(pb, t);
          const d = raw.distanceTo(closest);
          if (d < edgeTol && d < bestEdgeDist) {
            bestEdgeDist = d;
            bestEdge = closest.clone();
          }
        }
      }
    }
  }

  if (bestVertex) return { point: bestVertex, kind: 'vertex' };
  if (bestEdge) return { point: bestEdge, kind: 'edge' };

  // 3) 网格
  const rel = raw.clone().sub(origin);
  const u = rel.dot(basis.u);
  const v = rel.dot(basis.v);
  const su = Math.round(u / gridStep) * gridStep;
  const sv = Math.round(v / gridStep) * gridStep;
  const gridPoint = origin.clone().addScaledVector(basis.u, su).addScaledVector(basis.v, sv);
  if (raw.distanceTo(gridPoint) <= gridTol) {
    return { point: gridPoint, kind: 'grid' };
  }

  return { point: raw.clone(), kind: 'none' };
}