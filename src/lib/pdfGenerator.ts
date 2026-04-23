import { captureWithRetry, convertSvgsToImages, tagSvgDimensions } from '@/lib/html2canvasRetry';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFName, PDFString, PDFArray, PDFPage } from 'pdf-lib';
import { ResumeData, TemplateId, ContactInfo, PDFOptions } from '@/types/resume';
import { getTemplateConfig } from '@/lib/templateConfig';
import { PAGE_FORMAT_PX, generateCustomizationCSS } from '@/lib/templateCustomization';
// Re-export so consumers (e.g. useOnePageExport) can read page dims through
// the same module they use for measure/export — single source of truth.
export { PAGE_FORMAT_PX };
import type { OnProgressCallback } from '@/hooks/useExportProgress';
import {
  walkTemplateDOM,
  chunksForPage,
  renderDOMTextLayerForPage,
  TextLayerError,
  type TextChunk,
} from '@/lib/pdfTextLayer';

/** Typed error class for programmatic handling of PDF generation failures. */
export class PdfGenerationError extends Error {
  code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'TRUNCATED_CANVAS' | 'TEXT_LAYER_FAILED' | 'ENTRY_TOO_TALL' | 'UNKNOWN';
  constructor(message: string, code: PdfGenerationError['code'] = 'UNKNOWN') {
    super(message);
    this.name = 'PdfGenerationError';
    this.code = code;
  }
}

// PDF dimensions defaults (Letter size in points)
export const DEFAULT_PAGE_WIDTH = 612;
export const DEFAULT_PAGE_HEIGHT = 792;
export const FOOTER_RESERVED_PT = 44; // Space for page numbers + branding
const SCALE = 2; // Higher scale for better quality
const MARGIN = 72; // 1 inch margins for cover letter

/**
 * Resolves page dimensions from resume customization, defaulting to Letter.
 */
function getPageDimensions(resume?: ResumeData): { pageWidth: number; pageHeight: number; printableHeight: number } {
  const format = resume?.customization?.pageFormat || 'letter';
  const dims = PAGE_FORMAT_PX[format] || PAGE_FORMAT_PX['letter'];
  const pageWidth = dims?.width || DEFAULT_PAGE_WIDTH;
  const pageHeight = dims?.height || DEFAULT_PAGE_HEIGHT;
  return { pageWidth, pageHeight, printableHeight: pageHeight - FOOTER_RESERVED_PT };
}

/**
 * Wraps text to fit within a maximum width, returning an array of lines.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push(''); // Preserve empty lines for paragraph breaks
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

const BRANDING_URL = 'https://resume.thewise.cloud';

/**
 * Adds a clickable URI annotation to a PDF page at the given rectangle.
 * No visible border — the annotation is invisible but activates in any PDF reader.
 */
function addUriAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  url: string,
  lx: number,
  ly: number,
  rx: number,
  ry: number,
): void {
  if (lx >= rx || ly >= ry) return;
  const annot = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [lx, ly, rx, ry],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url),
      },
    })
  );
  const existingAnnots = page.node.lookup(PDFName.of('Annots'), PDFArray);
  if (existingAnnots) {
    existingAnnots.push(annot);
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annot]));
  }
}

/**
 * Walks the prepared source element for <a href> elements and embeds clickable
 * URI annotations on the correct PDF pages. Must be called while the element
 * still has its capture-preparation sizing applied (before cleanup()).
 *
 * Coordinate system: DOM y-coords (top=0 at template top) are mapped to PDF
 * coords (y=0 at page bottom) using globalScaleFactor = pageWidth / sourceWidth.
 */
function extractAndEmbedLinkAnnotations(
  pdfDoc: PDFDocument,
  sourceElement: HTMLElement,
  smartBreaks: number[],
  totalHeight: number,
  pageWidth: number,
  pageHeight: number,
  globalScaleFactor: number,
): void {
  const sourceRect = sourceElement.getBoundingClientRect();
  const anchors = sourceElement.querySelectorAll('a[href]');
  const numPages = smartBreaks.length + 1;

  anchors.forEach((anchor) => {
    const href = (anchor as HTMLAnchorElement).getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    if (
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('tel:')
    ) return;

    const domRect = anchor.getBoundingClientRect();
    const domTop    = domRect.top    - sourceRect.top;
    const domBottom = domRect.bottom - sourceRect.top;
    const domLeft   = domRect.left   - sourceRect.left;
    const domRight  = domRect.right  - sourceRect.left;

    if (domBottom <= 0 || domTop >= totalHeight) return;
    if (domRect.width <= 0 || domRect.height <= 0) return;

    const pages = pdfDoc.getPages();

    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
      const pageEnd   = pageNum >= smartBreaks.length ? totalHeight : smartBreaks[pageNum];

      if (domBottom <= pageStart || domTop >= pageEnd) continue;

      const clampedTop    = Math.max(domTop,    pageStart);
      const clampedBottom = Math.min(domBottom, pageEnd);

      const pdfLeft   = Math.max(0,         domLeft  * globalScaleFactor);
      const pdfRight  = Math.min(pageWidth,  domRight * globalScaleFactor);
      const pdfTop    = pageHeight - (clampedTop    - pageStart) * globalScaleFactor;
      const pdfBottom = pageHeight - (clampedBottom - pageStart) * globalScaleFactor;

      if (pdfLeft >= pdfRight || pdfBottom >= pdfTop) continue;
      if (pageNum >= pages.length) continue;

      addUriAnnotation(pdfDoc, pages[pageNum], href, pdfLeft, pdfBottom, pdfRight, pdfTop);
    }
  });
}

