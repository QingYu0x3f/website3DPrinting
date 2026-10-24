import Toolbar from '@/components/Toolbar';
import Viewport from '@/components/Viewport';
import PropertyPanel from '@/components/PropertyPanel';
import StatusBar from '@/components/StatusBar';
import SketchToolbar from '@/components/SketchToolbar';
import SketchPanel from '@/components/SketchPanel';
import ExtrudeToolbar from '@/components/ExtrudeToolbar';
import ExtrudePanel from '@/components/ExtrudePanel';
import { useModelStore } from '@/store/modelStore';

export default function Home() {
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const activeProfile = useModelStore((s) => s.activeProfile);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink text-text">
      <Toolbar />
      {isSketchMode && <SketchToolbar />}
      {!isSketchMode && activeProfile && <ExtrudeToolbar />}
      <div className="flex min-h-0 flex-1">
        <Viewport />
        {isSketchMode ? <SketchPanel /> : activeProfile ? <ExtrudePanel /> : <PropertyPanel />}
      </div>
      <StatusBar />
    </div>
  );
}
