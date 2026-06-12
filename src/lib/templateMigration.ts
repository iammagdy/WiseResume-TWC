import type { TemplateId } from '@/types/resume';
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';

export const LEGACY_TEMPLATE_FALLBACKS: Record<string, TemplateId> = {
  corporate: 'classic',
  zen: 'minimal',
  mono: 'minimal',
  cyber: 'devops',
  startup: 'modern',
  infographic: 'clean',
};

const VALID_TEMPLATE_IDS = new Set<string>([
  'wiseresume-classic',
  'modern', 'classic', 'minimal', 'professional', 'developer', 'creative',
  'executive', 'compact', 'academic', 'healthcare', 'sales', 'elegant',
  'banking', 'consulting', 'federal', 'legal', 'marketing', 'designer',
  'portfolio', 'data-science', 'devops', 'product', 'clean', 'swiss',
  'bento', 'brutalist', 'bold-type',
]);

/**
 * Maps a potentially stale/legacy template ID to a valid current TemplateId.
 * Falls back to the current default for any unknown ID not in the allowlist.
 */
export function migrateTemplateId(id: string | null | undefined): TemplateId {
  if (!id) return DEFAULT_RESUME_TEMPLATE_ID;
  if (LEGACY_TEMPLATE_FALLBACKS[id]) return LEGACY_TEMPLATE_FALLBACKS[id];
  if (VALID_TEMPLATE_IDS.has(id)) return id as TemplateId;
  return DEFAULT_RESUME_TEMPLATE_ID;
}
