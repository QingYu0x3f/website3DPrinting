import { useModelStore } from '@/store/modelStore';

export default function StatusBar() {
  const solids = useModelStore((s) => s.solids);
  const selection = useModelStore((s) => s.selection);
  const canUndo = useModelStore((s) => s.history.length > 0);
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const sketchDraft = useModelStore((s) => s.sketchDraft);
  const activeProfile = useModelStore((s) => s.activeProfile);
  const sketchOpMode = useModelStore((s) => s.sketchOpMode);

  const hint = isSketchMode
    ? `草图模式 · 点击平面拾取点（已 ${sketchDraft.length} 点）· 滚轮缩放 · 右键平移`
    : activeProfile
      ? `3D 拉伸 · 拖动箭头设置高度 · 松开应用（${sketchOpMode === 'extrude' ? '加料' : '切削'}）· 左键旋转`
      : selection
        ? '已选中面 — 可在右侧面板执行拉伸、删除或在面上新建草图'
        : '就绪 · 左键拖拽旋转 · 滚轮缩放 · 右键平移 · 点击面选中';

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-line bg-panel px-4 text-[11px] text-muted">
      <div className="truncate">{hint}</div>
      <div className="flex shrink-0 items-center gap-4">
        <span>
          实体 <span className="font-mono text-text">{solids.length}</span>
        </span>
        <span className={canUndo ? 'text-accent' : ''}>可撤销</span>
      </div>
    </footer>
  );
}
