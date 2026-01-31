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
    throw new Error('Resume template not found. Please ensure the preview is visible.');
  }

  // Wait for fonts and images to load
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    // Get the actual dimensions of the source element
    const rect = sourceElement.getBoundingClientRect();
    const sourceWidth = Math.max(rect.width, PAGE_WIDTH);
    const totalHeight = Math.max(sourceElement.scrollHeight, PAGE_HEIGHT);
    
    // Calculate scale factor to fit to PDF page width
    const scaleFactor = PAGE_WIDTH / sourceWidth;
    const scaledHeight = totalHeight * scaleFactor;
    const numPages = Math.ceil(scaledHeight / PAGE_HEIGHT);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Capture the entire element at once
    const canvas = await html2canvas(sourceElement, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: sourceWidth,
      height: totalHeight,
    });

    // Process pages
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      // Create a temporary canvas for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = PAGE_WIDTH * SCALE;
      pageCanvas.height = PAGE_HEIGHT * SCALE;
      const ctx = pageCanvas.getContext('2d');
      
      if (!ctx) continue;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Calculate source region for this page
      const sourceY = pageNum * (PAGE_HEIGHT / scaleFactor) * SCALE;
      const sourceHeight = Math.min(
        (PAGE_HEIGHT / scaleFactor) * SCALE,
        canvas.height - sourceY
      );

      // Draw the portion of the full canvas onto this page
      ctx.drawImage(
        canvas,
        0, sourceY, // Source x, y
        canvas.width, sourceHeight, // Source width, height
        0, 0, // Dest x, y
        pageCanvas.width, (sourceHeight / canvas.width) * pageCanvas.width // Dest width, height (maintaining aspect ratio)
      );

      // Convert page canvas to PNG
      const imgData = pageCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(imgData);

      // Add page to PDF
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      
      // Draw the image on the page
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    return new Blob([buffer], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF capture error:', error);
    throw new Error('Failed to capture resume template. Please try again.');
  }
}
