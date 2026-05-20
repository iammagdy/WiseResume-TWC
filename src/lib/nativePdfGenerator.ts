import type { ContactInfo } from '@/types/resume';
import type { OnProgressCallback } from '@/hooks/useExportProgress';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  buildExportPageSegments,
  normalizeBreakPositions,
} from '@/lib/exportPagePlan';
import { cloneResumeTemplateElement, createPdfCaptureContainer } from '@/lib/exportDomUtils';
import { getExportContentHeightPx } from '@/lib/exportLayoutMetrics';
import { tagSvgDimensions, convertSvgsToImages } from '@/lib/html2canvasRetry';

const BRANDING_URL = 'https://resume.thewise.cloud';
const EXPORT_FOOTER_HEIGHT_PX = 44;

const PDF_FORMATS = {
  letter: { widthPx: 612, heightPx: 792 },
  a4:     { widthPx: 595, heightPx: 842 },
} as const;

/**
 * Kept for backward compatibility — callers that catch PDFServerUnavailableError
 * still compile without changes. This error is no longer thrown in normal flow
 * since PDF generation is now fully client-side.
 */
export class PDFServerUnavailableError extends Error {
  readonly code = 'PDF_SERVER_UNAVAILABLE';

  constructor(message = 'PDF export is temporarily unavailable. Please try again later or use DOCX export.') {
    super(message);
    this.name = 'PDFServerUnavailableError';
  }
}

export interface GenerateNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onePage?: boolean;
  atsMode?: boolean;
  customBreakPositions?: number[];
  onProgress?: OnProgressCallback;
}

export interface GenerateCoverLetterNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onProgress?: OnProgressCallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function canvasSliceToPng(
  source: HTMLCanvasElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
): Promise<Uint8Array> {
  const offscreen = document.createElement('canvas');
  offscreen.width  = srcW;
  offscreen.height = srcH;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  const dataUrl = offscreen.toDataURL('image/png');
  return base64ToUint8Array(dataUrl.split(',')[1]);
}

async function drawPageFooter(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  pageNum: number,
  totalPages: number,
  showPageNumbers: boolean,
  showBranding: boolean,
  pageWidthPx: number,
  footerHeightPx: number,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 7.5;
  const gray = rgb(0.45, 0.45, 0.45);
  const centerY = footerHeightPx / 2 - fontSize / 2;

  let text = '';
  if (showPageNumbers && showBranding) {
    text = `Page ${pageNum} of ${totalPages}  ·  Made with WiseResume`;
  } else if (showPageNumbers) {
    text = `Page ${pageNum} of ${totalPages}`;
  } else if (showBranding) {
    text = 'Made with WiseResume';
  }

  if (!text) return;

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, {
    x: Math.max(0, (pageWidthPx - textWidth) / 2),
    y: Math.max(0, centerY),
    size: fontSize,
    font,
    color: gray,
  });
}

// ── Core capture ──────────────────────────────────────────────────────────────

/**
 * Renders the resume template element into an off-screen clone, captures it
 * via html2canvas at 2× resolution, and returns the canvas + measured height.
 * Using an isolated clone avoids mutating live editor styles.
 */
