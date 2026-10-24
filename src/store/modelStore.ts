import { create } from 'zustand';
import * as THREE from 'three';
import { createPrimitiveGeometry, type PrimitiveType, PRIMITIVE_LABELS } from '@/lib/primitives';
import { buildExtrusionGeometry, disposeGeometry } from '@/lib/geometry';
import { union, subtract, unionAll } from '@/lib/csg';
import { exportSTL, exportOBJ } from '@/lib/exporters';
import {
  basisFromNormalPoint,
  basisFromState,
  basisToState,
  standardBasisState,
  buildProfilePolygon,
  type SketchPlane,
  type SketchTool,
  type SketchBasisState,
} from '@/lib/sketch';

export interface Solid {
  id: string;
  name: string;
  type: PrimitiveType | 'custom';
  geometry: THREE.BufferGeometry;
}

export interface FaceSelection {
  solidId: string;
  triIndex: number;
  normal: [number, number, number];
  point: [number, number, number];
  polygon: [number, number, number][];
}

export type ExtrudeDirection = 'out' | 'in';

export interface SketchProfile {
  id: string;
  label: string;
  normal: [number, number, number];
  origin: [number, number, number];
  polygon: [number, number, number][];
}

export type SketchDirection = 'forward' | 'backward';

export type SketchOpMode = 'extrude' | 'cut';

interface ModelState {
  solids: Solid[];
  selection: FaceSelection | null;
  history: Solid[][];
  extrudeDistance: number;
  extrudeDirection: ExtrudeDirection;

  isSketchMode: boolean;
  sketchBasis: SketchBasisState;
  sketchTool: SketchTool;
  sketchDraft: [number, number, number][];
  sketchCursor: [number, number, number] | null;
  activeProfile: SketchProfile | null;
  sketchDistance: number;
  sketchDirection: SketchDirection;
  sketchOpMode: SketchOpMode;
  snapEnabled: boolean;

  addPrimitive: (type: PrimitiveType) => void;
  setSelection: (selection: FaceSelection | null) => void;
  clearSelection: () => void;
  setExtrudeDistance: (d: number) => void;
  setExtrudeDirection: (dir: ExtrudeDirection) => void;
  applyExtrude: () => void;
  deleteSolid: (solidId: string) => void;
  undo: () => void;
  exportStl: () => void;
  exportObj: () => void;

  setSketchMode: (on: boolean) => void;
  setSketchPlane: (plane: SketchPlane) => void;
  startFaceSketch: (face: FaceSelection) => void;
  setSketchTool: (tool: SketchTool) => void;
  setSketchCursor: (p: [number, number, number] | null) => void;
  addSketchPoint: (p: [number, number, number]) => void;
  finishSketch: () => void;
  cancelSketch: () => void;
  setSnapEnabled: (on: boolean) => void;
  setSketchDistance: (d: number) => void;
  setSketchDirection: (dir: SketchDirection) => void;
  setSketchOpMode: (mode: SketchOpMode) => void;
  commitSketchOp: () => void;
  exitExtrude: () => void;
  clearAll: () => void;
}

