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
      scrollY: -window.scrollY,
      windowWidth: sourceWidth,
      windowHeight: totalHeight,
      x: rect.left,
      y: rect.top,
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

      // Calculate which portion of the source to capture for this page
      const sourceStartY = pageNum * sourceHeightPerPage;
      const sourceEndY = Math.min((pageNum + 1) * sourceHeightPerPage, totalHeight);
      const sourceSliceHeight = sourceEndY - sourceStartY;

      if (sourceSliceHeight <= 0) continue;

      // Convert to canvas coordinates (multiply by SCALE)
      const canvasStartY = sourceStartY * SCALE;
      const canvasSliceHeight = sourceSliceHeight * SCALE;

      // Calculate destination height on page canvas (maintaining aspect ratio)
      const destHeight = sourceSliceHeight * scaleFactor * SCALE;

      console.log(`PDF Generator: Page ${pageNum + 1}/${numPages}`, {
        sourceStartY,
        sourceEndY,
        sourceSliceHeight,
        canvasStartY,
        canvasSliceHeight,
        destHeight
      });

      // Draw from captured canvas to page canvas
      ctx.drawImage(
        canvas,
        0, canvasStartY,                    // Source x, y
        canvas.width, canvasSliceHeight,    // Source width, height
        0, 0,                               // Dest x, y
        pageCanvas.width, destHeight        // Dest width, height
      );

      // Convert page canvas to PNG
      const imgData = pageCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(imgData);

      // Add page to PDF
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      
      // Calculate actual image height on this PDF page
      const pdfImageHeight = sourceSliceHeight * scaleFactor;
      
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