/**
 * Adds page footer with page numbers and optional branding badge.
 */
async function addPageFooter(
  pdfDoc: PDFDocument,
  options: PDFOptions = {},
  pageWidth: number = DEFAULT_PAGE_WIDTH
): Promise<void> {
  const { 
    showPageNumbers = true, 
    pageNumberFormat = 'full',
    showBranding = true 
  } = options;
  
  // Skip if nothing to render
  if (!showPageNumbers && !showBranding) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const numPages = pages.length;

  for (let i = 0; i < numPages; i++) {
    const page = pages[i];
    
    // Page numbers (positioned higher to make room for branding)
    if (showPageNumbers) {
      const pageText = pageNumberFormat === 'simple' 
        ? `${i + 1}` 
        : `Page ${i + 1} of ${numPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, 9);

      page.drawText(pageText, {
        x: (pageWidth - textWidth) / 2,
        y: showBranding ? 28 : 20, // Move up if branding shown
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    if (showBranding) {
      const brandingText = '• Created with WiseResume · part of The Wise Cloud';
      const brandingWidth = font.widthOfTextAtSize(brandingText, 7);
      const brandingX = (pageWidth - brandingWidth) / 2;
      const brandingY = 12;

      page.drawText(brandingText, {
        x: brandingX,
        y: brandingY,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55),
      });

      addUriAnnotation(
        pdfDoc, page, BRANDING_URL,
        brandingX, brandingY - 2,
        brandingX + brandingWidth, brandingY + 9,
      );
    }
  }
}

/**
 * Prepares the resume element for PDF capture on mobile/iOS.
 * Forces exact 612px width, removes CSS transforms, ensures all content visible.
 * Returns a cleanup function to restore original styles.
 */
/**
 * Live-measurement variant of prepareForCapture. Performs the layout-sizing
 * work (force PDF width, strip transforms, expand parent overflow) so we can
 * read accurate dimensions, but does NOT call scrollIntoView() or
 * window.scrollTo(). Use for frequent live page-count measurements where
 * touching the user's scroll position would be visible/jarring.
 */
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
  // Force layout recalc without scrolling.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

function prepareForCapture(sourceElement: HTMLElement, pageWidth: number = DEFAULT_PAGE_WIDTH): () => void {
  const originalStyles = {
    width: sourceElement.style.width,
    maxWidth: sourceElement.style.maxWidth,
    transform: sourceElement.style.transform,
    minHeight: sourceElement.style.minHeight,
  };

  // Inject customization CSS for PDF capture
  const customizationStyle = document.createElement('style');
  customizationStyle.setAttribute('data-pdf-customization', 'true');
  const resumeData = (sourceElement as any).__resumeData as import('@/types/resume').ResumeData | undefined;
  // Try to find customization from the style tag already in the element
  const existingStyle = sourceElement.querySelector('style');
  if (existingStyle) {
    customizationStyle.textContent = existingStyle.textContent;
  }
  sourceElement.appendChild(customizationStyle);

  // Force exact PDF-width layout (prevents mobile reflow at smaller widths)
  sourceElement.style.width = `${pageWidth}px`;
  sourceElement.style.maxWidth = `${pageWidth}px`;
  // Remove any framer-motion transforms that affect getBoundingClientRect
  sourceElement.style.transform = 'none';

  // Ensure parent scroll containers show all content (iOS Safari viewport clipping fix)
  const parentOverflows: { el: HTMLElement; overflow: string; scrollTop: number }[] = [];
  let parent = sourceElement.parentElement;
  while (parent) {
    parentOverflows.push({ el: parent, overflow: parent.style.overflow, scrollTop: parent.scrollTop });
    parent.style.overflow = 'visible';
    parent.scrollTop = 0; // Reset scroll so html2canvas captures from top
    parent = parent.parentElement;
  }

  // Scroll to top so iOS Safari renders all content
  sourceElement.scrollIntoView({ block: 'start' });
  window.scrollTo(0, 0);

  // Force layout recalculation
  sourceElement.offsetHeight;

  return () => {
    sourceElement.style.width = originalStyles.width;
    sourceElement.style.maxWidth = originalStyles.maxWidth;
    sourceElement.style.transform = originalStyles.transform;
    sourceElement.style.minHeight = originalStyles.minHeight;
    parentOverflows.forEach(({ el, overflow, scrollTop }) => {
      el.style.overflow = overflow;
      el.scrollTop = scrollTop; // Restore original scroll position
    });
    // Remove injected customization style
    const injectedStyle = sourceElement.querySelector('[data-pdf-customization]');
    if (injectedStyle) injectedStyle.remove();
  };
}

/**
 * Locates the template element in the DOM.
 */
export function getTemplateSourceElement(templateElement?: HTMLElement | null): HTMLElement {
  let sourceElement = templateElement;

  if (!sourceElement) {
    sourceElement = document.querySelector('[data-resume-template]') as HTMLElement;
  }

  if (!sourceElement) {
    sourceElement = document.querySelector('.bg-white.text-black.mx-auto.shadow-2xl') as HTMLElement;
  }

  if (!sourceElement) {
    console.error('PDF Generator: No template element found');
    throw new Error('Resume template not found. Please ensure the preview is visible.');
  }

  return sourceElement;
}

export interface PDFDimensions {
  sourceWidth: number;
  totalHeight: number;
  globalScaleFactor: number;
  sourceHeightPerPage: number;
}

/**
 * Estimates the scale percentage for one-page PDF export without generating a PDF.
 * Returns a number 1-100 representing the percentage (e.g., 67 means 67% scale).
 */
export function estimateOnePageScale(templateElement: HTMLElement, pageFormat?: 'a4' | 'letter'): number {
  const format = pageFormat || 'letter';
  const dims = PAGE_FORMAT_PX[format] || PAGE_FORMAT_PX['letter'];
  const pw = dims?.width || DEFAULT_PAGE_WIDTH;
  const ph = dims?.height || DEFAULT_PAGE_HEIGHT;
  const printable = ph - FOOTER_RESERVED_PT;

  // Use the no-scroll measurement helper so live page-count probes never
  // perturb the user's scroll position.
  const cleanup = prepareForMeasure(templateElement, pw);
  try {
    const { totalHeight, globalScaleFactor } = calculatePDFDimensions(templateElement, pw, ph);
    const pdfContentHeight = totalHeight * globalScaleFactor;
    const fitScale = pdfContentHeight > printable
      ? printable / pdfContentHeight
      : 1;
    return Math.round(fitScale * 100);
  } finally {
    cleanup();
  }
}

/**
 * Calculates layout dimensions for PDF generation.
 */
export function calculatePDFDimensions(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): PDFDimensions {
  const sourceWidth = Math.max(
    sourceElement.offsetWidth || pageWidth,
    pageWidth / 2
  );
  const totalHeight = Math.max(
    sourceElement.scrollHeight || sourceElement.offsetHeight || pageHeight,
    pageHeight / 2
  );

  const globalScaleFactor = pageWidth / sourceWidth;
  const sourceHeightPerPage = pageHeight / globalScaleFactor;

  return {
    sourceWidth,
    totalHeight,
    globalScaleFactor,
    sourceHeightPerPage
  };
}

/**
 * Captures the template element as a canvas.
 */
export interface CaptureResult {
  canvas: HTMLCanvasElement;
  /** The scale that actually produced the returned canvas (may be 1 after a
   *  truncation retry, even when `scale` was higher). Downstream slicing
   *  and pixel-coordinate math MUST use this value, not the requested scale. */
  actualScale: number;
}

export async function captureTemplateAsCanvas(
  sourceElement: HTMLElement,
  width: number,
  height: number,
  scale: number = SCALE
): Promise<CaptureResult> {
  // Strict 0.98 guard: anything below 98% of expected height is treated as a
  // truncated capture and retried once at scale=1 before raising. The legacy
  // 0.8 ratio quietly shipped 2-page PDFs that should have been 3 pages on
  // iOS/Safari (see TEMPLATE_AUDIT.md finding #2).
  const TRUNCATION_RATIO = 0.98;

  const captureAt = async (s: number): Promise<HTMLCanvasElement> => {
    const cleanupTags = tagSvgDimensions(sourceElement);
    try {
      return await captureWithRetry(sourceElement, {
        scale: s,
        backgroundColor: '#ffffff',
        width,
        height,
        scrollX: 0,
        scrollY: 0,
        windowWidth: width,
        windowHeight: height,
        onclone: (doc: Document) => convertSvgsToImages(doc),
      });
    } finally {
      cleanupTags();
    }
  };

  const firstCanvas = await captureAt(scale);
  const firstExpected = sourceElement.scrollHeight * scale;
  if (firstCanvas.height >= firstExpected * TRUNCATION_RATIO) {
    return { canvas: firstCanvas, actualScale: scale };
  }

  // Retry once at scale=1 — usually rescues iOS/Safari memory-cap truncation.
  if (scale === 1) {
    throw new PdfGenerationError(
      `Canvas capture is truncated (got ${firstCanvas.height}px, expected ~${firstExpected}px) ` +
      `even at scale=1. The resume preview may be off-screen or exceed the browser's canvas limits.`,
      'TRUNCATED_CANVAS'
    );
  }

  console.warn(
    `[PDF] First capture truncated (${firstCanvas.height}/${firstExpected}px at scale=${scale}); retrying at scale=1.`
  );
  const retryCanvas = await captureAt(1);
  const retryExpected = sourceElement.scrollHeight * 1;
  if (retryCanvas.height < retryExpected * TRUNCATION_RATIO) {
    throw new PdfGenerationError(
      `Canvas capture is truncated (got ${retryCanvas.height}px, expected ~${retryExpected}px) ` +
      `after retry at scale=1. The resume preview may be off-screen or clipped.`,
      'TRUNCATED_CANVAS'
    );
  }

  return { canvas: retryCanvas, actualScale: 1 };
}

