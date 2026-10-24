import type { LucideIcon } from 'lucide-react';
import { Box, Cylinder, Circle, Triangle, Undo2, Download, FileDown, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelStore } from '@/store/modelStore';
import { type PrimitiveType } from '@/lib/primitives';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  danger?: boolean;
}

function ToolButton({ icon: Icon, label, onClick, disabled, accent, danger }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors',
        'border border-transparent',
        accent
          ? 'bg-accent text-ink hover:bg-accent-dim'
          : danger
            ? 'text-danger hover:bg-danger/10 hover:border-danger/40'
            : 'text-text/85 hover:bg-panel2 hover:border-line',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <Icon size={16} strokeWidth={2} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

const PRIMITIVES: { type: PrimitiveType; label: string; icon: LucideIcon }[] = [
  { type: 'box', label: '立方体', icon: Box },
  { type: 'cylinder', label: '圆柱', icon: Cylinder },
  { type: 'sphere', label: '球体', icon: Circle },
  { type: 'cone', label: '圆锥', icon: Triangle },
];

export default function Toolbar() {
  const addPrimitive = useModelStore((s) => s.addPrimitive);
  const undo = useModelStore((s) => s.undo);
  const exportStl = useModelStore((s) => s.exportStl);
  const exportObj = useModelStore((s) => s.exportObj);
  const canUndo = useModelStore((s) => s.history.length > 0);
  const isSketchMode = useModelStore((s) => s.isSketchMode);
  const setSketchMode = useModelStore((s) => s.setSketchMode);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-accent font-display text-lg font-bold text-ink">
          F
        </div>
        <div className="leading-none">
          <div className="font-display text-[15px] font-semibold tracking-wide">
            FORGE<span className="text-accent">3D</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">实体建模</div>
        </div>
      </div>

      <div className="h-6 w-px bg-line" />

      <ToolButton
        icon={PenTool}
        label={isSketchMode ? '退出草图' : '草图'}
        onClick={() => setSketchMode(!isSketchMode)}
        accent={isSketchMode}
      />

      <div className="h-6 w-px bg-line" />

      <div className="flex items-center gap-1">
        {PRIMITIVES.map((p) => (
          <ToolButton key={p.type} icon={p.icon} label={p.label} onClick={() => addPrimitive(p.type)} />
        ))}
      </div>

      <div className="h-6 w-px bg-line" />

      <ToolButton icon={Undo2} label="撤销" onClick={undo} disabled={!canUndo} />

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <ToolButton icon={FileDown} label="OBJ" onClick={exportObj} />
        <ToolButton icon={Download} label="导出 STL" onClick={exportStl} accent />
      </div>
    </header>
  );
}
