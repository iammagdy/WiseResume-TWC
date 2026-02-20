import type { QRCustomizationState, DotType, CornerSquareType, CornerDotType } from '../qr-types';
import { haptics } from '@/lib/haptics';

interface CustomizeTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
}

function ColorPicker({ label, value, onChangeColor }: { label: string; value: string; onChangeColor: (c: string) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className="w-9 h-9 rounded-lg border border-border/40 shadow-sm shrink-0 relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChangeColor(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{value}</span>
      </div>
    </label>
  );
}

const SHAPES: { id: DotType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '⬛' },
  { id: 'dots', label: 'Dots', icon: '⚫' },
  { id: 'rounded', label: 'Rounded', icon: '🔘' },
  { id: 'extra-rounded', label: 'Soft', icon: '🫧' },
  { id: 'classy', label: 'Classy', icon: '💎' },
  { id: 'classy-rounded', label: 'Elegant', icon: '✨' },
];

const OUTER_SHAPES: { id: CornerSquareType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '⬜' },
  { id: 'extra-rounded', label: 'Rounded', icon: '🔲' },
  { id: 'dot', label: 'Circle', icon: '⭕' },
];

const INNER_SHAPES: { id: CornerDotType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '◽' },
  { id: 'dot', label: 'Circle', icon: '⚪' },
];

export function CustomizeTab({ state, onChange }: CustomizeTabProps) {
  const updateEyes = (partial: Partial<QRCustomizationState['eyes']>) => {
    onChange({ eyes: { ...state.eyes, ...partial }, templateId: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Colors */}
      <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Colors</span>
        <div className="flex gap-6">
          <ColorPicker
            label="Foreground"
            value={state.foregroundColor}
            onChangeColor={(c) => onChange({ foregroundColor: c, templateId: undefined })}
          />
          <ColorPicker
            label="Background"
            value={state.backgroundColor}
            onChangeColor={(c) => onChange({ backgroundColor: c, templateId: undefined })}
          />
        </div>

        {/* Gradient toggle */}
        <div className="space-y-2">
          <button
            onClick={() => {
              haptics.light();
              onChange({ gradient: { ...state.gradient, enabled: !state.gradient.enabled }, templateId: undefined });
            }}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all active:scale-95 touch-manipulation min-h-[36px] ${
              state.gradient.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {state.gradient.enabled ? '✨ Gradient On' : 'Enable Gradient'}
          </button>

          {state.gradient.enabled && (
            <div className="flex gap-6 pt-1">
              <ColorPicker
                label="From"
                value={state.gradient.from}
                onChangeColor={(c) => onChange({ gradient: { ...state.gradient, from: c }, templateId: undefined })}
              />
              <ColorPicker
                label="To"
                value={state.gradient.to}
                onChangeColor={(c) => onChange({ gradient: { ...state.gradient, to: c }, templateId: undefined })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module Shape */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Module Shape</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                haptics.light();
                const roundness = s.id === 'dots' ? 1 : s.id === 'rounded' || s.id === 'extra-rounded' ? 0.6 : 0;
                onChange({ moduleStyle: { shape: s.id, roundness }, templateId: undefined });
              }}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all active:scale-95 touch-manipulation min-h-[44px] ${
                state.moduleStyle.shape === s.id
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className="text-sm">{s.icon}</span>
              <span className="text-[10px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Corner Style */}
      <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Corner Style</span>
        
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground">Outer</span>
          <div className="flex gap-1.5">
            {OUTER_SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => { haptics.light(); updateEyes({ shape: s.id }); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all active:scale-95 touch-manipulation min-h-[44px] ${
                  state.eyes.shape === s.id
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground">Inner Dot</span>
          <div className="flex gap-1.5">
            {INNER_SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => { haptics.light(); updateEyes({ innerShape: s.id }); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all active:scale-95 touch-manipulation min-h-[44px] ${
                  state.eyes.innerShape === s.id
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