/**
 * Processes the captured canvas and generates PDF pages based on break positions.
 */
export async function generatePDFPages(
  pdfDoc: PDFDocument,
  canvas: HTMLCanvasElement,
  smartBreaks: number[],
  totalHeight: number,
  globalScaleFactor: number,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT,
  resume?: ResumeData,
  sourceElement?: HTMLElement,
  captureScale: number = SCALE,
): Promise<void> {
  const numPages = smartBreaks.length + 1;

  // Build the hidden text layer once from the rendered DOM so it stays in
  // visual reading order and can be sliced by the same break offsets used
  // for the visible image. Falls back to no text layer only if no DOM is
  // available — failures during the actual draw are surfaced, not swallowed.
  let textChunks: TextChunk[] = [];
  let textFont: PDFFont | null = null;
  if (sourceElement) {
    textChunks = walkTemplateDOM(sourceElement);
    if (textChunks.length > 0) {
      textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  }

  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
    const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
    const pageContentHeight = pageEnd - pageStart;

    // Use the actual capture scale (may be 1 after a truncation retry) so the
    // crop math stays aligned with the canvas pixels html2canvas produced.
    const sourceY = Math.round(pageStart * captureScale);
    const sourceH = Math.min(
      Math.round(pageContentHeight * captureScale),
      canvas.height - sourceY
    );

    if (sourceH <= 0) {
      console.warn(`[PDF] Page ${pageNum + 1} crop height is zero — stopping page loop early.`);
      break;
    }

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvas.width;
    cropCanvas.height = sourceH;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

    ctx.drawImage(
      canvas,
      0, sourceY, canvas.width, sourceH,
      0, 0, canvas.width, sourceH
    );

    const imgData = cropCanvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(imgData);

    // Render height of this segment in PDF points at full page width
    // Since pagination uses printableHeight for sourceHeightPerPage, each full slice
    // maps to exactly printableHeight = pageHeight - FOOTER_RESERVED_PT
    const segmentPdfHeight = pageWidth * (cropCanvas.height / cropCanvas.width);

    // Always use standard page height — every page is the same size
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Fill entire page with white (covers short last page padding and footer zone)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 1, 1),
    });

    // Draw content starting at the top of the page, above the footer zone
    // FOOTER_RESERVED_PT is reserved at the bottom for page numbers / branding
    page.drawImage(pngImage, {
      x: 0,
      y: pageHeight - segmentPdfHeight,
      width: pageWidth,
      height: segmentPdfHeight,
    });

    // Add invisible text layer for ATS / Ctrl+F — sliced by the same
    // smart-breaks used for the image so page N's hidden text matches
    // page N's visible content. Failures here are surfaced (not swallowed)
    // because an image-only PDF scores zero with ATS.
    if (textFont && textChunks.length > 0) {
      const pageChunks = chunksForPage(textChunks, pageNum, smartBreaks, totalHeight);
      try {
        renderDOMTextLayerForPage(
          page, textFont, pageChunks, pageWidth, pageHeight,
          pageStart, globalScaleFactor, FOOTER_RESERVED_PT,
        );
      } catch (e) {
        const message = e instanceof TextLayerError ? e.message : String(e);
        throw new PdfGenerationError(
          `Hidden ATS text layer failed on page ${pageNum + 1} of ${numPages}: ${message}. ` +
            `Aborting export — an image-only PDF would be invisible to applicant tracking systems.`,
          'TEXT_LAYER_FAILED',
        );
      }
    }
  }
}

