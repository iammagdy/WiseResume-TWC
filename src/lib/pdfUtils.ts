/**
 * Lightweight PDF utility exports that do NOT import html2canvas or pdf-lib.
 * Use this instead of importing from pdfGenerator.ts to avoid pulling ~200KB
 * of heavy dependencies into page chunks that don't need them.
 */

import { SectionId } from '@/types/resume';
import { normalizeBreakPositions, snapBreakPositionsToSectionHeadings } from '@/lib/exportPagePlan';
import { SECTION_LABELS } from '@/lib/sectionLabels';
import { getExportContentHeightPx, getSectionBreakBoundary, getSectionHeadingTop, collectSectionLayoutBounds } from '@/lib/exportLayoutMetrics';
import { getTemplateDesignDimensions } from '@/lib/templateDimensions';

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
  pageFormat: string = 'letter',
  templateId?: string | null,
): { pageWidth: number; pageHeight: number } {
  if (templateId) return getTemplateDesignDimensions(templateId, pageFormat);
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
    getExportContentHeightPx(sourceElement),
    pageHeight / 2,
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

function getSectionPageBreakY(sectionEl: HTMLElement, root: HTMLElement): number {
  return getSectionBreakBoundary(sectionEl, root);
}

/** Section IDs that currently have a page break aligned before them. */
export function getSectionsWithBreaksBefore(
  sourceElement: HTMLElement,
  breakYs: number[],
  minGap: number = 40,
): string[] {
  if (!breakYs.length) return [];

  const active: string[] = [];
  sourceElement.querySelectorAll<HTMLElement>('[data-section]').forEach((sectionEl) => {
    const id = sectionEl.getAttribute('data-section');
    if (!id) return;

    const boundary = getSectionBreakBoundary(sectionEl, sourceElement, minGap);
    const hasAlignedBreak = breakYs.some((breakY) => Math.abs(breakY - boundary) <= minGap);
    if (hasAlignedBreak) active.push(id);
  });

  return active;
}

/**
 * Re-measures saved break Y values on the template that will be exported so
 * PDF generation uses the same coordinate system as the page-break UI.
 */
export function resolveExportBreakPositions(
  templateEl: HTMLElement,
  savedBreaks?: number[],
  minGap: number = 40,
): number[] {
  if (!savedBreaks?.length) return [];

  const liveHeight = Math.max(
    templateEl.scrollHeight || 0,
    templateEl.offsetHeight || 0,
    1,
  );

  const alignedSectionIds = getSectionsWithBreaksBefore(templateEl, savedBreaks, minGap);
  if (alignedSectionIds.length > 0) {
    const remeasured: number[] = [];
    for (const sectionId of alignedSectionIds) {
      const el = templateEl.querySelector(`[data-section="${sectionId}"]`) as HTMLElement | null;
      if (!el) continue;
      remeasured.push(getSectionBreakBoundary(el, templateEl, minGap));
    }
    return normalizeBreakPositions(remeasured, liveHeight, minGap);
  }

  const sections = collectSectionLayoutBounds(templateEl);
  const snapped = snapBreakPositionsToSectionHeadings(
    savedBreaks,
    sections,
    liveHeight,
    minGap,
    liveHeight,
  );
  return normalizeBreakPositions(snapped, liveHeight, minGap);
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
      const headTop = getSectionHeadingTop(sectionHit.el, sourceElement);
      const sectionHeight = sectionHit.bottom - sectionHit.top;
      if (sectionHeight < sourceHeightPerPage) return headTop;
      if (breakY - sectionHit.top < HEADING_GUARD) return headTop;
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
  const totalHeight = getExportContentHeightPx(sourceElement);

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
/**
 * Page count for the toolbar badge: uses saved custom breaks when present,
 * otherwise the automatic printable-height estimate.
 */
export function resolveExportPageCount(
  sourceElement: HTMLElement,
  pageWidth: number,
  pageHeight: number,
  customBreakPositions?: number[],
): number {
  const totalHeight = getExportContentHeightPx(sourceElement);
  const breaks = normalizeBreakPositions(customBreakPositions, totalHeight);
  if (breaks.length > 0) return breaks.length + 1;
  return estimatePageCount(sourceElement, pageWidth, pageHeight);
}

/**
 * Returns break Y positions for a target page count (1–3), snapped to sections/entries.
 */
export function computeBreaksForTargetPages(
  sourceElement: HTMLElement,
  targetPages: 1 | 2 | 3,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT,
): number[] {
  if (targetPages <= 1) return [];
  const needed = targetPages - 1;
  const printableHeight = pageHeight - FOOTER_RESERVED_PT;
  const { sourceHeightPerPage, totalHeight } = calcSourceHeightPerPage(
    sourceElement,
    pageWidth,
    printableHeight,
  );
  const smart = computePreviewBreaks(sourceElement, pageWidth, pageHeight);
  if (smart.length >= needed) {
    return normalizeBreakPositions(smart.slice(0, needed), totalHeight);
  }
  const intervalBreaks: number[] = [];
  for (let i = 1; i <= needed; i++) {
    intervalBreaks.push(Math.round((totalHeight * i) / targetPages));
  }
  const merged = [...smart];
  for (const y of intervalBreaks) {
    if (merged.length >= needed) break;
    if (!merged.some((b) => Math.abs(b - y) < 40)) merged.push(y);
  }
  const snapped = snapBreaksToContentLight(
    merged.slice(0, needed * 2),
    sourceElement,
    sourceHeightPerPage,
  );
  return normalizeBreakPositions(snapped.slice(0, needed), totalHeight);
}

/** Insert or move a page break to the top of a resume section. */
export function addBreakBeforeSection(
  existingBreaks: number[],
  sourceElement: HTMLElement,
  sectionId: string,
  totalHeight: number,
): { breaks: number[]; applied: boolean } {
  const el = sourceElement.querySelector(`[data-section="${sectionId}"]`) as HTMLElement | null;
  if (!el) return { breaks: existingBreaks, applied: false };

  const MIN_GAP = 40;
  const boundary = getSectionBreakBoundary(el, sourceElement, MIN_GAP);
  if (boundary <= MIN_GAP || boundary >= totalHeight - MIN_GAP) {
    return { breaks: existingBreaks, applied: false };
  }

  return {
    breaks: injectForcedBreaks(existingBreaks, sourceElement, [sectionId], totalHeight),
    applied: true,
  };
}

export function injectForcedBreaks(
  smartBreaks: number[],
  sourceElement: HTMLElement,
  manualBreakSections: string[],
  totalHeight: number,
): number[] {
  if (!manualBreakSections || !manualBreakSections.length) return smartBreaks;

  const MIN_GAP = 40;
  let working = [...smartBreaks];
  const forced: number[] = [];

  for (const name of manualBreakSections) {
    const el = sourceElement.querySelector(`[data-section="${name}"]`) as HTMLElement | null;
    if (!el) continue;
    const top = getSectionBreakBoundary(el, sourceElement, MIN_GAP);
    const sectionTop = getOffsetTopRelative(el, sourceElement);
    const bottom = sectionTop + el.offsetHeight;
    if (top > MIN_GAP && top < totalHeight - MIN_GAP) {
      forced.push(top);
      working = working.filter((sb) => {
        if (sb > top && sb < bottom) return false;
        if (Math.abs(sb - top) < MIN_GAP) return false;
        return true;
      });
    }
  }

  if (forced.length === 0) return smartBreaks;

  const filtered = working.filter((sb) =>
    !forced.some((fb) => Math.abs(fb - sb) < MIN_GAP),
  );

  return [...filtered, ...forced].sort((a, b) => a - b);
}

export interface SectionBreakLabel {
  sectionId: string | null;
  /** UI copy for slider row, e.g. "Page ends before Experience" */
  description: string;
}

function sectionDisplayName(sectionId: string): string {
  return SECTION_LABELS[sectionId] ?? sectionId;
}

/** Human-readable label for a break Y in template-root coordinates. */
export function getSectionLabelForBreakY(
  sourceElement: HTMLElement,
  breakY: number,
  minGap: number = 40,
): SectionBreakLabel {
  const sections: { id: string; top: number; bottom: number }[] = [];
  sourceElement.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
    const id = el.getAttribute('data-section');
    if (!id) return;
    const top = getOffsetTopRelative(el, sourceElement);
    sections.push({ id, top, bottom: top + el.offsetHeight });
  });
  sections.sort((a, b) => a.top - b.top);

  if (sections.length === 0) {
    return { sectionId: null, description: '' };
  }

  for (const section of sections) {
    if (breakY >= section.top && breakY < section.bottom) {
      if (Math.abs(breakY - section.top) < minGap) {
        return {
          sectionId: section.id,
          description: `Page ends before ${sectionDisplayName(section.id)}`,
        };
      }
      return {
        sectionId: section.id,
        description: `Inside ${sectionDisplayName(section.id)}`,
      };
    }
  }

  for (const section of sections) {
    if (section.top >= breakY - minGap) {
      return {
        sectionId: section.id,
        description: `Page ends before ${sectionDisplayName(section.id)}`,
      };
    }
  }

  const last = sections[sections.length - 1];
  return {
    sectionId: last.id,
    description: `After ${sectionDisplayName(last.id)}`,
  };
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
