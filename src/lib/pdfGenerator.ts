import html2canvas from 'html2canvas';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { ResumeData, TemplateId, ContactInfo, PDFOptions, SectionId } from '@/types/resume';

// PDF dimensions (Letter size in points)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44; // Space for page numbers + branding
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT;
const SCALE = 2; // Higher scale for better quality
const MARGIN = 72; // 1 inch margins for cover letter

interface ContentBlock {
  top: number;
  bottom: number;
  sectionId?: string; // For section blocks
  isHeader?: boolean; // For orphan protection synthetic blocks
}

interface SectionInfo {
  id: SectionId;
  top: number;
  bottom: number;
  element: HTMLElement;
}

/**
 * Gets element's top position relative to container using layout-based offsets.
 * Transform-agnostic - not affected by CSS transforms/animations.
 */
function getRelativeTop(element: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = element;
  
  while (curr && curr !== container && container.contains(curr)) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  
  return top;
}

/**
 * Gets element bounds relative to container using layout offsets.
 * Includes margins for accurate layout-aware measurements.
 */
function getBlockBounds(element: HTMLElement, container: HTMLElement): ContentBlock {
  const top = getRelativeTop(element, container);
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  
  return {
    top: top - marginTop,
    bottom: top + element.offsetHeight + marginBottom
  };
}

/**
 * Gets section bounds with margin-aware measurements.
 */
function getSectionBounds(element: HTMLElement, container: HTMLElement): ContentBlock {
  const top = getRelativeTop(element, container);
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  
  return {
    top: top - marginTop,
    bottom: top + element.offsetHeight + marginBottom,
    sectionId: element.getAttribute('data-section') || undefined
  };
}

/**
 * Scans the DOM for all sections and flow blocks (content that shouldn't be cut).
 * Returns sections in their actual DOM order.
 */
function scanLayoutBlocks(sourceElement: HTMLElement): {
  sections: SectionInfo[];
  flowBlocks: ContentBlock[];
} {
  // Get all sections in DOM order
  const sectionElements = sourceElement.querySelectorAll('[data-section]');
  const sections: SectionInfo[] = [];
  
  sectionElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const bounds = getSectionBounds(htmlEl, sourceElement);
    sections.push({
      id: htmlEl.getAttribute('data-section') as SectionId,
      top: bounds.top,
      bottom: bounds.bottom,
      element: htmlEl
    });
  });
  
  // Get all flow blocks (sections + break-avoid elements)
  const flowBlocks: ContentBlock[] = [];
  
  // Add all sections as flow blocks
  sections.forEach(section => {
    flowBlocks.push({
      top: section.top,
      bottom: section.bottom,
      sectionId: section.id
    });
  });
  
  // Add all break-avoid blocks
  const breakAvoidElements = sourceElement.querySelectorAll('[data-break-avoid]');
  breakAvoidElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    flowBlocks.push(getBlockBounds(htmlEl, sourceElement));
  });
  
  return { sections, flowBlocks };
}

/**
 * Creates synthetic "keep-with-next" blocks to prevent section header orphaning.
 * Combines section header with first content item into single unbreakable unit.
 */
function createHeaderProtectionBlocks(sourceElement: HTMLElement, sections: SectionInfo[]): ContentBlock[] {
  const protectedBlocks: ContentBlock[] = [];
  
  sections.forEach(section => {
    // Find the header element (first h2 or h3 inside the section)
    const header = section.element.querySelector('h2, h3') as HTMLElement | null;
    if (!header) return;
    
    // Find the first content element after the header
    const firstContent = section.element.querySelector('[data-break-avoid]') as HTMLElement | null;
    const firstMeaningfulChild = section.element.querySelector('p, ul, div:not(:first-child)') as HTMLElement | null;
    
    const contentElement = firstContent || firstMeaningfulChild;
    if (!contentElement) return;
    
    // Create a synthetic block that spans from header to first content end
    const headerBounds = getBlockBounds(header, sourceElement);
    const contentBounds = getBlockBounds(contentElement, sourceElement);
    
    protectedBlocks.push({
      top: headerBounds.top,
      bottom: contentBounds.bottom,
      isHeader: true
    });
  });
  
  return protectedBlocks;
}

/**
 * Computes auto breaks within a segment, avoiding cutting blocks.
 * STRICT MODE: Never split a data-break-avoid block that can fit on a page.
 */