/**
 * Estimates the number of pages for a resume based on content height.
 * Accepts optional page dimensions to support different formats (Letter, A4).
 */
export function estimatePageCount(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): number {
  const { sourceHeightPerPage, totalHeight } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);
  
  if (totalHeight <= sourceHeightPerPage * 1.05) {
    return 1;
  }
  
  // Simple fixed-interval count
  return Math.ceil(totalHeight / sourceHeightPerPage);
}

/**
 * Snaps fixed-interval break positions to avoid splitting elements marked
 * with [data-break-avoid]. Uses a tiered strategy:
 * Tier 1: if element fits on one page → always push to next page (no shift limit)
 * Tier 2: oversized elements → snap to nearest [data-break-child] (shift ≤ 50%)
 * Tier 3: oversized elements → snap to nearest direct child (shift ≤ 50%)
 */
/**
 * Scans the captured canvas at its horizontal midline for the first row, when
 * walking *upward* from `forcedBreakSourceY`, where the sampled column is
 * white-or-near-white (no rendered ink). Returns the snap position in source-y
 * coordinates, or `null` if no whitespace row exists in the clamp window.
 *
 * Per the architectural constraint in TPL-2, this samples only one column at
 * the midline so memory remains bounded regardless of canvas size.
 */
export function findWhitespaceBandSnap(
  canvas: HTMLCanvasElement,
  scale: number,
  prevBreakSourceY: number,
  forcedBreakSourceY: number,
  minGapPx: number = 60
): number | null {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;

  const lowerSourceY = prevBreakSourceY + minGapPx;
  if (forcedBreakSourceY <= lowerSourceY) return null;

  const startRow = Math.min(canvas.height - 1, Math.max(0, Math.round(forcedBreakSourceY * scale)));
  const endRow = Math.max(0, Math.round(lowerSourceY * scale));
  if (startRow <= endRow) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const midX = Math.floor(canvas.width / 2);
  const stripHeight = startRow - endRow + 1;

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(midX, endRow, 1, stripHeight).data;
  } catch {
    // Canvas may be tainted (cross-origin photo). Treat as no whitespace.
    return null;
  }

  // Walk upward (from highest row toward lowest row in the strip).
  // pixels[i*4 + 0..3] is row (endRow + i). White-or-near-white = R,G,B >= 250.
  for (let i = stripHeight - 1; i >= 0; i--) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    if (r >= 250 && g >= 250 && b >= 250) {
      const row = endRow + i;
      return row / scale;
    }
  }
  return null;
}