async function captureTemplateCanvas(
  templateEl: HTMLElement,
  pageWidthPx: number,
  atsMode: boolean,
  onProgress?: OnProgressCallback,
): Promise<{ canvas: HTMLCanvasElement; contentHeightPx: number }> {
  const { captureWithRetry } = await import('@/lib/html2canvasRetry');

  // Build an off-screen, rendered container at exact PDF width so layout is correct.
  const container = createPdfCaptureContainer(pageWidthPx);
  document.body.appendChild(container);

  const clone = cloneResumeTemplateElement(templateEl, pageWidthPx);
  container.appendChild(clone);
  // Force layout reflow so getBoundingClientRect works inside the clone.
  clone.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions

  try {
    const contentHeightPx = getExportContentHeightPx(clone);

    onProgress?.('capturing', 30);

    // Tag live SVG dimensions before html2canvas clones the DOM.
    const cleanupSvgTags = tagSvgDimensions(clone);
    let canvas: HTMLCanvasElement;
    try {
      canvas = await captureWithRetry(
        clone,
        {
          scale: 2,
          width: pageWidthPx,
          height: contentHeightPx,
          windowWidth: pageWidthPx,
          backgroundColor: '#ffffff',
          onclone: (doc: Document) => {
            convertSvgsToImages(doc);
            if (atsMode) {
              const style = doc.createElement('style');
              style.textContent =
                '* { color:#000!important; background:#fff!important;' +
                ' box-shadow:none!important; text-shadow:none!important;' +
                ' border-color:#000!important; }';
              doc.head.appendChild(style);
            }
          },
        },
        3,
      );
    } finally {
      cleanupSvgTags();
    }

    return { canvas, contentHeightPx };
  } finally {
    document.body.removeChild(container);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a resume PDF entirely in the browser using html2canvas + pdf-lib.
 *
 * Renders the live resume template into an off-screen DOM clone, captures it
 * at 2× resolution via html2canvas, then slices the canvas into page-height
 * segments and assembles them into a multi-page PDF via pdf-lib.
 *
 * This produces an image-based PDF (no selectable text) but works universally
 * without any server dependency. Quality is excellent at 2× capture scale.
 */
export async function generateNativePDF(
  templateEl: HTMLElement,
  options: GenerateNativePDFOptions = {},
): Promise<Blob> {
  const {
    pageFormat = 'letter',
    onePage = false,
    atsMode = false,
    showPageNumbers = true,
    showBranding = true,
    customBreakPositions,
    onProgress,
  } = options;

  onProgress?.('preparing', 5);

  const dims = pageFormat === 'a4' ? PDF_FORMATS.a4 : PDF_FORMATS.letter;
  const { widthPx, heightPx } = dims;
  const footerHeight = (showPageNumbers || showBranding) ? EXPORT_FOOTER_HEIGHT_PX : 0;
  const printableHeight = heightPx - footerHeight;

  // ── Capture ──────────────────────────────────────────────────────────────
  const { canvas, contentHeightPx } = await captureTemplateCanvas(
    templateEl,
    widthPx,
    atsMode,
    onProgress,
  );

  onProgress?.('finalizing', 60);

  // canvas is at 2× logical scale
  const canvasScale = canvas.width / widthPx; // typically 2

  const pdfDoc = await PDFDocument.create();

  // ── One-page mode ─────────────────────────────────────────────────────────
  if (onePage) {
    const page = pdfDoc.addPage([widthPx, heightPx]);
    const pngBytes = await canvasSliceToPng(canvas, 0, 0, canvas.width, canvas.height);
    const pngImage = await pdfDoc.embedPng(pngBytes);

    // Scale to fit the printable area, preserving aspect ratio
    const scaleX = widthPx / canvas.width;
    const scaleY = printableHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    const drawW = canvas.width  * scale;
    const drawH = canvas.height * scale;

    page.drawImage(pngImage, {
      x: (widthPx - drawW) / 2,
      y: footerHeight + (printableHeight - drawH) / 2,
      width:  drawW,
      height: drawH,
    });

    if (footerHeight > 0) {
      await drawPageFooter(pdfDoc, page, 1, 1, showPageNumbers, showBranding, widthPx, footerHeight);
    }
  } else {
    // ── Multi-page mode ───────────────────────────────────────────────────
    const normalizedBreaks = normalizeBreakPositions(customBreakPositions, contentHeightPx);
    const segments = buildExportPageSegments({
      totalContentHeightPx: contentHeightPx,
      pageHeightPx: printableHeight,
      customBreakPositions: normalizedBreaks,
    });

    for (const segment of segments) {
      const srcY = Math.round(segment.startPx  * canvasScale);
      const srcH = Math.round(segment.heightPx * canvasScale);
      const srcW = canvas.width;

      const pngBytes = await canvasSliceToPng(canvas, 0, srcY, srcW, Math.max(1, srcH));
      const pngImage = await pdfDoc.embedPng(pngBytes);

      const pageH = segment.heightPx + footerHeight;
      const page  = pdfDoc.addPage([widthPx, pageH]);

      // pdf-lib origin is bottom-left → content sits above the footer
      page.drawImage(pngImage, {
        x: 0,
        y: footerHeight,
        width:  widthPx,
        height: segment.heightPx,
      });

      if (footerHeight > 0) {
        await drawPageFooter(
          pdfDoc,
          page,
          segment.index + 1,
          segments.length,
          showPageNumbers,
          showBranding,
          widthPx,
          footerHeight,
        );
      }
    }
  }

  onProgress?.('downloading', 95);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Generate a cover letter PDF.
 * Uses the client-side pdf-lib generator (already produces selectable text).
 */
export async function generateCoverLetterNativePDF(
  letter: unknown,
  _contactInfo: ContactInfo | undefined,
  options: GenerateCoverLetterNativePDFOptions = {},
): Promise<Blob> {
  const { onProgress } = options;
  onProgress?.('preparing', 10);

  const { generateCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
  const bytes = await generateCoverLetterPDF(letter as Parameters<typeof generateCoverLetterPDF>[0]);

  onProgress?.('downloading', 90);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Merge two PDF blobs into one document (for combined resume + cover letter export).
 * Uses pdf-lib on the client — no server round-trip needed.
 */
export async function mergePDFBlobs(blobA: Blob, blobB: Blob): Promise<Blob> {
  const [bytesA, bytesB] = await Promise.all([
    blobA.arrayBuffer(),
    blobB.arrayBuffer(),
  ]);

  const [docA, docB] = await Promise.all([
    PDFDocument.load(bytesA),
    PDFDocument.load(bytesB),
  ]);

  const merged = await PDFDocument.create();
  const pagesA = await merged.copyPages(docA, docA.getPageIndices());
  pagesA.forEach(p => merged.addPage(p));
  const pagesB = await merged.copyPages(docB, docB.getPageIndices());
  pagesB.forEach(p => merged.addPage(p));

  const mergedBytes = await merged.save();
  return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── Legacy / unused exports kept for import compatibility ─────────────────────

/**
 * @deprecated No longer used — PDF is now generated client-side.
 * Kept so any lingering imports don't break at compile time.
 */
export const _legacyBuildSelfContainedHTML = undefined;