function computeAutoBreaksInSegment(
  segmentStart: number,
  segmentEnd: number,
  sourceHeightPerPage: number,
  blocks: ContentBlock[]
): number[] {
  const breaks: number[] = [];
  let currentPos = segmentStart;
  
  while (currentPos + sourceHeightPerPage < segmentEnd) {
    let naturalBreak = currentPos + sourceHeightPerPage;
    
    // Find block being cut by this break
    const cuttingBlock = blocks.find(
      b => b.top < naturalBreak && b.bottom > naturalBreak && b.top >= currentPos
    );
    
    if (cuttingBlock) {
      const blockHeight = cuttingBlock.bottom - cuttingBlock.top;
      
      // STRICT: If block fits on a single page, NEVER split it - always move to next page
      if (blockHeight <= sourceHeightPerPage) {
        // Break before the block - move it entirely to next page
        const breakBefore = cuttingBlock.top - 8;
        
        // Ensure we don't create empty pages
        const minPageContent = sourceHeightPerPage * 0.10;
        if (breakBefore - currentPos >= minPageContent) {
          breaks.push(breakBefore);
          currentPos = breakBefore;
          continue;
        }
      }
      
      // Block is too large to fit on a single page - we have to split it
      // Use the original logic to minimize waste
      const breakBefore = cuttingBlock.top - 8;
      const wastedSpaceBefore = naturalBreak - breakBefore;
      
      const breakAfter = cuttingBlock.bottom + 8;
      const extraContentAfter = breakAfter - naturalBreak;
      
      const maxWaste = sourceHeightPerPage * 0.35;
      const minPageContent = sourceHeightPerPage * 0.15;
      
      if (wastedSpaceBefore <= extraContentAfter && wastedSpaceBefore < maxWaste) {
        if (breakBefore - currentPos >= minPageContent) {
          breaks.push(breakBefore);
          currentPos = breakBefore;
        } else if (breakAfter < segmentEnd) {
          breaks.push(breakAfter);
          currentPos = breakAfter;
        } else {
          break;
        }
      } else if (extraContentAfter < maxWaste && breakAfter < segmentEnd) {
        breaks.push(breakAfter);
        currentPos = breakAfter;
      } else {
        // Must cut through oversized block
        breaks.push(naturalBreak);
        currentPos = naturalBreak;
      }
    } else {
      breaks.push(naturalBreak);
      currentPos = naturalBreak;
    }
  }
  
  return breaks;
}

/**
 * Finds smart page break positions that avoid cutting through content blocks.
 * Supports both automatic detection and manual section-based breaks.
 * Uses transform-agnostic layout measurements for consistency.
 * 
 * LAYOUT-AWARE: For manual breaks, calculates safe Y-position that doesn't
 * slice through parallel columns in multi-column layouts.
 */
export function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number,
  manualBreakSections?: string[]
): number[] {
  // Scan DOM for all sections and flow blocks
  const { sections, flowBlocks } = scanLayoutBlocks(sourceElement);
  
  // Add section header protection blocks
  const headerBlocks = createHeaderProtectionBlocks(sourceElement, sections);
  
  // Combine all blocks for break avoidance
  const allBlocks: ContentBlock[] = [...flowBlocks, ...headerBlocks];
  
  // Sort blocks by top position
  allBlocks.sort((a, b) => a.top - b.top);

  // If manual sections specified, use hybrid mode with layout-aware breaks
  if (manualBreakSections && manualBreakSections.length > 0) {
    // Get forced break positions from manual sections
    const forcedBreaks: number[] = [];
    
    manualBreakSections.forEach(sectionId => {
      const targetSection = sections.find(s => s.id === sectionId);
      if (!targetSection) return;
      
      const baseline = targetSection.bottom;
      
      // LAYOUT-AWARE: Find the maximum bottom of all blocks that started above the baseline
      // This ensures we don't cut through parallel columns
      let maxBottom = baseline;
      
      flowBlocks.forEach(block => {
        // If this block started above our baseline, include its full extent
        if (block.top < baseline && block.bottom > maxBottom) {
          maxBottom = block.bottom;
        }
      });
      
      // Add padding after the safe position
      forcedBreaks.push(maxBottom + 8);
    });
    
    // Sort and filter forced breaks
    const sortedForcedBreaks = forcedBreaks
      .filter(b => b < totalHeight && b > 0)
      .sort((a, b) => a - b);
    
    // Build segments between forced breaks
    const allBreaks: number[] = [];
    let segmentStart = 0;
    
    for (const forcedBreak of sortedForcedBreaks) {
      // Add auto breaks within this segment
      const autoBreaks = computeAutoBreaksInSegment(
        segmentStart,
        forcedBreak,
        sourceHeightPerPage,
        allBlocks
      );
      allBreaks.push(...autoBreaks);
      
      // Add the forced break itself
      allBreaks.push(forcedBreak);
      segmentStart = forcedBreak;
    }
    
    // Handle remaining content after last forced break
    if (segmentStart < totalHeight) {
      const autoBreaks = computeAutoBreaksInSegment(
        segmentStart,
        totalHeight,
        sourceHeightPerPage,
        allBlocks
      );
      allBreaks.push(...autoBreaks);
    }
    
    // Remove duplicates and sort
    return [...new Set(allBreaks)]
      .filter(b => b < totalHeight && b > 0)
      .sort((a, b) => a - b);
  }

  // Pure auto mode - compute breaks for entire document using all blocks
  return computeAutoBreaksInSegment(0, totalHeight, sourceHeightPerPage, allBlocks);
}

