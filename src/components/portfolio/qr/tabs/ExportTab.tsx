import type { QRCustomizationState, ExportFormat } from '../qr-types';
import { haptics } from '@/lib/haptics';

interface ExportTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
  previewBg: 'light' | 'dark';
  onPreviewBgChange: (bg: 'light' | 'dark') => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { id: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => { haptics.light(); onSelect(o.id); }}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 touch-manipulation min-h-[36px] ${
            value === o.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ExportTab({ state, onChange, previewBg, onPreviewBgChange }: ExportTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Format</span>
        <SegmentedControl<ExportFormat>
          options={[{ id: 'png', label: 'PNG' }, { id: 'svg', label: 'SVG' }]}
          value={state.options.format}
          onSelect={(f) => onChange({ options: { ...state.options, format: f } })}
        />
      </div>

      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Size</span>
        <SegmentedControl<string>
          options={[
            { id: '512', label: '512px' },
            { id: '1024', label: '1024px' },
            { id: '2048', label: '2048px' },
          ]}
          value={String(state.options.sizePx)}
          onSelect={(s) => onChange({ options: { ...state.options, sizePx: Number(s) } })}
        />
      </div>

      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Preview Background</span>
        <SegmentedControl<'light' | 'dark'>
          options={[{ id: 'light', label: '☀️ Light' }, { id: 'dark', label: '🌙 Dark' }]}
          value={previewBg}
          onSelect={onPreviewBgChange}
        />
      </div>
    </div>
  );
}
