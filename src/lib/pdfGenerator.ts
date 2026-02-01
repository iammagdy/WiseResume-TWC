import html2canvas from 'html2canvas';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { ResumeData, TemplateId, ContactInfo, PDFOptions } from '@/types/resume';

// PDF dimensions (Letter size in points)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const SCALE = 2; // Higher scale for better quality
const MARGIN = 72; // 1 inch margins for cover letter

interface ContentBlock {
  top: number;
  bottom: number;
}

/**
 * Finds smart page break positions that avoid cutting through content blocks.
 * Supports both automatic detection and manual section-based breaks.
 */
export function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number,
  manualBreakSections?: string[]
): number[] {
  const containerRect = sourceElement.getBoundingClientRect();

  // If manual sections specified, find their bottom positions
  if (manualBreakSections && manualBreakSections.length > 0) {
    const manualBreaks: number[] = [];
    
    manualBreakSections.forEach(sectionId => {
      const section = sourceElement.querySelector(`[data-section="${sectionId}"]`);
      if (section) {
        const rect = section.getBoundingClientRect();
        manualBreaks.push(rect.bottom - containerRect.top + 8); // 8px padding
      }
    });
    
    return manualBreaks.filter(b => b < totalHeight && b > 0).sort((a, b) => a - b);
  }

  // Auto mode: Get all unbreakable blocks
  const blockElements = sourceElement.querySelectorAll('[data-break-avoid]');
  const blocks: ContentBlock[] = [];
  
  blockElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    blocks.push({
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
    });
  });

  // Sort blocks by top position
  blocks.sort((a, b) => a.top - b.top);
  
  // Calculate natural break positions
  const naturalBreaks: number[] = [];
  let pos = sourceHeightPerPage;
  while (pos < totalHeight) {
    naturalBreaks.push(pos);
    pos += sourceHeightPerPage;
  }
  
  if (naturalBreaks.length === 0) {
    return [];
  }

  // Adjust each break to avoid cutting blocks
  const smartBreaks: number[] = [];
  let cumulativeOffset = 0;
  
  for (let i = 0; i < naturalBreaks.length; i++) {
    const naturalBreak = naturalBreaks[i];
    const adjustedBreak = naturalBreak + cumulativeOffset;
    
    // Find block being cut by this break
    const cuttingBlock = blocks.find(
      b => b.top < adjustedBreak && b.bottom > adjustedBreak
    );
    
    if (cuttingBlock) {
      // Option A: Break before block (move up)
      const breakBefore = cuttingBlock.top - 8; // 8px padding
      const wastedSpaceBefore = adjustedBreak - breakBefore;
      
      // Option B: Break after block (move down)
      const breakAfter = cuttingBlock.bottom + 8;
      const extraContentAfter = breakAfter - adjustedBreak;
      
      // Maximum waste allowed (25% of page height)
      const maxWaste = sourceHeightPerPage * 0.25;
      
      // Ensure we don't create pages that are too short (minimum 20% of page)
      const minPageContent = sourceHeightPerPage * 0.20;
      const previousBreak = i === 0 ? 0 : smartBreaks[i - 1];
      
      if (wastedSpaceBefore <= extraContentAfter && wastedSpaceBefore < maxWaste) {
        // Check if breaking before would leave enough content on current page
        if (breakBefore - previousBreak >= minPageContent) {
          smartBreaks.push(breakBefore);
          cumulativeOffset += (breakBefore - adjustedBreak);
        } else {
          // Push break after to avoid tiny page
          smartBreaks.push(breakAfter);
          cumulativeOffset += (breakAfter - adjustedBreak);
        }
      } else if (extraContentAfter < maxWaste) {
        smartBreaks.push(breakAfter);
        cumulativeOffset += (breakAfter - adjustedBreak);
      } else {
        // Block is too large, must cut through it
        smartBreaks.push(adjustedBreak);
      }
    } else {
      smartBreaks.push(adjustedBreak);
    }
  }
  
  // Filter out any breaks that exceed total height
  return smartBreaks.filter(b => b < totalHeight && b > 0);
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
 * Adds page numbers to all pages in the PDF document.
 */
