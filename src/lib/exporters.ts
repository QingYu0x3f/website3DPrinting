import * as THREE from 'three';
import { STLExporter, OBJExporter } from 'three-stdlib';

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const valid = geometries.filter((g) => {
    const pos = g.getAttribute('position');
    return pos && pos.count >= 3;
  });
  if (valid.length === 0) return null;

  const nonIndexed = valid.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (const g of nonIndexed) totalVerts += g.getAttribute('position').count;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    const p = g.getAttribute('position');
    positions.set(p.array as Float32Array, offset * 3);

    const count = p.count;
    let n = g.getAttribute('normal') as THREE.BufferAttribute | null;
    if (!n || n.count !== count) {
      const cloned = g.clone();
      cloned.computeVertexNormals();
      n = cloned.getAttribute('normal') as THREE.BufferAttribute;
    }
    normals.set(n.array as Float32Array, offset * 3);
    offset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

function buildExportMesh(geometries: THREE.BufferGeometry[]): THREE.Mesh | null {
  const merged = mergeGeometries(geometries);
  if (!merged) return null;
  return new THREE.Mesh(merged);
}

function downloadBlob(data: BlobPart, filename: string, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSTL(geometries: THREE.BufferGeometry[], filename = 'forge3d-model.stl'): void {
  const mesh = buildExportMesh(geometries);
  if (!mesh) return;
  const exporter = new STLExporter();
  const data = exporter.parse(mesh, { binary: true });
  downloadBlob(data, filename, 'model/stl');
}

export function exportOBJ(geometries: THREE.BufferGeometry[], filename = 'forge3d-model.obj'): void {
  const mesh = buildExportMesh(geometries);
  if (!mesh) return;
  const exporter = new OBJExporter();
  const data = exporter.parse(mesh);
  downloadBlob(data, filename, 'text/plain');
}