/**
 * Gets sections in their actual DOM order (for UI ordering).
 * Returns section IDs based on visual layout position.
 */
export function getSectionsInDOMOrder(sourceElement: HTMLElement): SectionId[] {
  const { sections } = scanLayoutBlocks(sourceElement);
  
  // Sort by top position (visual order)
  sections.sort((a, b) => a.top - b.top);
  
  return sections.map(s => s.id);
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
  options: PDFOptions = {}
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
        x: (PAGE_WIDTH - textWidth) / 2,
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
        x: (PAGE_WIDTH - brandingWidth) / 2,
        y: 12,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55), // Lighter than page number
      });
    }
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
    
    // GLOBAL scale factor - used consistently for ALL pages
    const globalScaleFactor = PAGE_WIDTH / sourceWidth;
    
    // How much source height fits on one PDF page (accounting for footer)
    const sourceHeightPerPage = PRINTABLE_HEIGHT / globalScaleFactor;

    // Calculate smart break positions that avoid cutting content
    const smartBreaks = findSmartBreakPositions(
      sourceElement, 
      sourceHeightPerPage, 
      totalHeight,
      manualBreakSections
    );
    const numPages = smartBreaks.length + 1;

    console.log('PDF Generator: Smart pagination', { 
      globalScaleFactor, 
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
    });

    console.log('PDF Generator: Canvas captured', { width: canvas.width, height: canvas.height });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas capture resulted in empty image');
    }

    // Process pages using smart break positions with CONSISTENT scaling
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      // Calculate page boundaries using smart breaks
      const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
      const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
      const pageContentHeight = pageEnd - pageStart;

      // Calculate the scaled height in PDF points using GLOBAL scale factor
      const pdfContentHeight = pageContentHeight * globalScaleFactor;

      // Create page canvas at the exact size needed for this slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = PAGE_WIDTH * SCALE;
      pageCanvas.height = Math.ceil(pdfContentHeight * SCALE);
      const ctx = pageCanvas.getContext('2d');
      
      if (!ctx) continue;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Source slice from captured canvas (in canvas pixels)
      const sourceY = pageStart * SCALE;
      const sourceSliceHeight = pageContentHeight * SCALE;

      if (sourceSliceHeight <= 0) continue;

      console.log(`PDF Generator: Page ${pageNum + 1}/${numPages}`, {
        pageStart,
        pageEnd,
        pageContentHeight,
        pdfContentHeight,
        sourceY,
        sourceSliceHeight,
        globalScaleFactor
      });

      // Draw the slice - scaled uniformly by global factor
      // Source: full width, slice height from captured canvas
      // Dest: full page canvas (already sized to match scaled dimensions)
      ctx.drawImage(
        canvas,
        0, sourceY,                              // Source x, y
        canvas.width, sourceSliceHeight,         // Source width, height
        0, 0,                                    // Dest x, y
        pageCanvas.width, pageCanvas.height      // Dest width, height (maintains aspect ratio)
      );

      // Convert page canvas to PNG
      const imgData = pageCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(imgData);

      // Add page to PDF
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      
      // In PDF, y=0 is BOTTOM. Position image at TOP of page.
      // The image is already at correct scale, just position it
      page.drawImage(pngImage, {
        x: 0,
        y: PAGE_HEIGHT - pdfContentHeight,
        width: PAGE_WIDTH,
        height: pdfContentHeight,
      });

      // Draw white rectangle to cleanly mask ALL unused space below content
      // This ensures manual page breaks result in clean white space (professional look)
      const contentBottomY = PAGE_HEIGHT - pdfContentHeight;
      if (contentBottomY > 0) {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: PAGE_WIDTH,
          height: contentBottomY, // Covers everything from bottom up to content edge
          color: rgb(1, 1, 1), // White
        });
      }
    }

    // Add page footer (numbers + branding)
    await addPageFooter(pdfDoc, options);

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

  // Add page footer (numbers + branding)
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

  // Add page footer to the combined document
  await addPageFooter(combinedDoc, options);

  const pdfBytes = await combinedDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