export function snapBreaksToContent(
  fixedBreaks: number[],
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  captureCanvas?: HTMLCanvasElement | null,
  captureScale: number = SCALE
): number[] {
  const sourceRect = sourceElement.getBoundingClientRect();

  // --- Pass 1: Collect section-level boundaries ([data-section]) ---
  const sectionEls = sourceElement.querySelectorAll('[data-section]');
  interface Boundary { top: number; bottom: number; el: Element }
  const sectionBounds: Boundary[] = [];
  sectionEls.forEach(el => {
    const r = el.getBoundingClientRect();
    sectionBounds.push({
      top: r.top - sourceRect.top,
      bottom: r.bottom - sourceRect.top,
      el,
    });
  });
  sectionBounds.sort((a, b) => a.top - b.top);

  // --- Pass 2: Collect entry-level boundaries ([data-break-avoid]) ---
  const avoidEls = sourceElement.querySelectorAll('[data-break-avoid]');
  const entryBounds: Boundary[] = [];
  avoidEls.forEach(el => {
    const r = el.getBoundingClientRect();
    entryBounds.push({
      top: r.top - sourceRect.top,
      bottom: r.bottom - sourceRect.top,
      el,
    });
  });
  entryBounds.sort((a, b) => a.top - b.top);

  if (!sectionBounds.length && !entryBounds.length) return fixedBreaks;

  // Validate that layout is available — off-screen elements return all-zero rects
  const hasValidLayout = sectionBounds.some(b => b.bottom > 0) || entryBounds.some(b => b.bottom > 0);
  if (!hasValidLayout) {
    console.warn('[PDF] All element rects are zero — element may be off-screen. Using fixed-interval breaks.');
    return fixedBreaks;
  }

  const maxShift = Math.min(sourceHeightPerPage * 0.50, 350); // hard cap at 350px
  const HEADING_GUARD = 60; // px — protect section headings from orphaning

  // --- Sequential break processing: each break is relative to the previous ---
  interface SnapResult { snap: number; forcedInOversizedEntry: boolean }
  const snapOne = (breakY: number): SnapResult => {
    // === Pass 1: Section-level snapping ===
    const sectionHit = sectionBounds.find(b => breakY > b.top && breakY < b.bottom);
    if (sectionHit) {
      const sectionHeight = sectionHit.bottom - sectionHit.top;

      // If the whole section fits on one page, push it entirely to the next page
      if (sectionHeight < sourceHeightPerPage) {
        return { snap: sectionHit.top, forcedInOversizedEntry: false };
      }

      // Section is too tall for one page — prevent orphaned heading
      if (breakY - sectionHit.top < HEADING_GUARD) {
        return { snap: sectionHit.top, forcedInOversizedEntry: false };
      }
      // Section is oversized and break is well past the heading — fall through to entry-level
    }

    // === Pass 2: Entry-level snapping ([data-break-avoid]) ===
    const hit = entryBounds.find(b => breakY > b.top && breakY < b.bottom);
    if (!hit) return { snap: breakY, forcedInOversizedEntry: false };

    const hitHeight = hit.bottom - hit.top;
    const snappedTop = hit.top;

    // Tier 1: if the entry fits on a single page, ALWAYS push it to the next page
    if (hitHeight < sourceHeightPerPage) {
      return { snap: snappedTop, forcedInOversizedEntry: false };
    }

    // --- Entry is taller than one page — find best internal break point ---

    // Tier 2: find a [data-break-child] boundary inside the oversized block
    // Widen search range proportionally for tall entries so we don't miss the nearest boundary
    const entryMaxShift = Math.max(maxShift, hitHeight * 0.15);
    const markedChildren = hit.el.querySelectorAll('[data-break-child]');
    if (markedChildren.length > 0) {
      let bestSnap = breakY;
      let bestDist = Infinity;
      markedChildren.forEach(child => {
        const cr = child.getBoundingClientRect();
        const childTop = cr.top - sourceRect.top;
        const dist = Math.abs(childTop - breakY);
        if (dist < bestDist && dist <= entryMaxShift) {
          bestDist = dist;
          bestSnap = childTop;
        }
      });
      if (bestSnap !== breakY) return { snap: bestSnap, forcedInOversizedEntry: false };
    }

    // Tier 3: fallback to any direct child element boundary
    const genericChildren = Array.from(hit.el.children);
    if (genericChildren.length > 1) {
      let bestSnap = breakY;
      let bestDist = Infinity;
      genericChildren.forEach(child => {
        const cr = child.getBoundingClientRect();
        const childTop = cr.top - sourceRect.top;
        const dist = Math.abs(childTop - breakY);
        if (dist < bestDist && dist <= entryMaxShift) {
          bestDist = dist;
          bestSnap = childTop;
        }
      });
      if (bestSnap !== breakY) return { snap: bestSnap, forcedInOversizedEntry: false };
    }

    // All three tiers fell back inside an oversized [data-break-avoid] entry.
    // The caller will apply the whitespace-band fallback to avoid slicing
    // through a line of text in the captured image.
    return { snap: breakY, forcedInOversizedEntry: true };
  };

  // Process breaks sequentially — each break is recalculated from the previous snapped position
  const result: number[] = [];
  let prevBreak = 0;
  const totalHeight = sourceElement.scrollHeight || sourceElement.getBoundingClientRect().height;

  for (let i = 0; i < fixedBreaks.length; i++) {
    let nextBreak = prevBreak + sourceHeightPerPage;

    // Don't exceed total content height
    if (nextBreak >= totalHeight) break;

    const { snap, forcedInOversizedEntry } = snapOne(nextBreak);
    let snappedY = snap;

    // Whitespace-band fallback (TPL-2 finding #3): when the three layout-aware
    // tiers can't find a usable break inside an oversized entry, scan the
    // captured canvas for the first row of pixels with no rendered ink so we
    // don't slice through a line of letters in the image.
    if (forcedInOversizedEntry) {
      const forcedBreakY = prevBreak + sourceHeightPerPage;
      if (captureCanvas) {
        const wsSnap = findWhitespaceBandSnap(
          captureCanvas,
          captureScale,
          prevBreak,
          forcedBreakY,
          HEADING_GUARD
        );
        if (wsSnap !== null) {
          snappedY = wsSnap;
        } else {
          throw new PdfGenerationError(
            `An entry is too tall to paginate cleanly: no whitespace band exists ` +
              `between source-y ${Math.round(prevBreak + HEADING_GUARD)}px and ` +
              `${Math.round(forcedBreakY)}px. Mark internal break points with ` +
              `data-break-child or shorten the entry.`,
            'ENTRY_TOO_TALL',
          );
        }
      }
      // If we don't have a canvas (e.g. preview-side estimation), preserve
      // the legacy behaviour of clamping at the forced interval below.
    }

    // Clamp to [prevBreak + HEADING_GUARD, prevBreak + sourceHeightPerPage] so that
    // downward snaps never create a segment larger than one printable page, preventing
    // content clipping when rendering to fixed-height PDF pages.
    nextBreak = Math.min(
      Math.max(snappedY, prevBreak + HEADING_GUARD),
      prevBreak + sourceHeightPerPage
    );
    if (nextBreak >= totalHeight) break;
    result.push(nextBreak);
    prevBreak = nextBreak;
  }

  return result;
}

