import { useRef } from 'react';
import type { QRCustomizationState } from '../qr-types';
import { Slider } from '@/components/ui/slider';
import { haptics } from '@/lib/haptics';

interface LogoTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
  defaultLogoSrc?: string;
}

export function LogoTab({ state, onChange, defaultLogoSrc }: LogoTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return; // silently ignore >2MB
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        logo: { ...state.logo, src: reader.result as string, enabled: true },
        options: { ...state.options, errorCorrection: 'H' },
        templateId: undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleLogo = () => {
    haptics.light();
    const enabled = !state.logo.enabled;
    onChange({
      logo: { ...state.logo, enabled, src: state.logo.src || defaultLogoSrc },
      options: enabled ? { ...state.options, errorCorrection: 'H' } : state.options,
      templateId: undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-card/30 p-3 border border-border/20">
        <span className="text-sm font-medium text-foreground/80">Show Logo</span>
        <button
          onClick={toggleLogo}
          className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
            state.logo.enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
            state.logo.enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {state.logo.enabled && (
        <>
          {/* Upload */}
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed border-border/50 bg-card/30 text-sm text-foreground/60 active:scale-95 touch-manipulation transition-all min-h-[44px]"
            >
              {state.logo.src ? '✅ Logo loaded — Tap to replace' : '📁 Upload Logo (PNG, JPG, SVG)'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            {defaultLogoSrc && !state.logo.src && (
              <button
                onClick={() => onChange({ logo: { ...state.logo, src: defaultLogoSrc }, templateId: undefined })}
                className="w-full py-2 rounded-lg text-xs text-primary font-medium active:scale-95 touch-manipulation"
              >
                Use WiseResume logo
              </button>
            )}
          </div>

          {/* Size */}
          <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Logo Size</span>
              <span>{state.logo.sizePercent}%</span>
            </div>
            <Slider
              min={10}
              max={35}
              step={1}
              value={[state.logo.sizePercent]}
              onValueChange={([v]) => onChange({ logo: { ...state.logo, sizePercent: v }, templateId: undefined })}
            />
          </div>

          {/* Safe zone */}
          <div className="flex items-center justify-between rounded-xl bg-card/30 p-3 border border-border/20">
            <div>
              <span className="text-sm font-medium text-foreground/80">Safe Zone</span>
              <p className="text-[10px] text-muted-foreground">White area behind logo for readability</p>
            </div>
            <button
              onClick={() => onChange({ logo: { ...state.logo, safeZone: !state.logo.safeZone }, templateId: undefined })}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                state.logo.safeZone ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
                state.logo.safeZone ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
