import type { QRCustomizationState } from './qr-types';

/** Convert hex to [r,g,b] */
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

/** Relative luminance per WCAG */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ScannabilityWarning {
  type: 'contrast' | 'logo-size' | 'error-correction';
  message: string;
}

/** Generate scannability warnings for the current state */
export function getScannabilityWarnings(state: QRCustomizationState): ScannabilityWarning[] {
  const warnings: ScannabilityWarning[] = [];

  // Contrast check — use gradient "from" color if gradient is active
  const fgColor = state.gradient.enabled ? state.gradient.from : state.foregroundColor;
  const ratio = contrastRatio(fgColor, state.backgroundColor);
  if (ratio < 3) {
    warnings.push({
      type: 'contrast',
      message: `Low contrast (${ratio.toFixed(1)}:1). QR may be hard to scan.`,
    });
  }

  // Logo size
  if (state.logo.enabled && state.logo.sizePercent > 30) {
    warnings.push({
      type: 'logo-size',
      message: 'Logo is large (>30%). Consider reducing for better scannability.',
    });
  }

  // Error correction too low with logo
  if (state.logo.enabled && state.options.errorCorrection === 'L') {
    warnings.push({
      type: 'error-correction',
      message: 'Error correction "L" with a logo may reduce scannability. Use "H".',
    });
  }

  return warnings;
}