/**
 * Generates a PDF from the resume by capturing the rendered React template.
 * Uses fixed-interval pagination with content-aware break snapping.
 */
export async function generatePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  _manualBreakSections?: string[],
  options?: PDFOptions,
  onProgress?: OnProgressCallback,
  _customBreakPositions?: number[]
): Promise<Blob> {
  const sourceElement = getTemplateSourceElement(templateElement);

  onProgress?.('preparing', 5);

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  onProgress?.('preparing', 10);

  const { pageWidth, pageHeight, printableHeight } = getPageDimensions(resume);

   const cleanup = prepareForCapture(sourceElement, pageWidth);

   try {
     const {
       sourceWidth,
       totalHeight,
       globalScaleFactor,
       sourceHeightPerPage
     } = calculatePDFDimensions(sourceElement, pageWidth, printableHeight);

      // Fixed-interval breaks, computed before capture (layout-only).
      const fixedBreaks: number[] = [];
      for (let y = sourceHeightPerPage; y < totalHeight; y += sourceHeightPerPage) {
        fixedBreaks.push(y);
      }

    const pdfDoc = await PDFDocument.create();

    onProgress?.('capturing', 20);

    // Capture first so the whitespace-band fallback in snapBreaksToContent
    // (TPL-2 finding #3) can sample real pixel data when the layout-aware
    // tiers can't find a snap inside an oversized [data-break-avoid] block.
    const { canvas, actualScale } = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight);

    onProgress?.('paginating', 40);

    const smartBreaks = snapBreaksToContent(
      fixedBreaks,
      sourceElement,
      sourceHeightPerPage,
      canvas,
      actualScale,
    );

    await generatePDFPages(
      pdfDoc, canvas, smartBreaks, totalHeight, globalScaleFactor,
      pageWidth, pageHeight, resume, sourceElement, actualScale,
    );

    extractAndEmbedLinkAnnotations(
      pdfDoc, sourceElement, smartBreaks, totalHeight,
      pageWidth, pageHeight, globalScaleFactor,
    );

    onProgress?.('finalizing', 80);

    await addPageFooter(pdfDoc, options, pageWidth);

    onProgress?.('finalizing', 90);

    const pdfBytes = await pdfDoc.save();
    
    onProgress?.('downloading', 100);
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
  } catch (error) {
    if (error instanceof PdfGenerationError) throw error;
    throw new PdfGenerationError('Failed to capture resume template. Please try again.', 'CAPTURE_FAILED');
  } finally {
    cleanup();
  }
}

