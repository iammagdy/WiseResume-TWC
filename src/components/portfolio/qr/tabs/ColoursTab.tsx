import type { QRCustomizationState } from '../qr-types';

interface ColoursTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
}

function ColorPicker({ label, value, onChangeColor }: { label: string; value: string; onChangeColor: (c: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground/80">{label}</span>
      <label className="relative w-11 h-11 rounded-xl border border-border/40 overflow-hidden cursor-pointer active:scale-95 transition-transform touch-manipulation">
        <input
          type="color"
          value={value}
          onChange={(e) => onChangeColor(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
    </div>
  );
}

export function ColoursTab({ state, onChange }: ColoursTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
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

      {/* Gradient */}
      <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground/80">Gradient</span>
          <button
            onClick={() => onChange({ gradient: { ...state.gradient, enabled: !state.gradient.enabled }, templateId: undefined })}
            className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
              state.gradient.enabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
              state.gradient.enabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {state.gradient.enabled && (
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              <button
                onClick={() => onChange({ gradient: { ...state.gradient, type: 'linear' }, templateId: undefined })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  state.gradient.type === 'linear' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Linear
              </button>
              <button
                onClick={() => onChange({ gradient: { ...state.gradient, type: 'radial' }, templateId: undefined })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  state.gradient.type === 'radial' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Radial
              </button>
            </div>
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
            {state.gradient.type === 'linear' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Angle</span>
                  <span>{state.gradient.angle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={state.gradient.angle}
                  onChange={(e) => onChange({ gradient: { ...state.gradient, angle: Number(e.target.value) }, templateId: undefined })}
                  className="w-full h-2 rounded-full appearance-none bg-muted accent-primary"
                />
              </div>
            )}
            {/* Preview stripe */}
            <div
              className="h-6 rounded-lg"
              style={{
                background: state.gradient.type === 'linear'
                  ? `linear-gradient(${state.gradient.angle}deg, ${state.gradient.from}, ${state.gradient.to})`
                  : `radial-gradient(circle, ${state.gradient.from}, ${state.gradient.to})`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
