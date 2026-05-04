import type { TemplateId } from '@/types/resume';

export const LEGACY_TEMPLATE_FALLBACKS: Record<string, TemplateId> = {
  corporate: 'classic',
  zen: 'minimal',
  mono: 'minimal',
  cyber: 'devops',
  startup: 'modern',
  infographic: 'clean',
};

/**
 * Maps a potentially stale/legacy template ID to a valid current TemplateId.
 * Returns the same value cast to TemplateId when no migration is needed.
 */
export function migrateTemplateId(id: string | null | undefined): TemplateId {
  if (!id) return 'modern';
  return (LEGACY_TEMPLATE_FALLBACKS[id] ?? id) as TemplateId;
}