/**
 * Generates a single-page PDF by scaling all content to fit on one page.
 */
export async function generateOnePagePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  options?: PDFOptions,
  onProgress?: OnProgressCallback
): Promise<Blob> {
  const sourceElement = getTemplateSourceElement(templateElement);

  onProgress?.('preparing', 5);
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));
  onProgress?.('preparing', 10);

  const { pageWidth, pageHeight, printableHeight } = getPageDimensions(resume);
  const cleanup = prepareForCapture(sourceElement, pageWidth);

  try {
    const { sourceWidth, totalHeight, globalScaleFactor } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);

    const pdfContentHeight = totalHeight * globalScaleFactor;

    const fitScale = pdfContentHeight > printableHeight
      ? printableHeight / pdfContentHeight
      : 1;

    // Dynamic-scale ceiling (TPL-2 finding #4): cap the requested raster area
    // at MAX_RASTER_AREA so we never ask html2canvas for a canvas that
    // exceeds iOS Safari's per-canvas memory limit. Below scale=2 the user
    // gets a visible "may look soft" warning via the progress channel.
    const MAX_RASTER_AREA = 14_000_000;
    const idealScale = fitScale < 1 ? SCALE / fitScale : SCALE;
    const sourceArea = Math.max(1, sourceWidth * totalHeight);
    const maxScaleByArea = Math.sqrt(MAX_RASTER_AREA / sourceArea);
    const dynamicScale = Math.max(1, Math.min(idealScale, maxScaleByArea));

    if (dynamicScale < 2) {
      onProgress?.(
        'capturing',
        15,
        `One-page output may look soft at this length (render scale ${dynamicScale.toFixed(2)}). ` +
          `Consider two-page mode for crisper text.`,
      );
    }

    onProgress?.('capturing', 20);
    const { canvas } = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight, dynamicScale);

    const pdfDoc = await PDFDocument.create();

    const aspectRatio = totalHeight / sourceWidth;
    const naturalHeight = pageWidth * aspectRatio;
    const pageFit = naturalHeight > printableHeight ? printableHeight / naturalHeight : 1;
    const finalWidth = pageWidth * pageFit;
    const finalHeight = naturalHeight * pageFit;
    const offsetX = (pageWidth - finalWidth) / 2;

    onProgress?.('embedding', 50);
    const imgData = canvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(imgData);

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawImage(pngImage, {
      x: offsetX,
      y: pageHeight - finalHeight,
      width: finalWidth,
      height: finalHeight,
    });

    // Add invisible text layer for ATS / Ctrl+F — DOM-driven, surfaces failures.
    const textChunks = walkTemplateDOM(sourceElement);
    if (textChunks.length > 0) {
      try {
        const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        renderDOMTextLayerForPage(page, textFont, textChunks, pageWidth, pageHeight);
      } catch (e) {
        const message = e instanceof TextLayerError ? e.message : String(e);
        throw new PdfGenerationError(
          `Hidden ATS text layer failed on one-page export: ${message}. ` +
            `Aborting export — an image-only PDF would be invisible to applicant tracking systems.`,
          'TEXT_LAYER_FAILED',
        );
      }
    }

    const contentBottomY = pageHeight - finalHeight;
    if (contentBottomY > FOOTER_RESERVED_PT) {
      page.drawRectangle({
        x: 0,
        y: FOOTER_RESERVED_PT,
        width: pageWidth,
        height: contentBottomY - FOOTER_RESERVED_PT,
        color: rgb(1, 1, 1),
      });
    }

    onProgress?.('finalizing', 85);
    await addPageFooter(pdfDoc, options, pageWidth);

    const pdfBytes = await pdfDoc.save();
    onProgress?.('downloading', 100);
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
  } catch (error) {
    if (error instanceof PdfGenerationError) throw error;
    throw new PdfGenerationError('Failed to generate one-page PDF. Please try again.', 'CAPTURE_FAILED');
  } finally {
    cleanup();
  }
}