async function addPageNumbers(
  pdfDoc: PDFDocument,
  options: PDFOptions = {}
): Promise<void> {
  const { showPageNumbers = true, pageNumberFormat = 'full' } = options;
  
  if (!showPageNumbers) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const numPages = pages.length;

  for (let i = 0; i < numPages; i++) {
    const page = pages[i];
    const pageText = pageNumberFormat === 'simple' 
      ? `${i + 1}` 
      : `Page ${i + 1} of ${numPages}`;
    const textWidth = font.widthOfTextAtSize(pageText, 9);

    page.drawText(pageText, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y: 20,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}

/**
 * Generates a PDF from the resume by capturing the rendered React template.
 * This ensures WYSIWYG - what you see in preview is what you get in PDF.
 */
export async function generatePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  manualBreakSections?: string[],
  options?: PDFOptions
): Promise<Blob> {
  // Find the template element - either passed directly or by query
  let sourceElement = templateElement;
  
  if (!sourceElement) {
    sourceElement = document.querySelector('[data-resume-template]') as HTMLElement;
  }
  
  if (!sourceElement) {
    // Fallback: try to find by class or other selectors
    sourceElement = document.querySelector('.bg-white.text-black.mx-auto.shadow-2xl') as HTMLElement;
  }

  if (!sourceElement) {
    console.error('PDF Generator: No template element found');
    throw new Error('Resume template not found. Please ensure the preview is visible.');
  }

  // Wait for fonts and images to load
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    // Get the actual dimensions of the source element
    const rect = sourceElement.getBoundingClientRect();
    
    // Use the element's natural width/height, falling back to computed values
    const computedStyle = window.getComputedStyle(sourceElement);
    const sourceWidth = Math.max(
      sourceElement.offsetWidth || rect.width || parseInt(computedStyle.width) || PAGE_WIDTH,
      PAGE_WIDTH / 2 // Minimum sensible width
    );
    const totalHeight = Math.max(
      sourceElement.scrollHeight || sourceElement.offsetHeight || rect.height || PAGE_HEIGHT,
      PAGE_HEIGHT / 2 // Minimum sensible height
    );
    
    console.log('PDF Generator: Capturing element', { sourceWidth, totalHeight, rect });
    
    // Calculate scale factor to fit to PDF page width
    const scaleFactor = PAGE_WIDTH / sourceWidth;
    
    // How much source height fits on one PDF page
    const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;

    // Calculate smart break positions that avoid cutting content
    const smartBreaks = findSmartBreakPositions(
      sourceElement, 
      sourceHeightPerPage, 
      totalHeight,
      manualBreakSections
    );
    const numPages = smartBreaks.length + 1;

    console.log('PDF Generator: Smart pagination', { 
      scaleFactor, 
      sourceHeightPerPage, 
      numPages,
      totalHeight,
      smartBreaks,
      manualBreakSections 
    });

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Capture the element directly (don't clone - preserves all styles including Tailwind)
    const canvas = await html2canvas(sourceElement, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: sourceWidth,
      height: totalHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: sourceWidth,
      windowHeight: totalHeight,
      // Note: Don't pass x, y options - they introduce viewport offset issues
    });

    console.log('PDF Generator: Canvas captured', { width: canvas.width, height: canvas.height });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas capture resulted in empty image');
    }

    // Process pages using smart break positions
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      // Calculate page boundaries using smart breaks
      const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
      const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
      const pageContentHeight = pageEnd - pageStart;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = PAGE_WIDTH * SCALE;
      pageCanvas.height = PAGE_HEIGHT * SCALE;
      const ctx = pageCanvas.getContext('2d');
      
      if (!ctx) continue;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Calculate source slice from captured canvas (in canvas pixels)
      const sourceY = pageStart * SCALE;
      const sliceHeight = pageContentHeight * SCALE;

      if (sliceHeight <= 0) continue;

      // FIX: Scale the slice uniformly to fit PDF page width
      // Calculate the scale needed to fit source width to page width
      const sourceSliceWidth = canvas.width;
      const destSliceWidth = pageCanvas.width;
      const uniformScale = destSliceWidth / sourceSliceWidth;
      const destSliceHeight = sliceHeight * uniformScale;

      // Calculate PDF content height for proper positioning
      const pdfContentHeight = destSliceHeight / SCALE;

      console.log(`PDF Generator: Page ${pageNum + 1}/${numPages}`, {
        pageStart,
        pageEnd,
        pageContentHeight,
        pdfContentHeight,
        sourceY,
        sliceHeight,
        uniformScale
      });

      // Draw maintaining aspect ratio (uniform scaling)
      ctx.drawImage(
        canvas,
        0, sourceY,                        // Source x, y (from captured canvas)
        sourceSliceWidth, sliceHeight,     // Source width, height
        0, 0,                              // Dest x, y (top-left of page)
        destSliceWidth, destSliceHeight    // Dest width, height (scaled uniformly)
      );

      // Convert page canvas to PNG
      const imgData = pageCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(imgData);

      // Add page to PDF
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      
      // In PDF, y=0 is BOTTOM. Position image at TOP of page.
      page.drawImage(pngImage, {
        x: 0,
        y: PAGE_HEIGHT - pdfContentHeight,
        width: PAGE_WIDTH,
        height: pdfContentHeight,
      });
    }

    // Add page numbers
    await addPageNumbers(pdfDoc, options);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    console.log('PDF Generator: PDF created successfully');
    return new Blob([buffer], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF capture error:', error);
    throw new Error('Failed to capture resume template. Please try again.');
  }
}

