import type { CSSProperties } from 'react';
import type { TemplateCustomization } from '@/types/resume';

export const getDefaultCustomization = (): TemplateCustomization => ({
  accentColor: '#1e40af',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  fontSize: 'medium',
  layout: 'single',
  spacing: 'normal',
  margins: 'normal',
});

export interface PresetPalette {
  name: string;
  color: string;
}

export const PRESET_PALETTES: PresetPalette[] = [
  { name: 'Professional', color: '#1e3a5f' },
  { name: 'Creative', color: '#0d9488' },
  { name: 'Bold', color: '#dc2626' },
  { name: 'Warm', color: '#92400e' },
  { name: 'Cool', color: '#3b82f6' },
  { name: 'Nature', color: '#15803d' },
  { name: 'Royal', color: '#7c3aed' },
  { name: 'Mono', color: '#171717' },
];

export interface FontOption {
  value: string;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: 'Inter', label: 'Inter' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Lato, sans-serif', label: 'Lato' },
];

const FONT_SIZE_MULTIPLIER: Record<string, number> = {
  small: 0.9,
  medium: 1,
  large: 1.1,
};

const SPACING_PX: Record<string, number> = {
  compact: 12,
  normal: 20,
  spacious: 28,
};

const MARGIN_PX: Record<string, number> = {
  narrow: 24,
  normal: 40,
  wide: 56,
};

export function applyCustomizationCSS(c: TemplateCustomization | undefined): CSSProperties {
  if (!c) return {};
  const mul = FONT_SIZE_MULTIPLIER[c.fontSize] ?? 1;
  return {
    '--custom-accent': c.accentColor,
    fontFamily: c.fontBody,
    fontSize: `${mul}em`,
    padding: `${MARGIN_PX[c.margins] ?? 40}px`,
    gap: `${SPACING_PX[c.spacing] ?? 20}px`,
  } as CSSProperties;
}

export function headingStyle(c: TemplateCustomization | undefined): CSSProperties {
  if (!c) return {};
  return {
    fontFamily: c.fontHeading,
    color: c.accentColor,
  };
}
