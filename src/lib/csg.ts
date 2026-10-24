import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg';

const evaluator = new Evaluator();

export function union(base: THREE.BufferGeometry, add: THREE.BufferGeometry): THREE.BufferGeometry {
  const result = evaluator.evaluate(new Brush(base), new Brush(add), ADDITION);
  return result.geometry;
}

export function subtract(base: THREE.BufferGeometry, cut: THREE.BufferGeometry): THREE.BufferGeometry {
  const result = evaluator.evaluate(new Brush(base), new Brush(cut), SUBTRACTION);
  return result.geometry;
}

/** 将多个几何体依次并集为一个水密网格；无有效几何时返回 null。 */
export function unionAll(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const valid = geometries.filter((g) => {
    const pos = g.getAttribute('position');
    return pos && pos.count >= 3;
  });
  if (valid.length === 0) return null;

  let result = valid[0];
  for (let i = 1; i < valid.length; i++) {
    result = union(result, valid[i]);
  }
  return result;
}