/**
 * Generates a cover letter PDF with native text rendering.
 */
export async function generateCoverLetterPDF(
  coverLetter: string,
  contactInfo: ContactInfo,
  options?: PDFOptions
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const contentWidth = PAGE_WIDTH - (MARGIN * 2);
  const lines = wrapText(coverLetter, font, 11, contentWidth);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Add header with contact info
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

  // Contact details line
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

  // Add date
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

  // Draw cover letter content
  const lineHeight = 16;
  for (const line of lines) {
    if (y < MARGIN + 30) {
      // New page needed
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    if (line === '') {
      y -= lineHeight; // Paragraph break
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

  // Add page numbers
  await addPageNumbers(pdfDoc, options);

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
  manualBreakSections?: string[],
  options?: PDFOptions
): Promise<Blob> {
  // Generate cover letter PDF first
  const coverLetterBlob = await generateCoverLetterPDF(
    coverLetter,
    resume.contactInfo,
    { showPageNumbers: false } // We'll add page numbers to the combined doc
  );
  const coverLetterBytes = await coverLetterBlob.arrayBuffer();
  const coverLetterDoc = await PDFDocument.load(coverLetterBytes);

  // Generate resume PDF
  const resumeBlob = await generatePDF(
    resume,
    templateId,
    templateElement,
    manualBreakSections,
    { showPageNumbers: false } // We'll add page numbers to the combined doc
  );
  const resumeBytes = await resumeBlob.arrayBuffer();
  const resumeDoc = await PDFDocument.load(resumeBytes);

  // Create combined document
  const combinedDoc = await PDFDocument.create();

  // Copy cover letter pages
  const coverLetterPages = await combinedDoc.copyPages(
    coverLetterDoc,
    coverLetterDoc.getPageIndices()
  );
  coverLetterPages.forEach(page => combinedDoc.addPage(page));

  // Copy resume pages
  const resumePages = await combinedDoc.copyPages(
    resumeDoc,
    resumeDoc.getPageIndices()
  );
  resumePages.forEach(page => combinedDoc.addPage(page));

  // Add page numbers to the combined document
  await addPageNumbers(combinedDoc, options);

  const pdfBytes = await combinedDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
