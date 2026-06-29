import type { ResumeData, TemplateCustomization } from '@/types/resume';
import { normalizeLocale, type SupportedLocale } from './core';

export function getDocumentLocale(
  resume: Pick<ResumeData, 'customization'> | null | undefined,
): SupportedLocale {
  return normalizeLocale(resume?.customization?.documentLocale) ?? 'en';
}

export function getLayoutFingerprint(
  templateId: string,
  customization: Partial<TemplateCustomization> | null | undefined,
): string {
  const locale = normalizeLocale(customization?.documentLocale) ?? 'en';
  return [
    `template=${templateId}`,
    `format=${customization?.pageFormat ?? 'letter'}`,
    `locale=${locale}`,
    `heading=${customization?.fontHeading ?? 'default'}`,
    `body=${customization?.fontBody ?? 'default'}`,
    `scale=${customization?.fontScale ?? 1}`,
  ].join('|');
}

export function getPageCutsForLayout(
  templateId: string,
  customization: Partial<TemplateCustomization> | null | undefined,
): number[] {
  if (!customization) return [];
  const fingerprint = getLayoutFingerprint(templateId, customization);
  const fingerprintedCuts = customization.pageCutsByFingerprint?.[fingerprint];
  if (fingerprintedCuts) return [...fingerprintedCuts];

  const locale = normalizeLocale(customization.documentLocale) ?? 'en';
  return locale === 'en' ? [...(customization.customBreakPositions ?? [])] : [];
}

export function setPageCutsForLayout(
  templateId: string,
  customization: TemplateCustomization,
  positions: number[],
): TemplateCustomization {
  const fingerprint = getLayoutFingerprint(templateId, customization);
  const next: TemplateCustomization = {
    ...customization,
    pageCutsByFingerprint: {
      ...customization.pageCutsByFingerprint,
      [fingerprint]: [...positions],
    },
  };

  if ((normalizeLocale(customization.documentLocale) ?? 'en') === 'en') {
    next.customBreakPositions = [...positions];
  } else {
    delete next.customBreakPositions;
  }
  return next;
}
