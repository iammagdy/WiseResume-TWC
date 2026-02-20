import type { QRCustomizationState, DotType } from '../qr-types';
import { haptics } from '@/lib/haptics';

interface StyleTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
}

const SHAPES: { id: DotType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '▪️' },
  { id: 'dots', label: 'Dots', icon: '⚫' },
  { id: 'rounded', label: 'Rounded', icon: '🔵' },
  { id: 'extra-rounded', label: 'Soft', icon: '🟣' },
  { id: 'classy', label: 'Classy', icon: '💎' },
  { id: 'classy-rounded', label: 'Fancy', icon: '✨' },
];

export function StyleTab({ state, onChange }: StyleTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground/80">Module Shape</span>
        <div className="grid grid-cols-3 gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                haptics.light();
                onChange({
                  moduleStyle: { shape: s.id, roundness: s.id === 'dots' ? 1 : s.id === 'rounded' ? 0.5 : s.id === 'extra-rounded' ? 0.7 : 0 },
                  templateId: undefined,
                });
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all active:scale-95 touch-manipulation min-h-[56px] ${
                state.moduleStyle.shape === s.id
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

      {/* Style presets */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground/80">Quick Presets</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Minimal', shape: 'square' as DotType, roundness: 0 },
            { label: 'Soft', shape: 'rounded' as DotType, roundness: 0.5 },
            { label: 'Pixelated', shape: 'dots' as DotType, roundness: 1 },
            { label: 'Fancy', shape: 'classy-rounded' as DotType, roundness: 0.5 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => {
                haptics.light();
                onChange({ moduleStyle: { shape: p.shape, roundness: p.roundness }, templateId: undefined });
              }}
              className="py-2.5 px-3 rounded-xl border border-border/40 bg-card/50 text-xs font-medium text-foreground/70 active:scale-95 touch-manipulation transition-all hover:bg-card/80"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
