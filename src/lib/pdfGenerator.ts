import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { ResumeData, TemplateId } from '@/types/resume';

// PDF dimensions (Letter size in points)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const SCALE = 2; // Higher scale for better quality

interface ContentBlock {
  top: number;
  bottom: number;
}

/**
 * Finds smart page break positions that avoid cutting through content blocks.
 * Scans for elements with data-break-avoid attribute and adjusts breaks.
 */
export function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number
): number[] {
  // Get all unbreakable blocks
  const blockElements = sourceElement.querySelectorAll('[data-break-avoid]');
  const blocks: ContentBlock[] = [];
  
  const containerRect = sourceElement.getBoundingClientRect();
  
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
 * Generates a PDF from the resume by capturing the rendered React template.
 * This ensures WYSIWYG - what you see in preview is what you get in PDF.
 */
export async function generatePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null
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
    const smartBreaks = findSmartBreakPositions(sourceElement, sourceHeightPerPage, totalHeight);
    const numPages = smartBreaks.length + 1;

    console.log('PDF Generator: Smart pagination', { 
      scaleFactor, 
      sourceHeightPerPage, 
      numPages,
      totalHeight,
      smartBreaks 
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

      // Calculate how much of the PDF page this content fills
      const pdfContentHeight = pageContentHeight * scaleFactor;
      const destHeight = pdfContentHeight * SCALE;

      console.log(`PDF Generator: Page ${pageNum + 1}/${numPages}`, {
        pageStart,
        pageEnd,
        pageContentHeight,
        pdfContentHeight,
        sourceY,
        sliceHeight
      });

      // Draw from captured canvas to page canvas (from top)
      ctx.drawImage(
        canvas,
        0, sourceY,                    // Source x, y (from captured canvas)
        canvas.width, sliceHeight,     // Source width, height
        0, 0,                          // Dest x, y (top-left of page)
        pageCanvas.width, destHeight   // Dest width, height
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
