import * as THREE from 'three';

export interface ExtractedFace {
  /** 面的单位法线（世界坐标） */
  normal: THREE.Vector3;
  /** 面上的一点 */
  point: THREE.Vector3;
  /** 按顺序排列的面边界多边形顶点（世界坐标） */
  polygon: THREE.Vector3[];
  /** 构成该面的三角形索引 */
  triangleIndices: number[];
}

const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const vC = new THREE.Vector3();
const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();
const tmp = new THREE.Vector3();

function readTriangle(
  geometry: THREE.BufferGeometry,
  triIndex: number,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): void {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const index = geometry.getIndex();
  let i0: number, i1: number, i2: number;
  if (index) {
    i0 = index.getX(triIndex * 3);
    i1 = index.getX(triIndex * 3 + 1);
    i2 = index.getX(triIndex * 3 + 2);
  } else {
    i0 = triIndex * 3;
    i1 = triIndex * 3 + 1;
    i2 = triIndex * 3 + 2;
  }
  a.fromBufferAttribute(pos, i0);
  b.fromBufferAttribute(pos, i1);
  c.fromBufferAttribute(pos, i2);
}

export function triangleCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  return (geometry.getAttribute('position') as THREE.BufferAttribute).count / 3;
}

function vertexKey(v: THREE.Vector3): string {
  return `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
}

function edgeKey(a: THREE.Vector3, b: THREE.Vector3): string {
  const ka = vertexKey(a);
  const kb = vertexKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * 从命中三角形出发，提取与其共面且相连的整块平面（即一个「面」）。
 */
export function extractFace(
  geometry: THREE.BufferGeometry,
  hitTriIndex: number,
): ExtractedFace | null {
  const total = triangleCount(geometry);
  if (hitTriIndex < 0 || hitTriIndex >= total) return null;

  const normals: THREE.Vector3[] = new Array(total);
  const centers: THREE.Vector3[] = new Array(total);

  for (let i = 0; i < total; i++) {
    readTriangle(geometry, i, vA, vB, vC);
    e1.subVectors(vB, vA);
    e2.subVectors(vC, vA);
    const n = new THREE.Vector3().crossVectors(e1, e2);
    if (n.lengthSq() < 1e-16) {
      normals[i] = new THREE.Vector3();
      centers[i] = new THREE.Vector3();
      continue;
    }
    n.normalize();
    normals[i] = n;
    centers[i] = new THREE.Vector3().addVectors(vA, vB).add(vC).multiplyScalar(1 / 3);
  }

  const refNormal = normals[hitTriIndex];
  if (refNormal.lengthSq() < 1e-12) return null;
  const refCenter = centers[hitTriIndex];

  // 收集共面三角形
  const coplanar = new Set<number>();
  for (let i = 0; i < total; i++) {
    const n = normals[i];
    if (n.lengthSq() < 1e-12) continue;
    if (n.dot(refNormal) < 0.9999) continue;
    tmp.subVectors(centers[i], refCenter);
    if (Math.abs(tmp.dot(refNormal)) < 1e-3) coplanar.add(i);
  }

  if (coplanar.size === 0) return null;

  // 基于共边建立邻接，从命中三角形洪泛出连通区域
  const edgeMap = new Map<string, number[]>();
  const pushEdge = (key: string, tri: number) => {
    const list = edgeMap.get(key);
    if (list) list.push(tri);
    else edgeMap.set(key, [tri]);
  };

  for (const tri of coplanar) {
    readTriangle(geometry, tri, vA, vB, vC);
    pushEdge(edgeKey(vA, vB), tri);
    pushEdge(edgeKey(vB, vC), tri);
    pushEdge(edgeKey(vC, vA), tri);
  }

  const faceTris = new Set<number>();
  const stack = [hitTriIndex];
  faceTris.add(hitTriIndex);
  while (stack.length) {
    const cur = stack.pop()!;
    readTriangle(geometry, cur, vA, vB, vC);
    for (const key of [edgeKey(vA, vB), edgeKey(vB, vC), edgeKey(vC, vA)]) {
      const neighbors = edgeMap.get(key) || [];
      for (const nb of neighbors) {
        if (nb !== cur && coplanar.has(nb) && !faceTris.has(nb)) {
          faceTris.add(nb);
          stack.push(nb);
        }
      }
    }
  }

  // 边界边：仅被一个三角形使用的边
  const edgeCount = new Map<string, number>();
  for (const tri of faceTris) {
    readTriangle(geometry, tri, vA, vB, vC);
    for (const key of [edgeKey(vA, vB), edgeKey(vB, vC), edgeKey(vC, vA)]) {
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }

  const boundaryEdges: { key: string; a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  for (const tri of faceTris) {
    readTriangle(geometry, tri, vA, vB, vC);
    const es: [THREE.Vector3, THREE.Vector3][] = [
      [vA, vB],
      [vB, vC],
      [vC, vA],
    ];
    for (const [pa, pb] of es) {
      const key = edgeKey(pa, pb);
      if (edgeCount.get(key) === 1) {
        boundaryEdges.push({ key, a: pa.clone(), b: pb.clone() });
      }
    }
  }

  if (boundaryEdges.length < 3) return null;

  // 将边界边连成有序多边形
  const pointMap = new Map<string, THREE.Vector3>();
  const adj = new Map<string, string[]>();
  for (const edge of boundaryEdges) {
    const ka = vertexKey(edge.a);
    const kb = vertexKey(edge.b);
    pointMap.set(ka, edge.a);
    pointMap.set(kb, edge.b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka)!.push(kb);
    adj.get(kb)!.push(ka);
  }

  const polygon: THREE.Vector3[] = [];
  const startKey = adj.keys().next().value as string;
  let cur = startKey;
  let prev: string | null = null;
  let guard = 0;
  while (guard++ < boundaryEdges.length + 1) {
    polygon.push(pointMap.get(cur)!);
    const neighbors = adj.get(cur) || [];
    let next: string | null = null;
    for (const nb of neighbors) {
      if (nb !== prev) {
        next = nb;
        break;
      }
    }
    if (next === null || next === startKey) break;
    prev = cur;
    cur = next;
  }

  if (polygon.length < 3) return null;

  return {
    normal: refNormal.clone(),
    point: refCenter.clone(),
    polygon,
    triangleIndices: Array.from(faceTris),
  };
}

/**
 * 由面边界多边形沿法线构建拉伸棱柱。
 * distance 为正表示沿法线外凸，为负表示反向（内凹）。
 */
export function buildExtrusionGeometry(
  polygon: THREE.Vector3[],
  normal: THREE.Vector3,
  distance: number,
): THREE.BufferGeometry | null {
  if (polygon.length < 3 || Math.abs(distance) < 1e-9) return null;

  const dir = distance >= 0 ? 1 : -1;
  const depth = Math.abs(distance);
  const eps = 0.01;

  const n = normal.clone().normalize();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  buildBasis(n, u, v);

  // 投影到 (u, v) 平面（相对多边形首点，避免与 origin 双重叠加）
  const ref = polygon[0];
  const rel = new THREE.Vector3();
  const pts2d: THREE.Vector2[] = polygon.map((p) => {
    rel.subVectors(p, ref);
    return new THREE.Vector2(rel.dot(u), rel.dot(v));
  });

  // 保证逆时针（正面积），使拉伸体法线朝外
  let area = 0;
  for (let i = 0; i < pts2d.length; i++) {
    const a = pts2d[i];
    const b = pts2d[(i + 1) % pts2d.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) pts2d.reverse();

  const shape = new THREE.Shape(pts2d);
  const length = depth + eps;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });

  // 始终沿外法线 +n 拉伸（右手系，避免反射翻转 winding）。
  // 外凸时底座内缩以重叠实体；内凹时底座内移，使棱柱占据 [面 - depth, 面 + eps] 的切除区域。
  const basis = new THREE.Matrix4().makeBasis(u, v, n);
  const offset = dir === 1 ? -eps : -depth;
  const origin = polygon[0].clone().addScaledVector(n, offset);
  basis.setPosition(origin);
  geo.applyMatrix4(basis);
  geo.computeVertexNormals();

  return geo;
}

/** 由面边界多边形构建一个平面片（用于高亮显示），offset 沿法线方向偏移以消除 Z-fighting。 */
export function polygonToFlatGeometry(
  polygon: THREE.Vector3[],
  normal: THREE.Vector3,
  offset = 0.005,
): THREE.BufferGeometry | null {
  if (polygon.length < 3) return null;
  const n = normal.clone().normalize();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  buildBasis(n, u, v);

  const ref = polygon[0];
  const rel = new THREE.Vector3();
  const pts: THREE.Vector2[] = polygon.map((p) => {
    rel.subVectors(p, ref);
    return new THREE.Vector2(rel.dot(u), rel.dot(v));
  });
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) pts.reverse();

  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
  const basis = new THREE.Matrix4().makeBasis(u, v, n);
  basis.setPosition(ref.clone().addScaledVector(n, offset));
  geo.applyMatrix4(basis);
  return geo;
}

function buildBasis(normal: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3): void {
  const ref = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  u.crossVectors(ref, normal).normalize();
  v.crossVectors(normal, u).normalize();
}

export function disposeGeometry(geometry: THREE.BufferGeometry | undefined | null): void {
  if (!geometry) return;
  try {
    geometry.dispose();
  } catch {
    /* ignore */
  }
}
