import { PAGE_FORMAT_PX } from '@/lib/templateCustomization';

export { PAGE_FORMAT_PX };

export const DEFAULT_PAGE_WIDTH = 612;
export const DEFAULT_PAGE_HEIGHT = 792;
export const FOOTER_RESERVED_PT = 44;

export interface PDFDimensions {
  sourceWidth: number;
  totalHeight: number;
  globalScaleFactor: number;
  sourceHeightPerPage: number;
}

export class PdfGenerationError extends Error {
  code: 'MISSING_ELEMENT' | 'UNKNOWN';

  constructor(message: string, code: PdfGenerationError['code'] = 'UNKNOWN') {
    super(message);
    this.name = 'PdfGenerationError';
    this.code = code;
  }
}

export function prepareForMeasure(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
): () => void {
  const originalStyles = {
    width: sourceElement.style.width,
    maxWidth: sourceElement.style.maxWidth,
    transform: sourceElement.style.transform,
  };
  const parentOverflows: { el: HTMLElement; overflow: string }[] = [];
  let parent = sourceElement.parentElement;
  while (parent) {
    parentOverflows.push({ el: parent, overflow: parent.style.overflow });
    parent.style.overflow = 'visible';
    parent = parent.parentElement;
  }
  sourceElement.style.width = `${pageWidth}px`;
  sourceElement.style.maxWidth = `${pageWidth}px`;
  sourceElement.style.transform = 'none';
  sourceElement.offsetHeight;
  return () => {
    sourceElement.style.width = originalStyles.width;
    sourceElement.style.maxWidth = originalStyles.maxWidth;
    sourceElement.style.transform = originalStyles.transform;
    parentOverflows.forEach(({ el, overflow }) => {
      el.style.overflow = overflow;
    });
  };
}

export function getTemplateSourceElement(templateElement?: HTMLElement | null): HTMLElement {
  let sourceElement = templateElement;

  if (!sourceElement) {
    sourceElement = document.querySelector('[data-resume-template]') as HTMLElement;
  }

  if (!sourceElement) {
    sourceElement = document.querySelector('.bg-white.text-black.mx-auto.shadow-2xl') as HTMLElement;
  }

  if (!sourceElement) {
    throw new PdfGenerationError('Resume template not found. Please ensure the preview is visible.', 'MISSING_ELEMENT');
  }

  return sourceElement;
}

export function calculatePDFDimensions(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT,
): PDFDimensions {
  const sourceWidth = Math.max(sourceElement.offsetWidth || pageWidth, pageWidth / 2);
  const totalHeight = Math.max(
    sourceElement.scrollHeight || sourceElement.offsetHeight || pageHeight,
    pageHeight / 2,
  );
  const globalScaleFactor = pageWidth / sourceWidth;
  const sourceHeightPerPage = pageHeight / globalScaleFactor;

  return {
    sourceWidth,
    totalHeight,
    globalScaleFactor,
    sourceHeightPerPage,
  };
}

export function estimatePageCount(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT,
): number {
  const { sourceHeightPerPage, totalHeight } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);
  if (totalHeight <= sourceHeightPerPage * 1.05) return 1;
  return Math.ceil(totalHeight / sourceHeightPerPage);
}

export function estimateOnePageScale(templateElement: HTMLElement, pageFormat?: 'a4' | 'letter'): number {
  const format = pageFormat || 'letter';
  const dims = PAGE_FORMAT_PX[format] || PAGE_FORMAT_PX.letter;
  const pageWidth = dims?.width || DEFAULT_PAGE_WIDTH;
  const pageHeight = dims?.height || DEFAULT_PAGE_HEIGHT;
  const printableHeight = pageHeight - FOOTER_RESERVED_PT;

  const cleanup = prepareForMeasure(templateElement, pageWidth);
  try {
    const { totalHeight, globalScaleFactor } = calculatePDFDimensions(templateElement, pageWidth, pageHeight);
    const pdfContentHeight = totalHeight * globalScaleFactor;
    const fitScale = pdfContentHeight > printableHeight
      ? printableHeight / pdfContentHeight
      : 1;
    return Math.round(fitScale * 100);
  } finally {
    cleanup();
  }
}