const MAX_HISTORY = 60;

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushHistory(history: Solid[][], solids: Solid[]): Solid[][] {
  const next = [...history, solids];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

function computeSpawnOffset(solids: Solid[]): number {
  if (solids.length === 0) return 0;
  const box = new THREE.Box3();
  for (const s of solids) {
    if (!s.geometry.boundingBox) s.geometry.computeBoundingBox();
    box.union(s.geometry.boundingBox!);
  }
  return box.max.x + 2;
}

const DEFAULT_BASIS = standardBasisState('xy');

export const useModelStore = create<ModelState>((set, get) => ({
  solids: [],
  selection: null,
  history: [],
  extrudeDistance: 1,
  extrudeDirection: 'out',

  isSketchMode: false,
  sketchBasis: DEFAULT_BASIS,
  sketchTool: 'rectangle',
  sketchDraft: [],
  sketchCursor: null,
  activeProfile: null,
  sketchDistance: 1,
  sketchDirection: 'forward',
  sketchOpMode: 'extrude',
  snapEnabled: true,

  addPrimitive: (type) => {
    const { solids } = get();
    const geometry = createPrimitiveGeometry(type);
    geometry.translate(computeSpawnOffset(solids), 0, 0);
    const solid: Solid = { id: uid(), name: PRIMITIVE_LABELS[type], type, geometry };
    set((s) => ({
      solids: [...s.solids, solid],
      history: pushHistory(s.history, s.solids),
      selection: null,
    }));
  },

  setSelection: (selection) => set({ selection }),

  clearSelection: () => set({ selection: null }),

  setExtrudeDistance: (d) => set({ extrudeDistance: d }),

  setExtrudeDirection: (dir) => set({ extrudeDirection: dir }),

  applyExtrude: () => {
    const { solids, selection, extrudeDistance, extrudeDirection } = get();
    if (!selection) return;
    const solid = solids.find((s) => s.id === selection.solidId);
    if (!solid) return;

    const distance = extrudeDirection === 'out' ? Math.abs(extrudeDistance) : -Math.abs(extrudeDistance);
    const normal = new THREE.Vector3(...selection.normal);
    const polygon = selection.polygon.map((p) => new THREE.Vector3(...p));
    const prism = buildExtrusionGeometry(polygon, normal, distance);
    if (!prism) return;

    const result = distance >= 0 ? union(solid.geometry, prism) : subtract(solid.geometry, prism);
    disposeGeometry(prism);

    const newSolid: Solid = { ...solid, geometry: result, type: 'custom' };
    set((s) => ({
      solids: s.solids.map((x) => (x.id === solid.id ? newSolid : x)),
      history: pushHistory(s.history, s.solids),
      selection: null,
    }));
  },

  deleteSolid: (solidId) => {
    set((s) => ({
      solids: s.solids.filter((x) => x.id !== solidId),
      history: pushHistory(s.history, s.solids),
      selection: s.selection?.solidId === solidId ? null : s.selection,
    }));
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ solids: previous, history: history.slice(0, -1), selection: null });
  },

  exportStl: () => {
    const { solids } = get();
    exportSTL(solids.map((s) => s.geometry));
  },

  exportObj: () => {
    const { solids } = get();
    exportOBJ(solids.map((s) => s.geometry));
  },

  setSketchMode: (on) =>
    set((s) => ({
      isSketchMode: on,
      sketchDraft: [],
      sketchCursor: null,
      selection: on ? null : s.selection,
      activeProfile: on ? null : s.activeProfile,
    })),

  setSketchPlane: (plane) =>
    set({ sketchBasis: standardBasisState(plane), sketchDraft: [], sketchCursor: null }),

  startFaceSketch: (face) => {
    const normal = new THREE.Vector3(...face.normal);
    const point = new THREE.Vector3(...face.point);
    const basis = basisFromNormalPoint(normal, point);
    set({
      sketchBasis: basisToState(basis, '面'),
      isSketchMode: true,
      sketchDraft: [],
      sketchCursor: null,
      activeProfile: null,
      selection: null,
    });
  },

  setSketchTool: (tool) => set({ sketchTool: tool, sketchDraft: [], sketchCursor: null }),

  setSketchCursor: (p) => set({ sketchCursor: p }),

  addSketchPoint: (p) => set((s) => ({ sketchDraft: [...s.sketchDraft, p] })),

  finishSketch: () => {
    const { sketchTool, sketchDraft, sketchBasis } = get();
    const basis = basisFromState(sketchBasis);
    const poly = buildProfilePolygon(sketchTool, sketchDraft.map((p) => new THREE.Vector3(...p)), basis);
    if (!poly) return;

    const profile: SketchProfile = {
      id: uid(),
      label: sketchBasis.label,
      normal: basis.normal.toArray() as [number, number, number],
      origin: basis.origin.toArray() as [number, number, number],
      polygon: poly.map((p) => p.toArray() as [number, number, number]),
    };

    set({
      activeProfile: profile,
      sketchDraft: [],
      sketchCursor: null,
      isSketchMode: false,
    });
  },

  cancelSketch: () => set({ sketchDraft: [], sketchCursor: null }),

  setSnapEnabled: (on) => set({ snapEnabled: on }),

  setSketchDistance: (d) => set({ sketchDistance: Math.max(0.05, Math.abs(d)) }),

  setSketchDirection: (dir) => set({ sketchDirection: dir }),

  setSketchOpMode: (mode) => set({ sketchOpMode: mode }),

  commitSketchOp: () => {
    const { activeProfile, sketchDistance, sketchDirection, sketchOpMode, solids } = get();
    if (!activeProfile) return;

    const normal = new THREE.Vector3(...activeProfile.normal);
    const polygon = activeProfile.polygon.map((p) => new THREE.Vector3(...p));
    const signed = (sketchDirection === 'forward' ? 1 : -1) * Math.abs(sketchDistance);
    const prism = buildExtrusionGeometry(polygon, normal, signed);
    if (!prism) return;

    const base = unionAll(solids.map((s) => s.geometry));
    let result: THREE.BufferGeometry;
    if (sketchOpMode === 'extrude') {
      result = base ? union(base, prism) : prism;
    } else {
      if (!base) {
        disposeGeometry(prism);
        return;
      }
      result = subtract(base, prism);
    }
    disposeGeometry(prism);

    const newSolid: Solid = {
      id: uid(),
      name: sketchOpMode === 'extrude' ? '草图拉伸' : '草图切削',
      type: 'custom',
      geometry: result,
    };

    set((s) => ({
      solids: [newSolid],
      history: pushHistory(s.history, s.solids),
      activeProfile: null,
      selection: null,
    }));
  },

  exitExtrude: () => set({ activeProfile: null, selection: null }),

  clearAll: () =>
    set((s) => ({
      solids: [],
      history: pushHistory(s.history, s.solids),
      selection: null,
      activeProfile: null,
      sketchDraft: [],
      sketchCursor: null,
    })),
}));