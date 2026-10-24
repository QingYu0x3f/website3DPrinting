import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useModelStore, type FaceSelection } from '@/store/modelStore';
import SolidMesh from './SolidMesh';
import FaceOverlay from './FaceOverlay';
import SketchPlane from './SketchPlane';
import SketchOverlay from './SketchOverlay';
import SketchExtrudeGizmo from './SketchExtrudeGizmo';

export default function Viewport() {
  const solids = useModelStore((s) => s.solids);
  const selection = useModelStore((s) => s.selection);
  const setSelection = useModelStore((s) => s.setSelection);
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const activeProfile = useModelStore((s) => s.activeProfile);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const handleSelect = (face: FaceSelection) => setSelection(face);
  const editing = isSketchMode || activeProfile !== null;

  return (
    <div className="viewport-grid relative flex-1 min-w-0">
      <Canvas
        className="relative z-10"
        camera={{ position: [7, 5, 9], fov: 42 }}
        dpr={[1, 2]}
        onPointerDown={(e) => {
          pointerDownRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMissed={() => setSelection(null)}
      >
        <color attach="background" args={['#0b0e13']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[8, 14, 6]} intensity={1.5} />
        <directionalLight position={[-7, 3, -9]} intensity={0.5} color="#9fb6d8" />

        {solids.map((solid) => (
          <SolidMesh
            key={solid.id}
            solid={solid}
            onSelect={handleSelect}
            pointerDownRef={pointerDownRef}
            interactive={!editing}
          />
        ))}
        {!isSketchMode && selection && <FaceOverlay selection={selection} />}

        {!isSketchMode && (
          <Grid
            position={[0, -1.02, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#232b38"
            sectionSize={5}
            sectionThickness={1.1}
            sectionColor="#2f8f86"
            fadeDistance={45}
            fadeStrength={1.2}
            infiniteGrid
          />
        )}

        <SketchPlane />
        <SketchOverlay />
        <SketchExtrudeGizmo />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enableRotate={!isSketchMode}
        />

        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport
            axisColors={['#ff5470', '#35d0c0', '#4a8cff']}
            labelColor="#dce3ec"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
