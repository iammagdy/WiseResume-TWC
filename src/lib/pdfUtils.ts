/**
 * Lightweight PDF utility exports that do NOT import html2canvas or pdf-lib.
 * Use this instead of importing from pdfGenerator.ts to avoid pulling ~200KB
 * of heavy dependencies into page chunks that don't need them.
 */

import { SectionId } from '@/types/resume';

// Page dimensions (points / CSS pixels — same unit system)
const DEFAULT_PAGE_WIDTH = 612;
const DEFAULT_PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44; // Keep in sync with pdfGenerator.ts

const PAGE_FORMATS: Record<string, { width: number; height: number }> = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
};

/** Resolves page width and height from a page format string. */
export function getPageDimensionsForFormat(
  pageFormat: string = 'letter'
): { pageWidth: number; pageHeight: number } {
  const dims = PAGE_FORMATS[pageFormat] || PAGE_FORMATS['letter'];
  return { pageWidth: dims.width, pageHeight: dims.height };
}

/**
 * Calculates the effective source-space height per PDF page, matching pdfGenerator logic.
 * sourceHeightPerPage = pageHeight / (pageWidth / sourceWidth)
 */
function calcSourceHeightPerPage(
  sourceElement: HTMLElement,
  pageWidth: number,
  pageHeight: number
): { sourceHeightPerPage: number; totalHeight: number } {
  const sourceWidth = Math.max(sourceElement.offsetWidth || pageWidth, pageWidth / 2);
  const totalHeight = Math.max(
    sourceElement.scrollHeight || sourceElement.offsetHeight || pageHeight,
    pageHeight / 2
  );
  const globalScaleFactor = pageWidth / sourceWidth;
  const sourceHeightPerPage = pageHeight / globalScaleFactor;
  return { sourceHeightPerPage, totalHeight };
}

/**
 * Accumulates offsetTop relative to a root ancestor, ignoring CSS transforms.
 * This gives layout coordinates unaffected by zoom/scale on parent containers.
 */
function getOffsetTopRelative(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== root && root.contains(curr)) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  return top;
}

/**
 * Snaps fixed-interval break positions to avoid splitting elements marked with
 * [data-break-avoid], using the same algorithm as pdfGenerator.snapBreaksToContent.
 * Uses offsetTop-based layout coordinates (not getBoundingClientRect) so results
 * are consistent regardless of any CSS zoom/scale transform on parent containers.
 */
function snapBreaksToContentLight(
  fixedBreaks: number[],
  sourceElement: HTMLElement,
  sourceHeightPerPage: number
): number[] {
  interface Boundary { top: number; bottom: number; el: HTMLElement }

  const sectionEls = sourceElement.querySelectorAll('[data-section]');
  const sectionBounds: Boundary[] = [];
  sectionEls.forEach(el => {
    const htmlEl = el as HTMLElement;
    const top = getOffsetTopRelative(htmlEl, sourceElement);
    sectionBounds.push({ top, bottom: top + htmlEl.offsetHeight, el: htmlEl });
  });
  sectionBounds.sort((a, b) => a.top - b.top);

  const avoidEls = sourceElement.querySelectorAll('[data-break-avoid]');
  const entryBounds: Boundary[] = [];
  avoidEls.forEach(el => {
    const htmlEl = el as HTMLElement;
    const top = getOffsetTopRelative(htmlEl, sourceElement);
    entryBounds.push({ top, bottom: top + htmlEl.offsetHeight, el: htmlEl });
  });
  entryBounds.sort((a, b) => a.top - b.top);

  if (!sectionBounds.length && !entryBounds.length) return fixedBreaks;

  const hasValidLayout =
    sectionBounds.some(b => b.bottom > 0) || entryBounds.some(b => b.bottom > 0);
  if (!hasValidLayout) return fixedBreaks;

  const maxShift = Math.min(sourceHeightPerPage * 0.50, 350);
  const HEADING_GUARD = 60;

  const snapOne = (breakY: number): number => {
    const sectionHit = sectionBounds.find(b => breakY > b.top && breakY < b.bottom);
    if (sectionHit) {
      const sectionHeight = sectionHit.bottom - sectionHit.top;
      if (sectionHeight < sourceHeightPerPage) return sectionHit.top;
      if (breakY - sectionHit.top < HEADING_GUARD) return sectionHit.top;
    }

    const hit = entryBounds.find(b => breakY > b.top && breakY < b.bottom);
    if (!hit) return breakY;

    const hitHeight = hit.bottom - hit.top;
    if (hitHeight < sourceHeightPerPage) return hit.top;

    const entryMaxShift = Math.max(maxShift, hitHeight * 0.15);
    const markedChildren = hit.el.querySelectorAll('[data-break-child]');
    if (markedChildren.length > 0) {
      let bestSnap = breakY;
      let bestDist = Infinity;
      markedChildren.forEach(child => {
        const childEl = child as HTMLElement;
        const childTop = getOffsetTopRelative(childEl, sourceElement);
        const dist = Math.abs(childTop - breakY);
        if (dist < bestDist && dist <= entryMaxShift) { bestDist = dist; bestSnap = childTop; }
      });
      if (bestSnap !== breakY) return bestSnap;
    }

    const genericChildren = Array.from(hit.el.children);
    if (genericChildren.length > 1) {
      let bestSnap = breakY;
      let bestDist = Infinity;
      genericChildren.forEach(child => {
        const childEl = child as HTMLElement;
        const childTop = getOffsetTopRelative(childEl, sourceElement);
        const dist = Math.abs(childTop - breakY);
        if (dist < bestDist && dist <= entryMaxShift) { bestDist = dist; bestSnap = childTop; }
      });
      if (bestSnap !== breakY) return bestSnap;
    }

    return breakY;
  };

  const result: number[] = [];
  let prevBreak = 0;
  const totalHeight = sourceElement.scrollHeight || sourceElement.offsetHeight;

  for (let i = 0; i < fixedBreaks.length; i++) {
    let nextBreak = prevBreak + sourceHeightPerPage;
    if (nextBreak >= totalHeight) break;
    const snapped = snapOne(nextBreak);
    // Clamp to [prevBreak + HEADING_GUARD, prevBreak + sourceHeightPerPage] so that
    // downward snaps never create a segment larger than one printable page.
    nextBreak = Math.min(
      Math.max(snapped, prevBreak + HEADING_GUARD),
      prevBreak + sourceHeightPerPage
    );
    if (nextBreak >= totalHeight) break;
    result.push(nextBreak);
    prevBreak = nextBreak;
  }

  return result;
}

