import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { ResumeData, TemplateId } from '@/types/resume';

// PDF dimensions (Letter size in points)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const SCALE = 2; // Higher scale for better quality

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
    const numPages = Math.ceil(totalHeight / sourceHeightPerPage);

    console.log('PDF Generator: Pagination', { 
      scaleFactor, 
      sourceHeightPerPage, 
      numPages,
      totalHeight 
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

    // Process pages
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = PAGE_WIDTH * SCALE;
      pageCanvas.height = PAGE_HEIGHT * SCALE;
      const ctx = pageCanvas.getContext('2d');
      
      if (!ctx) continue;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Calculate source slice from captured canvas (in canvas pixels)
      const canvasPageHeight = sourceHeightPerPage * SCALE;
      const sourceY = pageNum * canvasPageHeight;
      const remainingHeight = canvas.height - sourceY;
      const sliceHeight = Math.min(canvasPageHeight, remainingHeight);

      if (sliceHeight <= 0) continue;

      // Calculate how much of the page this slice fills (1.0 for full pages, less for last page)
      const pageFillRatio = sliceHeight / canvasPageHeight;
      const destHeight = PAGE_HEIGHT * SCALE * pageFillRatio;

      console.log(`PDF Generator: Page ${pageNum + 1}/${numPages}`, {
        sourceY,
        sliceHeight,
        pageFillRatio,
        destHeight
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
      
      // Calculate actual image height on this PDF page
      const pdfImageHeight = PAGE_HEIGHT * pageFillRatio;
      
      // In PDF, y=0 is BOTTOM. Position image at TOP of page.
      page.drawImage(pngImage, {
        x: 0,
        y: PAGE_HEIGHT - pdfImageHeight,
        width: PAGE_WIDTH,
        height: pdfImageHeight,
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
