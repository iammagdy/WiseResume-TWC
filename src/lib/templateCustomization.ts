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

  // Templates build vertical real-estate from THREE things: (1) text-* font
  // size, (2) leading-* line height, (3) spacing utility classes
  // (mb-*, mt-*, p-*, py-*, gap-*, space-y-*). To make `fontScale` actually
  // reduce page count (rather than just shrinking characters in the same
  // vertical strips), we scale ALL THREE in lockstep via a single
  // `--compact-scale` CSS variable — gated on `[data-resume-template]` so it
  // never leaks into the surrounding editor UI. See `useFitToPages` for the
  // auto-fit measurement loop that drives `fontScale` from a target page
  // count.
  const fontScaleBlock = typeof c.fontScale === 'number' ? buildCompactScaleBlock(c.fontScale) : '';

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

/** Min/max range for the auto-fit / fontScale knob. Below MIN, line height
 *  collapses below 1.0 which makes ascenders touch the line above; above MAX
 *  the panel is offering "make my resume bigger", which we don't expose. */
export const COMPACT_SCALE_MIN = 0.6;
export const COMPACT_SCALE_MAX = 1.0;

/** Tailwind spacing scale, in rem (1 unit = 0.25rem). Only the keys actually
 *  used by the templates are listed — see the grep that produced this list. */
const SPACING_REM: Record<string, number> = {
  '0': 0,
  '0.5': 0.125,
  '1': 0.25,
  '1.5': 0.375,
  '2': 0.5,
  '3': 0.75,
  '4': 1,
  '5': 1.25,
  '6': 1.5,
  '8': 2,
  '10': 2.5,
};

/** Tailwind line-height keyword scale (unitless). */
const LEADING_KEYWORDS: Record<string, number> = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  // 'normal' deliberately omitted — many shadcn UI elements live inside the
  // resume preview wrapper as `leading-normal`; rescaling it would tweak
  // unrelated UI. Templates don't use leading-normal directly.
  relaxed: 1.625,
  loose: 2,
};

/** Build the CSS block that scales font size, line height, and spacing
 *  utility classes by `--compact-scale`. Selector is gated on
 *  `[data-resume-template]` so it cannot leak into the surrounding editor UI.
 *  Result: shrinking the scale shrinks BOTH characters AND the vertical strips
 *  they live in, which is what makes auto-fit / Font Size actually reduce
 *  page count. */
function buildCompactScaleBlock(scale: number): string {
  // Clamp defensively — the panel and useFitToPages already clamp, but a
  // dirty persisted value should still produce sensible CSS rather than
  // collapsing the layout.
  const s = Math.max(COMPACT_SCALE_MIN, Math.min(COMPACT_SCALE_MAX, scale));

  // text-* classes (Tailwind defaults). Multiplying the literal rem value by
  // the variable gives the compact font size while keeping the resume's
  // physical width and image dimensions untouched.
  const textClasses: Array<[string, number]> = [
    ['text-xs', 0.75],
    ['text-sm', 0.875],
    ['text-base', 1],
    ['text-lg', 1.125],
    ['text-xl', 1.25],
    ['text-2xl', 1.5],
    ['text-3xl', 1.875],
    ['text-4xl', 2.25],
    ['text-5xl', 3],
  ];
  const textRules = textClasses
    .map(([cls, rem]) => `[data-resume-template] .${cls} { font-size: calc(${rem}rem * var(--compact-scale)) !important; }`)
    .join('\n    ');

  // leading-* keyword classes — overriding line-height so each line of text
  // occupies less vertical space at smaller scale. Without this, shrinking
  // the font barely changes page count because line-height stays anchored.
  const leadingRules = Object.entries(LEADING_KEYWORDS)
    .map(([k, lh]) => `[data-resume-template] .leading-${k} { line-height: calc(${lh} * var(--compact-scale)) !important; }`)
    .join('\n    ');

  // Spacing utility classes used by the templates. Each rule recomputes the
  // class's natural rem value times --compact-scale. We intentionally only
  // override the directional/property variants the templates actually use
  // (mb-*, mt-*, p-*, py-*, px-*, gap-*, space-y-*) to keep the emitted CSS
  // small and avoid touching unrelated utilities a future template might add.
  const spacingProps: Array<[string, string]> = [
    ['mb', 'margin-bottom'],
    ['mt', 'margin-top'],
    // pb/pt/pl/pr — directional padding. pb-* in particular drives a lot of
    // section spacing in our templates (45+ occurrences) and was missing
    // from the first pass, which made auto-fit under-shrink on those.
    ['pb', 'padding-bottom'],
    ['pt', 'padding-top'],
    ['pl', 'padding-left'],
    ['pr', 'padding-right'],
    ['p', 'padding'],
    ['py', 'padding-block'],
    ['px', 'padding-inline'],
    ['gap', 'gap'],
    // gap-y / gap-x map to row-gap / column-gap respectively. gap-y in
    // particular contributes to vertical height and must be scaled.
    ['gap-y', 'row-gap'],
    ['gap-x', 'column-gap'],
  ];
  const spacingRules = spacingProps.flatMap(([prefix, prop]) =>
    Object.entries(SPACING_REM).map(([n, rem]) =>
      rem === 0
        ? `[data-resume-template] .${prefix}-${n} { ${prop}: 0 !important; }`
        : `[data-resume-template] .${prefix}-${n} { ${prop}: calc(${rem}rem * var(--compact-scale)) !important; }`
    )
  ).join('\n    ');

  // space-y-* applies margin-top to every adjacent sibling after the first
  // (`> :not([hidden]) ~ :not([hidden])`). Tailwind's exact selector matters
  // for specificity ties, so we mirror it.
  const spaceYRules = Object.entries(SPACING_REM)
    .map(([n, rem]) =>
      rem === 0
        ? `[data-resume-template] .space-y-${n} > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }`
        : `[data-resume-template] .space-y-${n} > :not([hidden]) ~ :not([hidden]) { margin-top: calc(${rem}rem * var(--compact-scale)) !important; }`
    )
    .join('\n    ');

  return `
    [data-resume-template] { --compact-scale: ${s}; }
    ${textRules}
    ${leadingRules}
    ${spacingRules}
    ${spaceYRules}
  `;
}
