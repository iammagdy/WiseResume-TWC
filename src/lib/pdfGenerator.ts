import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ResumeData, TemplateId } from '@/types/resume';

export async function generatePDF(resume: ResumeData, templateId: TemplateId): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  
  const colors = {
    primary: templateId === 'modern' ? rgb(0.5, 0.2, 0.8) : rgb(0.1, 0.1, 0.1),
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.5, 0.5, 0.5),
  };

  // Helper functions
  const drawText = (text: string, x: number, yPos: number, options: {
    font?: typeof helvetica;
    size?: number;
    color?: typeof colors.text;
    maxWidth?: number;
  } = {}) => {
    const { font = helvetica, size = 10, color = colors.text, maxWidth = width - margin * 2 } = options;
    
    // Simple word wrap
    const words = text.split(' ');
    let line = '';
    let currentY = yPos;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, font, size, color });
        line = word;
        currentY -= size + 4;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, { x, y: currentY, font, size, color });
      currentY -= size + 4;
    }
    
    return currentY;
  };

  const drawSection = (title: string) => {
    y -= 20;
    page.drawText(title.toUpperCase(), {
      x: margin,
      y,
      font: helveticaBold,
      size: 11,
      color: colors.primary,
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: colors.primary,
    });
    y -= 15;
  };

  // Name
  page.drawText(resume.contactInfo.fullName || 'Your Name', {
    x: margin,
    y,
    font: helveticaBold,
    size: 24,
    color: colors.text,
  });
  y -= 20;

  // Contact info
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);
  
  if (contactParts.length > 0) {
    page.drawText(contactParts.join(' | '), {
      x: margin,
      y,
      font: helvetica,
      size: 9,
      color: colors.muted,
    });
    y -= 10;
  }

  // LinkedIn/Portfolio
  const links = [resume.contactInfo.linkedin, resume.contactInfo.portfolio].filter(Boolean);
  if (links.length > 0) {
    page.drawText(links.join(' | '), {
      x: margin,
      y,
      font: helvetica,
      size: 9,
      color: colors.primary,
    });
  }

  // Summary
  if (resume.summary) {
    drawSection('Summary');
    y = drawText(resume.summary, margin, y, { size: 10, maxWidth: width - margin * 2 });
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSection('Experience');
    
    for (const exp of resume.experience) {
      if (y < 100) {
        const newPage = pdfDoc.addPage([612, 792]);
        y = height - margin;
      }
      
      // Position and dates
      page.drawText(exp.position || 'Position', {
        x: margin,
        y,
        font: helveticaBold,
        size: 11,
        color: colors.text,
      });
      
      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = helvetica.widthOfTextAtSize(dateText, 9);
      page.drawText(dateText, {
        x: width - margin - dateWidth,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 14;

      // Company
      page.drawText(exp.company || 'Company', {
        x: margin,
        y,
        font: helvetica,
        size: 10,
        color: colors.muted,
      });
      y -= 12;

      // Description
      if (exp.description) {
        y = drawText(exp.description, margin, y, { size: 9, maxWidth: width - margin * 2 });
      }
      y -= 10;
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSection('Education');
    
    for (const edu of resume.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(degreeText || 'Degree', {
        x: margin,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });
      y -= 12;
      
      page.drawText(`${edu.institution || 'Institution'} • ${edu.endDate || ''}`, {
        x: margin,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 15;
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    drawSection('Skills');
    y = drawText(resume.skills.join(' • '), margin, y, { size: 9 });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
