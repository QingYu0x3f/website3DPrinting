import { Square, Circle, Pencil, Magnet } from 'lucide-react';
import { useModelStore } from '@/store/modelStore';
import type { SketchTool } from '@/lib/sketch';

const TOOL_LABELS: Record<SketchTool, string> = {
  rectangle: '矩形',
  circle: '圆',
  polygon: '多边形',
};

export default function SketchPanel() {
  const sketchBasis = useModelStore((s) => s.sketchBasis);
  const sketchTool = useModelStore((s) => s.sketchTool);
  const sketchDraft = useModelStore((s) => s.sketchDraft);
  const snapEnabled = useModelStore((s) => s.snapEnabled);

  const ToolIcon = sketchTool === 'rectangle' ? Square : sketchTool === 'circle' ? Circle : Pencil;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            <ToolIcon size={14} /> 草图
          </h2>

          <div className="rounded-lg border border-line bg-panel2 p-3 text-xs text-muted">
            <div className="flex items-center justify-between">
              <span>平面</span>
              <span className="font-mono text-accent">{sketchBasis.label}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span>工具</span>
              <span className="font-mono text-text/80">{TOOL_LABELS[sketchTool]}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span>已取点</span>
              <span className="font-mono text-text/80">{sketchDraft.length}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <Magnet size={12} /> 吸附
              </span>
              <span className={snapEnabled ? 'font-mono text-accent' : 'font-mono text-text/60'}>
                {snapEnabled ? '开' : '关'}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted/70">
            在视口中点击平面拾取点，多边形会实时预览并随光标延展。完成后点击上方「完成草图」进入 3D
            拉伸。
          </p>
        </section>
      </div>
    </aside>
  );
}