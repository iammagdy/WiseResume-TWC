import type { QRTemplate, QRCustomizationState } from '../qr-types';
import { QR_TEMPLATES } from '../qr-templates';
import { haptics } from '@/lib/haptics';

interface TemplatesTabProps {
  state: QRCustomizationState;
  onChange: (partial: Partial<QRCustomizationState>) => void;
  defaultLogoSrc?: string;
}

export function TemplatesTab({ state, onChange, defaultLogoSrc }: TemplatesTabProps) {
  const applyTemplate = (template: QRTemplate) => {
    haptics.light();
    const update: Partial<QRCustomizationState> = {
      templateId: template.id,
      foregroundColor: template.foregroundColor,
      backgroundColor: template.backgroundColor,
      gradient: {
        enabled: template.gradient?.enabled ?? false,
        type: template.gradient?.type ?? 'linear',
        from: template.gradient?.from ?? template.foregroundColor,
        to: template.gradient?.to ?? template.foregroundColor,
        angle: template.gradient?.angle ?? 135,
      },
      moduleStyle: { ...template.moduleStyle },
      eyes: {
        shape: template.eyes.shape ?? 'square',
        innerShape: template.eyes.innerShape ?? 'square',
        outerColor: template.eyes.outerColor ?? template.foregroundColor,
        innerColor: template.eyes.innerColor ?? template.foregroundColor,
        syncWithForeground: !template.eyes.outerColor,
      },
    };

    // Handle logo for templates
    if (template.logo) {
      update.logo = {
        src: defaultLogoSrc,
        enabled: template.logo.enabled ?? false,
        sizePercent: template.logo.sizePercent ?? 25,
        safeZone: template.logo.safeZone ?? true,
      };
      // Auto-bump error correction when logo is on
      if (template.logo.enabled) {
        update.options = { ...state.options, errorCorrection: 'H' };
      }
    } else {
      update.logo = { ...state.logo, enabled: false };
    }

    onChange(update);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Tap a template to instantly style your QR code.</p>
      <div className="grid grid-cols-3 gap-2">
        {QR_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 touch-manipulation min-h-[72px] ${
              state.templateId === t.id
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-border/40 bg-card/50 hover:bg-card/80'
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            <span className="text-[10px] font-medium text-foreground/80 leading-tight text-center">{t.name}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center">
        ⚠️ Customised QR codes may be harder to scan. Always test before printing.
      </p>
    </div>
  );
}
