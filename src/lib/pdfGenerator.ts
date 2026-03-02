import { captureWithRetry, convertSvgsToImages, tagSvgDimensions } from '@/lib/html2canvasRetry';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { ResumeData, TemplateId, ContactInfo, PDFOptions } from '@/types/resume';
import { getTemplateConfig } from '@/lib/templateConfig';
import { PAGE_FORMAT_PX, generateCustomizationCSS } from '@/lib/templateCustomization';
import type { OnProgressCallback } from '@/hooks/useExportProgress';

/** Typed error class for programmatic handling of PDF generation failures. */
export class PdfGenerationError extends Error {
  code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'UNKNOWN';
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
    
    // Professional branding badge
    if (showBranding) {
      const brandingText = '• Created with WiseResume · part of WiseUniverse';
      const brandingWidth = font.widthOfTextAtSize(brandingText, 7);

      page.drawText(brandingText, {
        x: (pageWidth - brandingWidth) / 2,
        y: 12,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55), // Lighter than page number
      });
    }
  }
}

/**
 * Prepares the resume element for PDF capture on mobile/iOS.
 * Forces exact 612px width, removes CSS transforms, ensures all content visible.
 * Returns a cleanup function to restore original styles.
 */
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

  const cleanup = prepareForCapture(templateElement, pw);
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
export async function captureTemplateAsCanvas(
  sourceElement: HTMLElement,
  width: number,
  height: number,
  scale: number = SCALE
): Promise<HTMLCanvasElement> {
  // Pre-tag SVG dimensions from the live DOM before html2canvas clones it
  const cleanupTags = tagSvgDimensions(sourceElement);

  const canvas = await captureWithRetry(sourceElement, {
    scale,
    backgroundColor: '#ffffff',
    width,
    height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: width,
    windowHeight: height,
    onclone: (doc: Document) => convertSvgsToImages(doc),
  });

  cleanupTags();

  const expectedHeight = sourceElement.scrollHeight * scale;
  if (canvas.height < expectedHeight * 0.5) {
    console.warn(
      `[PDF] Canvas height (${canvas.height}px) is much smaller than expected (${expectedHeight}px). ` +
      `Source element scrollHeight: ${sourceElement.scrollHeight}px. This may cause truncated pages.`
    );
  }

  return canvas;
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
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): Promise<void> {
  const numPages = smartBreaks.length + 1;

  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
    const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
    const pageContentHeight = pageEnd - pageStart;

    const sourceY = Math.round(pageStart * SCALE);
    const sourceH = Math.min(
      Math.round(pageContentHeight * SCALE),
      canvas.height - sourceY
    );

    if (sourceH <= 0) continue;

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

    const segmentPdfHeight = pageWidth * (cropCanvas.height / cropCanvas.width);
    const actualPageHeight = segmentPdfHeight + FOOTER_RESERVED_PT;

    const page = pdfDoc.addPage([pageWidth, actualPageHeight]);

    page.drawImage(pngImage, {
      x: 0,
      y: FOOTER_RESERVED_PT,
      width: pageWidth,
      height: segmentPdfHeight,
    });
  }
}

/**
 * Estimates the number of pages for a resume based on content height.
 */
export function estimatePageCount(
  sourceElement: HTMLElement
): number {
  const { sourceHeightPerPage, totalHeight } = calculatePDFDimensions(sourceElement);
  
  if (totalHeight <= sourceHeightPerPage * 1.05) {
    return 1;
  }
  
  // Simple fixed-interval count
  return Math.ceil(totalHeight / sourceHeightPerPage);
}

/**
 * Generates a PDF from the resume by capturing the rendered React template.
 * Uses simple fixed-interval pagination (one page height per page).
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

  const { pageWidth, pageHeight } = getPageDimensions(resume);

   const cleanup = prepareForCapture(sourceElement, pageWidth);

   try {
     const {
       sourceWidth,
       totalHeight,
       globalScaleFactor,
       sourceHeightPerPage
     } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);

      // Simple fixed-interval breaks
      const smartBreaks: number[] = [];
      for (let y = sourceHeightPerPage; y < totalHeight; y += sourceHeightPerPage) {
        smartBreaks.push(y);
      }

    const pdfDoc = await PDFDocument.create();

    onProgress?.('capturing', 20);

    const canvas = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight);

    onProgress?.('paginating', 40);

    await generatePDFPages(pdfDoc, canvas, smartBreaks, totalHeight, globalScaleFactor, pageWidth, pageHeight);

    onProgress?.('finalizing', 80);

    await addPageFooter(pdfDoc, options, pageWidth);

    onProgress?.('finalizing', 90);

    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    onProgress?.('downloading', 100);
    return new Blob([buffer], { type: 'application/pdf' });
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

    const dynamicScale = fitScale < 1
      ? Math.min(5, SCALE / fitScale)
      : SCALE;

    onProgress?.('capturing', 20);
    const canvas = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight, dynamicScale);

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
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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

  const resumePages = await combinedDoc.copyPages(
    resumeDoc,
    resumeDoc.getPageIndices()
  );
  resumePages.forEach(page => combinedDoc.addPage(page));

  await addPageFooter(combinedDoc, options);

  const pdfBytes = await combinedDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
