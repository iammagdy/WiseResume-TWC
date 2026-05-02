import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';
import { CompactTemplate } from './CompactTemplate';
import { CreativeTemplate } from './CreativeTemplate';

/**
 * Cover letter template registry.
 *
 * - Persisted values currently in production: `professional`, `modern`,
 *   `minimal` (created via the 2026-02-14 migration with default
 *   `professional`).
 * - This task adds two new visual styles: `compact` and `creative`.
 * - `professional` is the legacy default and is presented to users as
 *   "Classic" so the picker reads naturally. `minimal` is no longer
 *   surfaced in the picker but still renders correctly for any existing
 *   rows that have it (aliased to Classic to keep things quiet).
 */

export type CoverLetterTemplateStyle =
  | 'professional'
  | 'modern'
  | 'minimal'
  | 'compact'
  | 'creative';

export interface CoverLetterTemplateProps {
  /** Job title, or the user-provided letter title — whichever is most descriptive. */
  title: string;
  company: string | null;
  /** Letter body text. Whitespace is preserved by every template. */
  content: string;
  /** Pre-formatted date string (callers pass `format(date, 'MMMM d, yyyy')`). */
  dateLabel: string;
  /** Optional hex accent color from the linked resume's customization. */
  accentHex?: string | null;
}

export interface TemplateOption {
  value: CoverLetterTemplateStyle;
  label: string;
  description: string;
}

/** Visible options shown in the template picker — exactly 4 per the spec. */
export const COVER_LETTER_TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: 'professional', label: 'Classic', description: 'Centred serif, accent rule' },
  { value: 'modern', label: 'Modern', description: 'Coloured sidebar header' },
  { value: 'compact', label: 'Compact', description: 'Tight, single-column scan' },
  { value: 'creative', label: 'Creative', description: 'Gradient header, bold title' },
];

const components = {
  professional: ClassicTemplate,
  modern: ModernTemplate,
  minimal: ClassicTemplate, // legacy alias — keeps quiet visual
  compact: CompactTemplate,
  creative: CreativeTemplate,
} as const satisfies Record<CoverLetterTemplateStyle, React.ComponentType<CoverLetterTemplateProps>>;

/**
 * Resolve the renderer for a given persisted style value. Returns
 * `null` when the value is null/empty so callers can fall back to the
 * legacy plain-text renderer (preserves the pre-gallery look for old
 * letters that were never tagged).
 */
export function resolveCoverLetterTemplate(
  style: string | null | undefined,
): React.ComponentType<CoverLetterTemplateProps> | null {
  if (!style) return null;
  return components[style as CoverLetterTemplateStyle] ?? null;
}

export const COVER_LETTER_TEMPLATES = components;
