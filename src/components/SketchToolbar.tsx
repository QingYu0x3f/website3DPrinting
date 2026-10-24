import type { LucideIcon } from 'lucide-react';
import { Square, Circle, Pencil, Check, X, LogOut, Magnet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelStore } from '@/store/modelStore';
import { SKETCH_PLANE_LABELS, type SketchPlane, type SketchTool } from '@/lib/sketch';

const PLANES: SketchPlane[] = ['xy', 'xz', 'yz'];

const TOOLS: { type: SketchTool; label: string; icon: LucideIcon; hint: string }[] = [
  { type: 'rectangle', label: '矩形', icon: Square, hint: '点击两次（对角两点）' },
  { type: 'circle', label: '圆', icon: Circle, hint: '点击圆心与半径点' },
  { type: 'polygon', label: '多边形', icon: Pencil, hint: '依次点击顶点，完成后点“完成草图”' },
];

export default function SketchToolbar() {
  const sketchBasis = useModelStore((s) => s.sketchBasis);
  const sketchTool = useModelStore((s) => s.sketchTool);
  const sketchDraft = useModelStore((s) => s.sketchDraft);
  const snapEnabled = useModelStore((s) => s.snapEnabled);
  const setSketchPlane = useModelStore((s) => s.setSketchPlane);
  const setSketchTool = useModelStore((s) => s.setSketchTool);
  const setSnapEnabled = useModelStore((s) => s.setSnapEnabled);
  const finishSketch = useModelStore((s) => s.finishSketch);
  const cancelSketch = useModelStore((s) => s.cancelSketch);
  const setSketchMode = useModelStore((s) => s.setSketchMode);

  const activeTool = TOOLS.find((t) => t.type === sketchTool);
  const isCustomPlane = sketchBasis.label === '面';

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted">平面</span>
        {PLANES.map((plane) => (
          <button
            key={plane}
            onClick={() => setSketchPlane(plane)}
            title={SKETCH_PLANE_LABELS[plane]}
            className={cn(
              'h-8 rounded-md border px-3 font-mono text-xs font-semibold transition-colors',
              sketchBasis.label === SKETCH_PLANE_LABELS[plane]
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-muted hover:border-line hover:text-text',
            )}
          >
            {plane.toUpperCase()}
          </button>
        ))}
        {isCustomPlane && (
          <span className="rounded-md border border-line bg-panel2 px-3 py-1.5 font-mono text-xs text-text/80">
            自定义面
          </span>
        )}
      </div>

      <div className="h-6 w-px bg-line" />

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted">工具</span>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.type}
              onClick={() => setSketchTool(t.type)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
                sketchTool === t.type
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-text/85 hover:border-line hover:bg-panel2',
              )}
            >
              <Icon size={15} strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-line" />

      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        title={snapEnabled ? '吸附：开' : '吸附：关'}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
          snapEnabled
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-line text-muted hover:border-line hover:text-text',
        )}
      >
        <Magnet size={15} strokeWidth={2} />
        吸附
      </button>

      <div className="flex items-center gap-1.5">
        <button
          onClick={finishSketch}
          disabled={sketchDraft.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-ink transition-colors hover:bg-accent-dim disabled:pointer-events-none disabled:opacity-40"
        >
          <Check size={15} strokeWidth={2.5} /> 完成草图
        </button>
        <button
          onClick={cancelSketch}
          disabled={sketchDraft.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-muted transition-colors hover:text-text disabled:pointer-events-none disabled:opacity-40"
        >
          <X size={15} strokeWidth={2} /> 取消
        </button>
      </div>

      <div className="flex-1" />

      <span className="hidden text-[11px] text-muted/70 md:inline">{activeTool?.hint}</span>

      <button
        onClick={() => setSketchMode(false)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-text/85 transition-colors hover:bg-panel2"
      >
        <LogOut size={15} /> 退出草图
      </button>
    </div>
  );
}