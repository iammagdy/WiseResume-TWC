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
  templateId: TemplateId
): Promise<Blob> {
  // Find or create the hidden render container
  let container = document.getElementById('pdf-render-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${PAGE_WIDTH}px;
      background: white;
      z-index: -1000;
    `;
    document.body.appendChild(container);
  }

  // Get the template element from the preview
  const previewElement = document.querySelector('[data-resume-template]') as HTMLElement;
  
  if (!previewElement) {
    throw new Error('Resume template not found. Please ensure the preview is visible.');
  }

  // Clone the template into our container
  const clone = previewElement.cloneNode(true) as HTMLElement;
  clone.style.width = `${PAGE_WIDTH}px`;
  clone.style.minHeight = `${PAGE_HEIGHT}px`;
  clone.style.background = 'white';
  clone.style.color = 'black';
  container.innerHTML = '';
  container.appendChild(clone);

  // Wait for fonts and images to load
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Calculate the total height of the content
    const totalHeight = clone.scrollHeight;
    const numPages = Math.ceil(totalHeight / PAGE_HEIGHT);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      // Capture each page section
      const canvas = await html2canvas(clone, {
        scale: SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        x: 0,
        y: pageNum * PAGE_HEIGHT,
        windowWidth: PAGE_WIDTH,
        windowHeight: totalHeight,
        logging: false,
      });

      // Convert canvas to PNG
      const imgData = canvas.toDataURL('image/png');
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
  } finally {
    // Clean up
    container.innerHTML = '';
  }
}