/**
 * Computes content-aware page break positions for the live preview,
 * using the same geometry as PDF export.
 * Pagination uses printableHeight (pageHeight - FOOTER_RESERVED_PT) so each
 * content slice maps to the printable area, matching PDF export behaviour.
 */
export function computePreviewBreaks(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): number[] {
  const printableHeight = pageHeight - FOOTER_RESERVED_PT;
  const { sourceHeightPerPage, totalHeight } = calcSourceHeightPerPage(
    sourceElement, pageWidth, printableHeight
  );
  const fixedBreaks: number[] = [];
  for (let y = sourceHeightPerPage; y < totalHeight; y += sourceHeightPerPage) {
    fixedBreaks.push(y);
  }
  return snapBreaksToContentLight(fixedBreaks, sourceElement, sourceHeightPerPage);
}

/**
 * Estimates the number of pages for a resume based on content height.
 * Accepts page dimensions to support different formats (Letter, A4).
 * Uses printableHeight for pagination geometry to match PDF export.
 */
export function estimatePageCount(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): number {
  const printableHeight = pageHeight - FOOTER_RESERVED_PT;
  const { sourceHeightPerPage, totalHeight } = calcSourceHeightPerPage(
    sourceElement, pageWidth, printableHeight
  );
  if (totalHeight <= sourceHeightPerPage * 1.05) return 1;
  return Math.ceil(totalHeight / sourceHeightPerPage);
}

/**
 * Merges user-forced section breaks into an existing smart-break array.
 * For each section name in manualBreakSections, queries [data-section="<name>"]
 * and inserts its offsetTop as a forced break, replacing any nearby smart break
 * (within MIN_GAP px) so there are never two breaks too close together.
 *
 * Uses the same offsetTop-relative coordinate system as computePreviewBreaks
 * so live-preview and PDF coordinates stay in sync.
 */
export function injectForcedBreaks(
  smartBreaks: number[],
  sourceElement: HTMLElement,
  manualBreakSections: string[],
  totalHeight: number,
): number[] {
  if (!manualBreakSections || !manualBreakSections.length) return smartBreaks;

  const MIN_GAP = 40;
  const forced: number[] = [];

  for (const name of manualBreakSections) {
    const el = sourceElement.querySelector(`[data-section="${name}"]`) as HTMLElement | null;
    if (!el) continue;
    const y = getOffsetTopRelative(el, sourceElement);
    if (y > MIN_GAP && y < totalHeight - MIN_GAP) {
      forced.push(y);
    }
  }

  if (forced.length === 0) return smartBreaks;

  const filtered = smartBreaks.filter(sb =>
    !forced.some(fb => Math.abs(fb - sb) < MIN_GAP)
  );

  return [...filtered, ...forced].sort((a, b) => a - b);
}

/** Typed error class for programmatic handling of PDF generation failures. */
export class PdfGenerationError extends Error {
  code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'TRUNCATED_CANVAS' | 'UNKNOWN';
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