export async function generateCoverLetterPDF(
  coverLetter: string,
  contactInfo: ContactInfo,
  options?: PDFOptions
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const contentWidth = DEFAULT_PAGE_WIDTH - (MARGIN * 2);
  const lines = wrapText(coverLetter, font, 11, contentWidth);

  let page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
  let y = DEFAULT_PAGE_HEIGHT - MARGIN;

  if (contactInfo.fullName) {
    page.drawText(contactInfo.fullName, {
      x: MARGIN,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  const contactDetails = [contactInfo.email, contactInfo.phone, contactInfo.location]
    .filter(Boolean)
    .join(' | ');
  if (contactDetails) {
    page.drawText(contactDetails, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  page.drawText(today, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  const lineHeight = 16;
  for (const line of lines) {
    if (y < MARGIN + 30) {
      page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
      y = DEFAULT_PAGE_HEIGHT - MARGIN;
    }

    if (line === '') {
      y -= lineHeight;
    } else {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }

  await addPageFooter(pdfDoc, options);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Generates a combined PDF with cover letter followed by resume.
 */
export async function generateCombinedPDF(
  resume: ResumeData,
  templateId: TemplateId,
  coverLetter: string,
  templateElement?: HTMLElement | null,
  _manualBreakSections?: string[],
  options?: PDFOptions,
  onProgress?: OnProgressCallback,
  _customBreakPositions?: number[]
): Promise<Blob> {
  const coverLetterBlob = await generateCoverLetterPDF(
    coverLetter,
    resume.contactInfo,
    { showPageNumbers: false }
  );
  const coverLetterBytes = await coverLetterBlob.arrayBuffer();
  const coverLetterDoc = await PDFDocument.load(coverLetterBytes);

  onProgress?.('capturing', 30);
  const resumeBlob = await generatePDF(
    resume,
    templateId,
    templateElement,
    undefined,
    { showPageNumbers: false },
    onProgress,
    undefined
  );
  const resumeBytes = await resumeBlob.arrayBuffer();
  const resumeDoc = await PDFDocument.load(resumeBytes);

  const combinedDoc = await PDFDocument.create();

  const coverLetterPages = await combinedDoc.copyPages(
    coverLetterDoc,
    coverLetterDoc.getPageIndices()
  );
  coverLetterPages.forEach(page => combinedDoc.addPage(page));

  // pdf-lib's copyPages preserves each page's Annots array in full, so the
  // URI annotations embedded by extractAndEmbedLinkAnnotations() inside
  // generatePDF() above (portfolio, GitHub, LinkedIn links, etc.) are
  // automatically carried into combinedDoc — no second extraction pass needed.
  const resumePages = await combinedDoc.copyPages(
    resumeDoc,
    resumeDoc.getPageIndices()
  );
  resumePages.forEach(page => combinedDoc.addPage(page));

  // addPageFooter adds branding text + clickable branding URI annotation to
  // all pages in combinedDoc (cover letter + resume). The branding annotation
  // is added here rather than inside generatePDF so it applies to every page
  // of the combined document uniformly.
  await addPageFooter(combinedDoc, options);

  const pdfBytes = await combinedDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
