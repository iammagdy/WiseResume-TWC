export type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
export type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'dot';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type ExportFormat = 'png' | 'svg';

export interface QRGradient {
  enabled: boolean;
  type: 'linear' | 'radial';
  from: string;
  to: string;
  angle: number;
}

export interface QRModuleStyle {
  shape: DotType;
  roundness: number; // 0-1, used conceptually (shape presets map to this)
}

export interface QRLogo {
  src?: string;
  enabled: boolean;
  sizePercent: number; // 10-35
  safeZone: boolean;
}

export interface QREyes {
  shape: CornerSquareType;
  innerShape: CornerDotType;
  outerColor: string;
  innerColor: string;
  syncWithForeground: boolean;
}

export interface QROptions {
  errorCorrection: ErrorCorrectionLevel;
  sizePx: number;
  quietZone: number; // 0-40
  format: ExportFormat;
}

export interface QRCustomizationState {
  data: string;
  templateId?: string;
  foregroundColor: string;
  backgroundColor: string;
  gradient: QRGradient;
  moduleStyle: QRModuleStyle;
  logo: QRLogo;
  eyes: QREyes;
  options: QROptions;
}

export interface QRTemplate {
  id: string;
  name: string;
  emoji: string;
  foregroundColor: string;
  backgroundColor: string;
  gradient?: Partial<QRGradient>;
  moduleStyle: QRModuleStyle;
  eyes: Partial<QREyes>;
  logo?: Partial<QRLogo>;
}

export const DEFAULT_QR_STATE: Omit<QRCustomizationState, 'data'> = {
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  gradient: { enabled: false, type: 'linear', from: '#a855f7', to: '#ec4899', angle: 135 },
  moduleStyle: { shape: 'square', roundness: 0 },
  logo: { enabled: false, sizePercent: 25, safeZone: true },
  eyes: { shape: 'square', innerShape: 'square', outerColor: '#000000', innerColor: '#000000', syncWithForeground: true },
  options: { errorCorrection: 'M', sizePx: 1024, quietZone: 10, format: 'png' },
};
