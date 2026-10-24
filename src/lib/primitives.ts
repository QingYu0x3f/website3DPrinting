import * as THREE from 'three';

export type PrimitiveType = 'box' | 'cylinder' | 'sphere' | 'cone';

const SEGMENTS = 48;

export function createPrimitiveGeometry(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'cylinder':
      return new THREE.CylinderGeometry(1, 1, 2.4, SEGMENTS);
    case 'sphere':
      return new THREE.SphereGeometry(1.3, SEGMENTS, SEGMENTS / 2);
    case 'cone':
      return new THREE.ConeGeometry(1.2, 2.4, SEGMENTS);
    default:
      return new THREE.BoxGeometry(2, 2, 2);
  }
}

export const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  box: '立方体',
  cylinder: '圆柱',
  sphere: '球体',
  cone: '圆锥',
};
