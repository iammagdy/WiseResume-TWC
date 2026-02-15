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
  lineHeight: '1.15',
  pageFormat: 'a4',
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

export const LINE_HEIGHT_VALUES: Record<string, number> = {
  single: 1,
  '1.15': 1.15,
  '1.5': 1.5,
  double: 2,
};

export const PAGE_FORMAT_PX: Record<string, { width: number; height: number }> = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
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
    lineHeight: LINE_HEIGHT_VALUES[c.lineHeight] ?? 1.15,
  } as CSSProperties;
}

export function headingStyle(c: TemplateCustomization | undefined): CSSProperties {
  if (!c) return {};
  return {
    fontFamily: c.fontHeading,
    color: c.accentColor,
  };
}

/**
 * Generates a CSS string that overrides hardcoded template colors and fonts
 * using the user's customization choices. Injected as a <style> tag inside
 * the resume wrapper so it applies regardless of template-specific Tailwind classes.
 */
export function generateCustomizationCSS(c: TemplateCustomization | undefined): string {
  if (!c) return '';

  const accent = c.accentColor || '#1e40af';
  const fontBody = c.fontBody || 'Inter';
  const fontHeading = c.fontHeading || 'Inter';

  return `
    [data-resume-template] {
      font-family: ${fontBody} !important;
    }
    [data-resume-template] h1,
    [data-resume-template] h2,
    [data-resume-template] h3 {
      font-family: ${fontHeading} !important;
    }
    [data-resume-template] h2 {
      color: ${accent} !important;
    }
    [data-resume-template] h1 {
      color: ${accent} !important;
    }
    [data-resume-template] header {
      border-color: ${accent} !important;
    }
    [data-resume-template] [class*="border-"] {
      border-color: ${accent} !important;
    }
    [data-resume-template] [class*="bg-"][class*="-600"],
    [data-resume-template] [class*="bg-"][class*="-700"],
    [data-resume-template] [class*="bg-"][class*="-800"],
    [data-resume-template] [class*="bg-"][class*="-900"] {
      background-color: ${accent} !important;
    }
    [data-resume-template] [class*="text-"][class*="-600"],
    [data-resume-template] [class*="text-"][class*="-700"],
    [data-resume-template] [class*="text-"][class*="-800"] {
      color: ${accent} !important;
    }
    [data-resume-template] .divide-y > * + * {
      border-color: ${accent}33 !important;
    }
  `;
}
