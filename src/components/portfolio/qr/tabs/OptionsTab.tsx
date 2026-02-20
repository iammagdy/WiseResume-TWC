import type { QRCustomizationState, ErrorCorrectionLevel, ExportFormat } from '../qr-types';
import { Slider } from '@/components/ui/slider';
import { haptics } from '@/lib/haptics';

interface OptionsTabProps {
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

export function OptionsTab({ state, onChange, previewBg, onPreviewBgChange }: OptionsTabProps) {
  return (
    <div className="space-y-4">
      {/* Format */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Export Format</span>
        <SegmentedControl<ExportFormat>
          options={[{ id: 'png', label: 'PNG' }, { id: 'svg', label: 'SVG' }]}
          value={state.options.format}
          onSelect={(f) => onChange({ options: { ...state.options, format: f }, templateId: undefined })}
        />
      </div>

      {/* Size */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Size (px)</span>
        <SegmentedControl<string>
          options={[
            { id: '512', label: '512' },
            { id: '1024', label: '1024' },
            { id: '2048', label: '2048' },
          ]}
          value={String(state.options.sizePx)}
          onSelect={(s) => onChange({ options: { ...state.options, sizePx: Number(s) }, templateId: undefined })}
        />
      </div>

      {/* Error Correction */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <div className="flex justify-between">
          <span className="text-sm font-medium text-foreground/80">Error Correction</span>
          <span className="text-[10px] text-muted-foreground">Higher = more reliable</span>
        </div>
        <SegmentedControl<ErrorCorrectionLevel>
          options={[
            { id: 'L', label: 'L (7%)' },
            { id: 'M', label: 'M (15%)' },
            { id: 'Q', label: 'Q (25%)' },
            { id: 'H', label: 'H (30%)' },
          ]}
          value={state.options.errorCorrection}
          onSelect={(ec) => onChange({ options: { ...state.options, errorCorrection: ec }, templateId: undefined })}
        />
      </div>

      {/* Quiet Zone */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-sm font-medium text-foreground/80">Quiet Zone</span>
          <span>{state.options.quietZone}px</span>
        </div>
        <Slider
          min={0}
          max={40}
          step={2}
          value={[state.options.quietZone]}
          onValueChange={([v]) => onChange({ options: { ...state.options, quietZone: v }, templateId: undefined })}
        />
      </div>

      {/* Preview background */}
      <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Preview Background</span>
        <SegmentedControl<'light' | 'dark'>
          options={[{ id: 'light', label: '☀️ Light' }, { id: 'dark', label: '🌙 Dark' }]}
          value={previewBg}
          onSelect={onPreviewBgChange}
        />
      </div>

      {/* Warning */}
      <p className="text-[10px] text-muted-foreground/60 text-center px-2">
        ⚠️ Always test your QR code with at least 2 different devices before printing or sharing.
      </p>
    </div>
  );
}
