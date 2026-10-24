import { Move3d } from 'lucide-react';
import { useModelStore } from '@/store/modelStore';

export default function ExtrudeToolbar() {
  const sketchOpMode = useModelStore((s) => s.sketchOpMode);
  const sketchDistance = useModelStore((s) => s.sketchDistance);
  const sketchDirection = useModelStore((s) => s.sketchDirection);

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        <Move3d size={15} /> 3D 拉伸
      </span>
      <span
        className={
          sketchOpMode === 'extrude'
            ? 'text-sm font-medium text-accent'
            : 'text-sm font-medium text-danger'
        }
      >
        {sketchOpMode === 'extrude' ? '加料' : '切削'}
      </span>
      <span className="text-[11px] text-muted/70">拖动视口中的箭头设置高度，松开自动应用</span>
      <div className="flex-1" />
      <span className="font-mono text-xs text-muted">
        {sketchDirection === 'forward' ? '+' : '-'}
        {sketchDistance.toFixed(2)} mm
      </span>
    </div>
  );
}