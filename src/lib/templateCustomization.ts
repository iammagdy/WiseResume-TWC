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
  // Master toggle: when explicitly OFF, emit no inline overrides so the
  // template renders with its designer styling regardless of any other
  // (possibly dirty) saved fields.
  if (c.enabled === false) return {};
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
  if (c.enabled === false) return {};
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
  // Master toggle: when explicitly OFF, emit no CSS overrides so the
  // template renders 100% as the designer built it. This is also the
  // user's escape hatch for any dirty data persisted from earlier
  // versions of the customization panel.
  if (c.enabled === false) return '';

  // IMPORTANT: every override block is gated on the relevant field being
  // EXPLICITLY set. Previously these used `||` fallbacks (e.g. accent
  // defaulted to '#1e40af'), which meant that touching ANY customization
  // field (e.g. headerAlign) silently re-painted every Tailwind gray-*
  // text class to blue. With this gating, untouched fields produce no CSS,
  // so the template's natural styling is preserved.
  const accentBlock = c.accentColor ? `
    [data-resume-template] h2 { color: ${c.accentColor} !important; }
    [data-resume-template] h1 { color: ${c.accentColor} !important; }
    [data-resume-template] header { border-color: ${c.accentColor} !important; }
    [data-resume-template] [class*="border-"] { border-color: ${c.accentColor} !important; }
    [data-resume-template] [class*="bg-"][class*="-600"],
    [data-resume-template] [class*="bg-"][class*="-700"],
    [data-resume-template] [class*="bg-"][class*="-800"],
    [data-resume-template] [class*="bg-"][class*="-900"] {
      background-color: ${c.accentColor} !important;
    }
    [data-resume-template] [class*="text-"][class*="-600"],
    [data-resume-template] [class*="text-"][class*="-700"],
    [data-resume-template] [class*="text-"][class*="-800"] {
      color: ${c.accentColor} !important;
    }
    [data-resume-template] .divide-y > * + * { border-color: ${c.accentColor}33 !important; }
  ` : '';

  const fontBodyBlock = c.fontBody ? `
    [data-resume-template] { font-family: ${c.fontBody} !important; }
  ` : '';

  const fontHeadingBlock = c.fontHeading ? `
    [data-resume-template] h1,
    [data-resume-template] h2,
    [data-resume-template] h3 { font-family: ${c.fontHeading} !important; }
  ` : '';

  // Templates use the standard 9 Tailwind text-* utility classes, which are
  // rem-based (relative to <html>) — so a wrapper-level font-size change has
  // no effect, and CSS `zoom` shrinks the entire layout (page width, padding,
  // images) instead of just the text. The fix is to scale ONLY the text-*
  // class values via a CSS variable, leaving page width, padding, and images
  // untouched. Result: text shrinks, the rendered DOM gets shorter, and the
  // page-count badge drops accordingly.
  const fontScaleBlock = typeof c.fontScale === 'number' ? `
    [data-resume-template] { --font-scale: ${c.fontScale}; }
    [data-resume-template] .text-xs   { font-size: calc(0.75rem  * var(--font-scale)) !important; }
    [data-resume-template] .text-sm   { font-size: calc(0.875rem * var(--font-scale)) !important; }
    [data-resume-template] .text-base { font-size: calc(1rem     * var(--font-scale)) !important; }
    [data-resume-template] .text-lg   { font-size: calc(1.125rem * var(--font-scale)) !important; }
    [data-resume-template] .text-xl   { font-size: calc(1.25rem  * var(--font-scale)) !important; }
    [data-resume-template] .text-2xl  { font-size: calc(1.5rem   * var(--font-scale)) !important; }
    [data-resume-template] .text-3xl  { font-size: calc(1.875rem * var(--font-scale)) !important; }
    [data-resume-template] .text-4xl  { font-size: calc(2.25rem  * var(--font-scale)) !important; }
    [data-resume-template] .text-5xl  { font-size: calc(3rem     * var(--font-scale)) !important; }
  ` : '';

  // Templates space sections via the previous section's bottom margin
  // (e.g. `<section class="mb-5">`), not the next section's top margin.
  // Override margin-bottom on every [data-section] so the user's gap value
  // actually replaces the template's spacing instead of stacking on top.
  const sectionGapBlock = typeof c.sectionGap === 'number' ? `
    [data-resume-template] [data-section] { margin-bottom: ${c.sectionGap}px !important; }
    [data-resume-template] [data-section]:last-child { margin-bottom: 0 !important; }
  ` : '';

  const entryGapBlock = typeof c.entryGap === 'number' ? `
    [data-resume-template] [data-break-avoid] + [data-break-avoid] {
      margin-top: ${c.entryGap}px !important;
    }
  ` : '';

  const headerAlignBlock = c.headerAlign ? `
    [data-resume-template] header { text-align: ${c.headerAlign} !important; }
    ${c.headerAlign === 'center' || c.headerAlign === 'right' ? `
      [data-resume-template] header > * {
        justify-content: ${c.headerAlign === 'center' ? 'center' : 'flex-end'} !important;
      }
    ` : ''}
  ` : '';

  return `
    ${fontBodyBlock}
    ${fontHeadingBlock}
    ${accentBlock}
    ${headerAlignBlock}
    ${fontScaleBlock}
    ${sectionGapBlock}
    ${entryGapBlock}
  `;
}
