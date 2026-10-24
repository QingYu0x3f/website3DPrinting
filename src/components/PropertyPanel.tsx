import { Trash2, X, Layers, ArrowUp, ArrowDown, MousePointer2, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelStore, type ExtrudeDirection } from '@/store/modelStore';

function vec(v: [number, number, number]): string {
  return v.map((n) => n.toFixed(2)).join(', ');
}

export default function PropertyPanel() {
  const selection = useModelStore((s) => s.selection);
  const solids = useModelStore((s) => s.solids);
  const extrudeDistance = useModelStore((s) => s.extrudeDistance);
  const extrudeDirection = useModelStore((s) => s.extrudeDirection);
  const setExtrudeDistance = useModelStore((s) => s.setExtrudeDistance);
  const setExtrudeDirection = useModelStore((s) => s.setExtrudeDirection);
  const applyExtrude = useModelStore((s) => s.applyExtrude);
  const deleteSolid = useModelStore((s) => s.deleteSolid);
  const clearSelection = useModelStore((s) => s.clearSelection);
  const startFaceSketch = useModelStore((s) => s.startFaceSketch);

  const selectedSolid = selection ? solids.find((s) => s.id === selection.solidId) : null;

  const DirectionButton = ({ dir, label, icon: Icon }: { dir: ExtrudeDirection; label: string; icon: typeof ArrowUp }) => (
    <button
      onClick={() => setExtrudeDirection(dir)}
      className={cn(
        'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors',
        extrudeDirection === dir
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-line text-muted hover:border-line hover:text-text',
      )}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </button>
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            <MousePointer2 size={14} /> 操作
          </h2>

          {selection && selectedSolid ? (
            <div className="animate-fade-up space-y-4">
              <div className="rounded-lg border border-line bg-panel2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">选中面</span>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                    {selectedSolid.name}
                  </span>
                </div>
                <div className="mt-2 font-mono text-xs text-text/80">
                  法线 ({vec(selection.normal)})
                </div>
              </div>

              <button
                onClick={() => startFaceSketch(selection)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/60 font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <PenTool size={16} strokeWidth={2} /> 在此面新建草图
              </button>
              <p className="-mt-2 text-[11px] leading-relaxed text-muted/70">
                以选中面为草图平面进入绘制，绘制后可在 3D 视口中拖拽拉伸。
              </p>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>拉伸距离</span>
                  <span className="font-mono text-accent">mm</span>
                </div>
                <input
                  type="number"
                  step={0.1}
                  min={0.05}
                  value={extrudeDistance}
                  onChange={(e) => setExtrudeDistance(Math.max(0.05, Number(e.target.value)))}
                  className="h-10 w-full rounded-md border border-line bg-panel2 px-3 font-mono text-sm text-text outline-none transition-colors focus:border-accent"
                />
              </div>

              <div>
                <div className="mb-1.5 text-xs text-muted">方向</div>
                <div className="flex gap-1.5">
                  <DirectionButton dir="out" label="外凸" icon={ArrowUp} />
                  <DirectionButton dir="in" label="内凹" icon={ArrowDown} />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted/70">
                  {extrudeDirection === 'out' ? '外凸：沿法线向外加料（并集）' : '内凹：沿法线向内切料（差集）'}
                </p>
              </div>

              <button
                onClick={applyExtrude}
                className="h-10 w-full rounded-md bg-accent font-medium text-ink transition-colors hover:bg-accent-dim"
              >
                应用拉伸
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => deleteSolid(selection.solidId)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-danger/40 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 size={15} /> 删除实体
                </button>
                <button
                  onClick={clearSelection}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-sm text-muted transition-colors hover:border-line hover:text-text"
                >
                  <X size={15} /> 取消
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm leading-relaxed text-muted">
              点击模型上的<strong className="text-text">面</strong>以选中，
              <br />
              再进行拉伸或删除。
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            <Layers size={14} /> 实体（{solids.length}）
          </h2>
          <ul className="space-y-1.5">
            {solids.map((solid) => (
              <li
                key={solid.id}
                className={cn(
                  'group flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
                  selection?.solidId === solid.id
                    ? 'border-accent/50 bg-accent/5'
                    : 'border-line-soft bg-panel2',
                )}
              >
                <span className="font-mono text-[13px] text-text/90">{solid.name}</span>
                <button
                  onClick={() => deleteSolid(solid.id)}
                  title="删除实体"
                  className="text-muted/60 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
