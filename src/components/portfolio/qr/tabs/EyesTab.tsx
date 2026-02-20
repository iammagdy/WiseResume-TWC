import type { QRCustomizationState, CornerSquareType, CornerDotType } from '../qr-types';
import { haptics } from '@/lib/haptics';

interface EyesTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
}

const OUTER_SHAPES: { id: CornerSquareType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '⬜' },
  { id: 'extra-rounded', label: 'Rounded', icon: '🟩' },
  { id: 'dot', label: 'Circle', icon: '🟢' },
];

const INNER_SHAPES: { id: CornerDotType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '◾' },
  { id: 'dot', label: 'Circle', icon: '⚫' },
];

export function EyesTab({ state, onChange }: EyesTabProps) {
  const updateEyes = (partial: Partial<QRCustomizationState['eyes']>) => {
    onChange({ eyes: { ...state.eyes, ...partial }, templateId: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Outer shape */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground/80">Outer Shape</span>
        <div className="grid grid-cols-3 gap-2">
          {OUTER_SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => { haptics.light(); updateEyes({ shape: s.id }); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all active:scale-95 touch-manipulation min-h-[56px] ${
                state.eyes.shape === s.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border/40 bg-card/50'
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="text-[10px] font-medium text-foreground/70">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inner shape */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground/80">Inner Dot</span>
        <div className="grid grid-cols-2 gap-2">
          {INNER_SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => { haptics.light(); updateEyes({ innerShape: s.id }); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all active:scale-95 touch-manipulation min-h-[56px] ${
                state.eyes.innerShape === s.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border/40 bg-card/50'
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="text-[10px] font-medium text-foreground/70">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sync toggle */}
      <div className="flex items-center justify-between rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Sync with foreground</span>
        <button
          onClick={() => updateEyes({ syncWithForeground: !state.eyes.syncWithForeground })}
          className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
            state.eyes.syncWithForeground ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
            state.eyes.syncWithForeground ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Color pickers when not synced */}
      {!state.eyes.syncWithForeground && (
        <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/80">Outer Color</span>
            <label className="relative w-11 h-11 rounded-xl border border-border/40 overflow-hidden cursor-pointer active:scale-95 touch-manipulation">
              <input
                type="color"
                value={state.eyes.outerColor}
                onChange={(e) => updateEyes({ outerColor: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full" style={{ backgroundColor: state.eyes.outerColor }} />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/80">Inner Color</span>
            <label className="relative w-11 h-11 rounded-xl border border-border/40 overflow-hidden cursor-pointer active:scale-95 touch-manipulation">
              <input
                type="color"
                value={state.eyes.innerColor}
                onChange={(e) => updateEyes({ innerColor: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full" style={{ backgroundColor: state.eyes.innerColor }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
