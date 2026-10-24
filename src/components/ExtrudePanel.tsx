import { Plus, Minus, Check, X, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelStore, type SketchDirection, type SketchOpMode } from '@/store/modelStore';

function vec(v: [number, number, number]): string {
  return v.map((n) => n.toFixed(2)).join(', ');
}

export default function ExtrudePanel() {
  const activeProfile = useModelStore((s) => s.activeProfile);
  const sketchDistance = useModelStore((s) => s.sketchDistance);
  const sketchDirection = useModelStore((s) => s.sketchDirection);
  const sketchOpMode = useModelStore((s) => s.sketchOpMode);
  const solids = useModelStore((s) => s.solids);
  const setSketchDistance = useModelStore((s) => s.setSketchDistance);
  const setSketchDirection = useModelStore((s) => s.setSketchDirection);
  const setSketchOpMode = useModelStore((s) => s.setSketchOpMode);
  const commitSketchOp = useModelStore((s) => s.commitSketchOp);
  const exitExtrude = useModelStore((s) => s.exitExtrude);

  const cutDisabled = solids.length === 0;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            <Ruler size={14} /> 3D 拉伸
          </h2>

          {activeProfile ? (
            <div className="animate-fade-up space-y-4">
              <div className="rounded-lg border border-line bg-panel2 p-3 text-xs text-muted">
                <div className="flex items-center justify-between">
                  <span>草图平面</span>
                  <span className="font-mono text-accent">{activeProfile.label}</span>
                </div>
                <div className="mt-2 font-mono text-[11px] text-text/70">
                  法线 ({vec(activeProfile.normal)})
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs text-muted">操作</div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSketchOpMode('extrude')}
                    className={cn(
                      'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors',
                      sketchOpMode === 'extrude'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line text-muted hover:border-line hover:text-text',
                    )}
                  >
                    <Plus size={15} strokeWidth={2.5} /> 加料
                  </button>
                  <button
                    onClick={() => setSketchOpMode('cut')}
                    disabled={cutDisabled}
                    title={cutDisabled ? '需要先有实体才能切削' : undefined}
                    className={cn(
                      'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors',
                      sketchOpMode === 'cut'
                        ? 'border-danger/60 bg-danger/10 text-danger'
                        : 'border-line text-muted hover:border-line hover:text-text',
                      cutDisabled && 'pointer-events-none opacity-40',
                    )}
                  >
                    <Minus size={15} strokeWidth={2.5} /> 切削
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>拉伸距离</span>
                  <span className="font-mono text-accent">mm</span>
                </div>
                <input
                  type="number"
                  step={0.1}
                  min={0.05}
                  value={sketchDistance}
                  onChange={(e) => setSketchDistance(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-line bg-panel2 px-3 font-mono text-sm text-text outline-none transition-colors focus:border-accent"
                />
              </div>

              <div>
                <div className="mb-1.5 text-xs text-muted">方向</div>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['forward', '正向'],
                      ['backward', '反向'],
                    ] as [SketchDirection, string][]
                  ).map(([dir, label]) => (
                    <button
                      key={dir}
                      onClick={() => setSketchDirection(dir)}
                      className={cn(
                        'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors',
                        sketchDirection === dir
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line text-muted hover:border-line hover:text-text',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-muted/70">
                在 3D 视口中拖动箭头设置高度，松开自动应用；也可点击下方「应用」。
              </p>

              <button
                onClick={commitSketchOp}
                disabled={sketchOpMode === 'cut' && cutDisabled}
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md font-medium transition-colors',
                  sketchOpMode === 'cut'
                    ? 'border border-danger/50 text-danger hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-40'
                    : 'bg-accent text-ink hover:bg-accent-dim',
                )}
              >
                <Check size={16} strokeWidth={2.5} /> 应用{sketchOpMode === 'extrude' ? '加料' : '切削'}
              </button>

              <button
                onClick={exitExtrude}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-line text-sm text-muted transition-colors hover:border-line hover:text-text"
              >
                <X size={15} /> 取消
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm leading-relaxed text-muted">
              没有待拉伸的草图。
              <br />
              请先绘制草图。
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}