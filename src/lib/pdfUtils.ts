/**
 * Lightweight PDF utility exports that do NOT import html2canvas or pdf-lib.
 * Use this instead of importing from pdfGenerator.ts to avoid pulling ~200KB
 * of heavy dependencies into page chunks that don't need them.
 */

import { SectionId } from '@/types/resume';

/** Typed error class for programmatic handling of PDF generation failures. */
export class PdfGenerationError extends Error {
  code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'UNKNOWN';
  constructor(message: string, code: PdfGenerationError['code'] = 'UNKNOWN') {
    super(message);
    this.name = 'PdfGenerationError';
    this.code = code;
  }
}

/**
 * Gets sections in their actual DOM order (for UI ordering).
 * Returns section IDs based on visual layout position.
 *
 * This is a standalone re-implementation that does NOT import from pdfGenerator
 * so it can be used in page-level code without pulling in html2canvas/pdf-lib.
 */
export function getSectionsInDOMOrder(sourceElement: HTMLElement): SectionId[] {
  const sectionElements = sourceElement.querySelectorAll('[data-section]');
  const sections: { id: SectionId; top: number }[] = [];

  sectionElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    let top = 0;
    let curr: HTMLElement | null = htmlEl;
    while (curr && curr !== sourceElement && sourceElement.contains(curr)) {
      top += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    sections.push({ id: htmlEl.getAttribute('data-section') as SectionId, top });
  });

  sections.sort((a, b) => a.top - b.top);
  return sections.map(s => s.id);
}

/**
 * Estimates the scale percentage for one-page PDF export without generating a PDF.
 * Returns a number 1–100 representing the percentage (e.g., 67 means 67% scale).
 *
 * NOTE: This requires measuring the live DOM so it performs element mutations.
 * It does NOT import html2canvas or pdf-lib.
 */
export function estimateOnePageScale(
  templateElement: HTMLElement,
  pageFormat: 'a4' | 'letter' = 'letter',
): number {
  const PAGE_FORMATS: Record<string, { width: number; height: number }> = {
    a4: { width: 595, height: 842 },
    letter: { width: 612, height: 792 },
  };
  const FOOTER_RESERVED_PT = 44;
  const dims = PAGE_FORMATS[pageFormat] || PAGE_FORMATS['letter'];
  const pw = dims.width;
  const ph = dims.height;
  const printable = ph - FOOTER_RESERVED_PT;

  // Temporarily fix width for measurement
  const orig = {
    width: templateElement.style.width,
    maxWidth: templateElement.style.maxWidth,
    transform: templateElement.style.transform,
  };
  templateElement.style.width = `${pw}px`;
  templateElement.style.maxWidth = `${pw}px`;
  templateElement.style.transform = 'none';
  // force reflow
  templateElement.offsetHeight;

  try {
    const sourceWidth = Math.max(templateElement.offsetWidth || pw, pw / 2);
    const totalHeight = Math.max(
      templateElement.scrollHeight || templateElement.offsetHeight || ph,
      ph / 2,
    );
    const globalScale = pw / sourceWidth;
    const pdfContentHeight = totalHeight * globalScale;
    const fitScale = pdfContentHeight > printable ? printable / pdfContentHeight : 1;
    return Math.round(fitScale * 100);
  } finally {
    templateElement.style.width = orig.width;
    templateElement.style.maxWidth = orig.maxWidth;
    templateElement.style.transform = orig.transform;
  }
}
