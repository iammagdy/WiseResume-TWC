import type { TemplateId } from '@/types/resume';

export const WISERESUME_CLASSIC_WIDTH = 816;
export const WISERESUME_CLASSIC_HEIGHT = 1056;

export function getTemplateDesignDimensions(
  templateId: TemplateId | string | null | undefined,
  pageFormat: string = 'letter',
): { pageWidth: number; pageHeight: number } {
  if (templateId === 'wiseresume-classic' && pageFormat === 'letter') {
    return { pageWidth: WISERESUME_CLASSIC_WIDTH, pageHeight: WISERESUME_CLASSIC_HEIGHT };
  }

  if (pageFormat === 'a4') return { pageWidth: 595, pageHeight: 842 };
  return { pageWidth: 612, pageHeight: 792 };
}
