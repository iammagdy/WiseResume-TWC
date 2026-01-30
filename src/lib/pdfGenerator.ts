import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib';
import { ResumeData, TemplateId } from '@/types/resume';

// PDF dimensions (Letter size)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;

// Color definitions
const COLORS = {
  // Modern template
  modern: {
    primary: rgb(0.486, 0.227, 0.929), // Purple
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.5, 0.5, 0.5),
  },
  // Classic template
  classic: {
    primary: rgb(0.1, 0.1, 0.1),
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.4, 0.4, 0.4),
  },
  // Minimal template
  minimal: {
    primary: rgb(0.3, 0.3, 0.3),
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.6, 0.6, 0.6),
  },
  // Professional template
  professional: {
    primary: rgb(0.1, 0.2, 0.4), // Navy
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.5, 0.5, 0.5),
  },
  // Developer template
  developer: {
    primary: rgb(0.133, 0.545, 0.133), // Green
    header: rgb(0.1, 0.1, 0.1), // Dark gray
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.5, 0.5, 0.5),
    accent: rgb(0.5, 0.2, 0.6), // Purple for categories
  },
  // Creative template
  creative: {
    primary: rgb(0.545, 0.361, 0.965), // Violet
    sidebar: rgb(0.486, 0.227, 0.729),
    text: rgb(0.2, 0.2, 0.2),
    muted: rgb(0.5, 0.5, 0.5),
    white: rgb(1, 1, 1),
  },
  // Executive template
  executive: {
    primary: rgb(0.72, 0.53, 0.04), // Gold/Amber
    text: rgb(0.15, 0.15, 0.15),
    muted: rgb(0.4, 0.4, 0.4),
  },
};

// Helper functions
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    font: PDFFont;
    size: number;
    color: RGB;
    maxWidth: number;
    lineHeight?: number;
  }
): number {
  const { font, size, color, maxWidth, lineHeight = size + 4 } = options;
  const lines = wrapText(text, font, size, maxWidth);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line, { x, y: currentY, font, size, color });
    currentY -= lineHeight;
  }

  return currentY;
}

// ============ MODERN TEMPLATE PDF ============
async function generateModernPDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const colors = COLORS.modern;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  // Name
  page.drawText(resume.contactInfo.fullName || 'Your Name', {
    x: MARGIN,
    y,
    font: helveticaBold,
    size: 24,
    color: colors.text,
  });
  y -= 8;

  // Accent line under name
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 100, y },
    thickness: 3,
    color: colors.primary,
  });
  y -= 20;

  // Contact info
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    page.drawText(contactParts.join('  •  '), {
      x: MARGIN,
      y,
      font: helvetica,
      size: 9,
      color: colors.muted,
    });
    y -= 15;
  }

  // Links
  const links = [resume.contactInfo.linkedin, resume.contactInfo.portfolio].filter(Boolean);
  if (links.length > 0) {
    page.drawText(links.join('  |  '), {
      x: MARGIN,
      y,
      font: helvetica,
      size: 9,
      color: colors.primary,
    });
    y -= 10;
  }

  // Section helper
  const drawSection = (title: string) => {
    y -= 20;
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y,
      font: helveticaBold,
      size: 11,
      color: colors.primary,
    });
    y -= 5;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: colors.primary,
    });
    y -= 15;
  };

  // Summary
  if (resume.summary) {
    drawSection('Summary');
    y = drawWrappedText(page, resume.summary, MARGIN, y, {
      font: helvetica,
      size: 10,
      color: colors.text,
      maxWidth: contentWidth,
    });
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSection('Experience');

    for (const exp of resume.experience) {
      // Position
      page.drawText(exp.position || 'Position', {
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 11,
        color: colors.text,
      });

      // Date on right
      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = helvetica.widthOfTextAtSize(dateText, 9);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 14;

      // Company
      page.drawText(exp.company || 'Company', {
        x: MARGIN,
        y,
        font: helvetica,
        size: 10,
        color: colors.primary,
      });
      y -= 12;

      // Description
      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN, y, {
          font: helvetica,
          size: 9,
          color: colors.text,
          maxWidth: contentWidth,
        });
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
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });
      y -= 12;

      page.drawText(`${edu.institution || 'Institution'} • ${edu.endDate || ''}`, {
        x: MARGIN,
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
    y = drawWrappedText(page, resume.skills.join('  •  '), MARGIN, y, {
      font: helvetica,
      size: 9,
      color: colors.text,
      maxWidth: contentWidth,
    });
  }
}

// ============ CLASSIC TEMPLATE PDF ============
async function generateClassicPDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const colors = COLORS.classic;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  // Centered header
  const name = resume.contactInfo.fullName || 'Your Name';
  const nameWidth = timesBold.widthOfTextAtSize(name, 22);
  page.drawText(name, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y,
    font: timesBold,
    size: 22,
    color: colors.text,
  });
  y -= 18;

  // Contact centered
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    const contactText = contactParts.join(' | ');
    const contactWidth = times.widthOfTextAtSize(contactText, 9);
    page.drawText(contactText, {
      x: (PAGE_WIDTH - contactWidth) / 2,
      y,
      font: times,
      size: 9,
      color: colors.muted,
    });
    y -= 15;
  }

  // Divider line
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: colors.muted,
  });
  y -= 20;

  // Section helper
  const drawSection = (title: string) => {
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y,
      font: timesBold,
      size: 11,
      color: colors.primary,
    });
    y -= 5;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: colors.muted,
    });
    y -= 12;
  };

  // Summary
  if (resume.summary) {
    drawSection('Professional Summary');
    y = drawWrappedText(page, resume.summary, MARGIN, y, {
      font: times,
      size: 10,
      color: colors.text,
      maxWidth: contentWidth,
    });
    y -= 15;
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSection('Work Experience');

    for (const exp of resume.experience) {
      page.drawText(exp.position || 'Position', {
        x: MARGIN,
        y,
        font: timesBold,
        size: 11,
        color: colors.text,
      });

      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = times.widthOfTextAtSize(dateText, 9);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: times,
        size: 9,
        color: colors.muted,
      });
      y -= 13;

      page.drawText(exp.company || 'Company', {
        x: MARGIN,
        y,
        font: times,
        size: 10,
        color: colors.muted,
      });
      y -= 12;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN, y, {
          font: times,
          size: 9,
          color: colors.text,
          maxWidth: contentWidth,
        });
      }
      y -= 12;
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSection('Education');

    for (const edu of resume.education) {
      page.drawText(edu.institution || 'Institution', {
        x: MARGIN,
        y,
        font: timesBold,
        size: 10,
        color: colors.text,
      });

      page.drawText(edu.endDate || '', {
        x: PAGE_WIDTH - MARGIN - times.widthOfTextAtSize(edu.endDate || '', 9),
        y,
        font: times,
        size: 9,
        color: colors.muted,
      });
      y -= 12;

      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(degreeText, {
        x: MARGIN,
        y,
        font: times,
        size: 9,
        color: colors.muted,
      });
      y -= 15;
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    drawSection('Skills');
    y = drawWrappedText(page, resume.skills.join(' • '), MARGIN, y, {
      font: times,
      size: 9,
      color: colors.text,
      maxWidth: contentWidth,
    });
  }
}

// ============ MINIMAL TEMPLATE PDF ============
async function generateMinimalPDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const colors = COLORS.minimal;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN - 20;

  // Name - light weight
  page.drawText(resume.contactInfo.fullName || 'Your Name', {
    x: MARGIN,
    y,
    font: helvetica,
    size: 28,
    color: colors.text,
  });
  y -= 20;

  // Contact - subtle
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    page.drawText(contactParts.join('    '), {
      x: MARGIN,
      y,
      font: helvetica,
      size: 8,
      color: colors.muted,
    });
  }
  y -= 35;

  // Summary - just text, no header
  if (resume.summary) {
    y = drawWrappedText(page, resume.summary, MARGIN, y, {
      font: helvetica,
      size: 10,
      color: colors.muted,
      maxWidth: contentWidth,
      lineHeight: 16,
    });
    y -= 25;
  }

  // Section helper - minimal style
  const drawSection = (title: string) => {
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y,
      font: helvetica,
      size: 8,
      color: colors.muted,
    });
    y -= 15;
  };

  // Experience
  if (resume.experience.length > 0) {
    drawSection('Experience');

    for (const exp of resume.experience) {
      page.drawText(exp.position || 'Position', {
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });

      const dateText = `${exp.startDate} — ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = helvetica.widthOfTextAtSize(dateText, 8);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: helvetica,
        size: 8,
        color: colors.muted,
      });
      y -= 12;

      page.drawText(exp.company || 'Company', {
        x: MARGIN,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 12;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN, y, {
          font: helvetica,
          size: 9,
          color: colors.text,
          maxWidth: contentWidth,
        });
      }
      y -= 15;
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSection('Education');

    for (const edu of resume.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(degreeText || 'Degree', {
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });
      y -= 12;

      page.drawText(`${edu.institution} • ${edu.endDate}`, {
        x: MARGIN,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 18;
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    drawSection('Skills');
    page.drawText(resume.skills.join(', '), {
      x: MARGIN,
      y,
      font: helvetica,
      size: 9,
      color: colors.text,
    });
  }
}

// ============ PROFESSIONAL TEMPLATE PDF ============
async function generateProfessionalPDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const colors = COLORS.professional;

  // Dark header bar
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 80,
    width: PAGE_WIDTH,
    height: 80,
    color: colors.primary,
  });

  // Name in header
  page.drawText(resume.contactInfo.fullName || 'Your Name', {
    x: MARGIN,
    y: PAGE_HEIGHT - 45,
    font: helveticaBold,
    size: 22,
    color: rgb(1, 1, 1),
  });

  // Contact in header
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    page.drawText(contactParts.join('  |  '), {
      x: MARGIN,
      y: PAGE_HEIGHT - 65,
      font: helvetica,
      size: 9,
      color: rgb(0.8, 0.85, 0.9),
    });
  }

  let y = PAGE_HEIGHT - 110;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  // Section helper
  const drawSection = (title: string) => {
    y -= 15;
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y,
      font: helveticaBold,
      size: 10,
      color: colors.primary,
    });
    y -= 3;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 2,
      color: colors.primary,
    });
    y -= 15;
  };

  // Summary
  if (resume.summary) {
    drawSection('Professional Summary');
    y = drawWrappedText(page, resume.summary, MARGIN, y, {
      font: helvetica,
      size: 10,
      color: colors.text,
      maxWidth: contentWidth,
    });
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSection('Experience');

    for (const exp of resume.experience) {
      page.drawText(exp.position || 'Position', {
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 11,
        color: colors.text,
      });

      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = helvetica.widthOfTextAtSize(dateText, 9);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: helvetica,
        size: 9,
        color: colors.muted,
      });
      y -= 13;

      page.drawText(exp.company || 'Company', {
        x: MARGIN,
        y,
        font: helvetica,
        size: 10,
        color: colors.primary,
      });
      y -= 12;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN, y, {
          font: helvetica,
          size: 9,
          color: colors.text,
          maxWidth: contentWidth,
        });
      }
      y -= 12;
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSection('Education');

    for (const edu of resume.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(degreeText || 'Degree', {
        x: MARGIN,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });
      y -= 12;

      page.drawText(`${edu.institution || 'Institution'} • ${edu.endDate || ''}`, {
        x: MARGIN,
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
    y = drawWrappedText(page, resume.skills.join('  •  '), MARGIN, y, {
      font: helvetica,
      size: 9,
      color: colors.text,
      maxWidth: contentWidth,
    });
  }
}

// ============ DEVELOPER TEMPLATE PDF ============
async function generateDeveloperPDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const colors = COLORS.developer;

  // Dark header (terminal-style)
  const headerHeight = 85;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: colors.header,
  });

  // Name as command prompt
  const name = resume.contactInfo.fullName?.replace(/\s/g, '_') || 'Your_Name';
  page.drawText('>', {
    x: MARGIN,
    y: PAGE_HEIGHT - 35,
    font: courierBold,
    size: 14,
    color: colors.primary,
  });
  page.drawText(name, {
    x: MARGIN + 20,
    y: PAGE_HEIGHT - 35,
    font: courierBold,
    size: 18,
    color: rgb(1, 1, 1),
  });

  // Role
  if (resume.experience[0]?.position) {
    page.drawText(resume.experience[0].position, {
      x: MARGIN + 20,
      y: PAGE_HEIGHT - 52,
      font: courier,
      size: 10,
      color: rgb(0.7, 0.7, 0.7),
    });
  }

  // Contact info in header
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.linkedin,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    page.drawText(contactParts.join(' | '), {
      x: MARGIN,
      y: PAGE_HEIGHT - 72,
      font: courier,
      size: 8,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  let y = PAGE_HEIGHT - headerHeight - 25;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  // Section helper - code comment style
  const drawSection = (title: string) => {
    y -= 15;
    page.drawText('//', {
      x: MARGIN,
      y,
      font: courier,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(title.toUpperCase(), {
      x: MARGIN + 20,
      y,
      font: courierBold,
      size: 10,
      color: colors.primary,
    });
    y -= 5;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 12;
  };

  // About/Summary
  if (resume.summary) {
    drawSection('ABOUT');
    y = drawWrappedText(page, resume.summary, MARGIN + 10, y, {
      font: courier,
      size: 9,
      color: colors.text,
      maxWidth: contentWidth - 10,
    });
  }

  // Tech Stack (Skills categorized)
  if (resume.skills.length > 0) {
    drawSection('TECH_STACK');

    // Simple categorization
    const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP'];
    const frameworks = ['React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask'];
    const databases = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase'];
    const tools = ['Git', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD'];

    const categorized = {
      Languages: [] as string[],
      Frameworks: [] as string[],
      Databases: [] as string[],
      Tools: [] as string[],
      Other: [] as string[],
    };

    resume.skills.forEach(skill => {
      const lower = skill.toLowerCase();
      if (languages.some(l => lower.includes(l.toLowerCase()))) {
        categorized.Languages.push(skill);
      } else if (frameworks.some(f => lower.includes(f.toLowerCase()))) {
        categorized.Frameworks.push(skill);
      } else if (databases.some(d => lower.includes(d.toLowerCase()))) {
        categorized.Databases.push(skill);
      } else if (tools.some(t => lower.includes(t.toLowerCase()))) {
        categorized.Tools.push(skill);
      } else {
        categorized.Other.push(skill);
      }
    });

    for (const [category, skills] of Object.entries(categorized)) {
      if (skills.length > 0) {
        page.drawText(`${category}:`, {
          x: MARGIN + 10,
          y,
          font: courier,
          size: 9,
          color: colors.accent,
        });
        page.drawText(skills.join(' • '), {
          x: MARGIN + 90,
          y,
          font: courier,
          size: 9,
          color: colors.text,
        });
        y -= 14;
      }
    }
    y -= 5;
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSection('EXPERIENCE');

    for (const exp of resume.experience) {
      // Position with > prefix
      page.drawText('>', {
        x: MARGIN + 10,
        y,
        font: courierBold,
        size: 9,
        color: colors.primary,
      });
      page.drawText(`${exp.position} @ ${exp.company}`, {
        x: MARGIN + 25,
        y,
        font: courierBold,
        size: 10,
        color: colors.text,
      });

      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = courier.widthOfTextAtSize(dateText, 8);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: courier,
        size: 8,
        color: colors.muted,
      });
      y -= 14;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN + 25, y, {
          font: courier,
          size: 8,
          color: colors.muted,
          maxWidth: contentWidth - 25,
        });
      }
      y -= 10;
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSection('EDUCATION');

    for (const edu of resume.education) {
      page.drawText('>', {
        x: MARGIN + 10,
        y,
        font: courierBold,
        size: 9,
        color: colors.primary,
      });

      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(`${degreeText} @ ${edu.institution}`, {
        x: MARGIN + 25,
        y,
        font: courier,
        size: 9,
        color: colors.text,
      });

      const dateWidth = courier.widthOfTextAtSize(edu.endDate || '', 8);
      page.drawText(edu.endDate || '', {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: courier,
        size: 8,
        color: colors.muted,
      });
      y -= 15;
    }
  }
}

// ============ CREATIVE TEMPLATE PDF ============
async function generateCreativePDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const colors = COLORS.creative;

  // Sidebar
  const sidebarWidth = 180;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: sidebarWidth,
    height: PAGE_HEIGHT,
    color: colors.sidebar,
  });

  // Initials circle in sidebar
  const initials = resume.contactInfo.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CV';

  page.drawCircle({
    x: sidebarWidth / 2,
    y: PAGE_HEIGHT - 60,
    size: 30,
    color: rgb(1, 1, 1),
    opacity: 0.2,
  });
  page.drawText(initials, {
    x: sidebarWidth / 2 - helveticaBold.widthOfTextAtSize(initials, 18) / 2,
    y: PAGE_HEIGHT - 67,
    font: helveticaBold,
    size: 18,
    color: colors.white,
  });

  // Sidebar content
  let sidebarY = PAGE_HEIGHT - 110;
  const sidebarMargin = 15;
  const sidebarContentWidth = sidebarWidth - sidebarMargin * 2;

  // Contact section in sidebar
  page.drawText('CONTACT', {
    x: sidebarMargin,
    y: sidebarY,
    font: helveticaBold,
    size: 8,
    color: rgb(0.8, 0.7, 0.95),
  });
  sidebarY -= 15;

  const contactItems = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
    resume.contactInfo.linkedin,
  ].filter(Boolean);

  for (const item of contactItems) {
    const lines = wrapText(item || '', helvetica, 7, sidebarContentWidth);
    for (const line of lines) {
      page.drawText(line, {
        x: sidebarMargin,
        y: sidebarY,
        font: helvetica,
        size: 7,
        color: rgb(0.9, 0.85, 1),
      });
      sidebarY -= 10;
    }
    sidebarY -= 3;
  }

  // Skills in sidebar
  if (resume.skills.length > 0) {
    sidebarY -= 15;
    page.drawText('SKILLS', {
      x: sidebarMargin,
      y: sidebarY,
      font: helveticaBold,
      size: 8,
      color: rgb(0.8, 0.7, 0.95),
    });
    sidebarY -= 15;

    for (const skill of resume.skills.slice(0, 10)) {
      page.drawText(`• ${skill}`, {
        x: sidebarMargin,
        y: sidebarY,
        font: helvetica,
        size: 7,
        color: colors.white,
      });
      sidebarY -= 11;
    }
  }

  // Education in sidebar
  if (resume.education.length > 0) {
    sidebarY -= 15;
    page.drawText('EDUCATION', {
      x: sidebarMargin,
      y: sidebarY,
      font: helveticaBold,
      size: 8,
      color: rgb(0.8, 0.7, 0.95),
    });
    sidebarY -= 15;

    for (const edu of resume.education) {
      page.drawText(edu.degree || 'Degree', {
        x: sidebarMargin,
        y: sidebarY,
        font: helveticaBold,
        size: 7,
        color: colors.white,
      });
      sidebarY -= 10;

      if (edu.field) {
        page.drawText(edu.field, {
          x: sidebarMargin,
          y: sidebarY,
          font: helvetica,
          size: 7,
          color: rgb(0.85, 0.8, 0.95),
        });
        sidebarY -= 10;
      }

      page.drawText(edu.institution || '', {
        x: sidebarMargin,
        y: sidebarY,
        font: helvetica,
        size: 7,
        color: rgb(0.75, 0.7, 0.85),
      });
      sidebarY -= 10;

      page.drawText(edu.endDate || '', {
        x: sidebarMargin,
        y: sidebarY,
        font: helvetica,
        size: 7,
        color: rgb(0.7, 0.65, 0.8),
      });
      sidebarY -= 15;
    }
  }

  // Main content area
  const mainX = sidebarWidth + 25;
  const mainWidth = PAGE_WIDTH - sidebarWidth - 50;
  let y = PAGE_HEIGHT - MARGIN;

  // Name
  page.drawText(resume.contactInfo.fullName || 'Your Name', {
    x: mainX,
    y,
    font: helveticaBold,
    size: 22,
    color: colors.text,
  });
  y -= 18;

  // Role
  if (resume.experience[0]?.position) {
    page.drawText(resume.experience[0].position, {
      x: mainX,
      y,
      font: helvetica,
      size: 11,
      color: colors.primary,
    });
    y -= 10;
  }

  // Accent line
  page.drawLine({
    start: { x: mainX, y },
    end: { x: mainX + 80, y },
    thickness: 2,
    color: colors.primary,
  });
  y -= 25;

  // Summary
  if (resume.summary) {
    page.drawText('About Me', {
      x: mainX,
      y,
      font: helveticaBold,
      size: 11,
      color: colors.text,
    });
    y -= 15;

    y = drawWrappedText(page, resume.summary, mainX, y, {
      font: helvetica,
      size: 9,
      color: colors.muted,
      maxWidth: mainWidth,
    });
    y -= 20;
  }

  // Experience
  if (resume.experience.length > 0) {
    page.drawLine({
      start: { x: mainX, y: y + 8 },
      end: { x: mainX + 40, y: y + 8 },
      thickness: 2,
      color: colors.primary,
    });
    page.drawText('Experience', {
      x: mainX + 50,
      y,
      font: helveticaBold,
      size: 11,
      color: colors.text,
    });
    y -= 18;

    for (const exp of resume.experience) {
      // Timeline dot
      page.drawCircle({
        x: mainX + 3,
        y: y + 4,
        size: 3,
        color: colors.primary,
      });

      page.drawText(exp.position || 'Position', {
        x: mainX + 15,
        y,
        font: helveticaBold,
        size: 10,
        color: colors.text,
      });
      y -= 12;

      page.drawText(exp.company || 'Company', {
        x: mainX + 15,
        y,
        font: helvetica,
        size: 9,
        color: colors.primary,
      });

      const dateText = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
      page.drawText(dateText, {
        x: mainX + mainWidth - helvetica.widthOfTextAtSize(dateText, 8),
        y,
        font: helvetica,
        size: 8,
        color: colors.muted,
      });
      y -= 12;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, mainX + 15, y, {
          font: helvetica,
          size: 8,
          color: colors.muted,
          maxWidth: mainWidth - 15,
        });
      }
      y -= 12;
    }
  }
}

// ============ EXECUTIVE TEMPLATE PDF ============
async function generateExecutivePDF(
  pdfDoc: PDFDocument,
  resume: ResumeData
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const colors = COLORS.executive;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN - 10;

  // Centered elegant header
  const name = (resume.contactInfo.fullName || 'YOUR NAME').toUpperCase();
  const nameWidth = timesBold.widthOfTextAtSize(name, 26);
  page.drawText(name, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y,
    font: timesBold,
    size: 26,
    color: colors.text,
  });
  y -= 22;

  // Role
  if (resume.experience[0]?.position) {
    const roleText = resume.experience[0].position.toUpperCase();
    const roleWidth = times.widthOfTextAtSize(roleText, 10);
    page.drawText(roleText, {
      x: (PAGE_WIDTH - roleWidth) / 2,
      y,
      font: times,
      size: 10,
      color: colors.primary,
    });
    y -= 18;
  }

  // Gold divider
  page.drawLine({
    start: { x: MARGIN + 50, y },
    end: { x: PAGE_WIDTH - MARGIN - 50, y },
    thickness: 1,
    color: colors.primary,
  });
  y -= 15;

  // Contact centered
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    const contactText = contactParts.join('  •  ');
    const contactWidth = times.widthOfTextAtSize(contactText, 9);
    page.drawText(contactText, {
      x: (PAGE_WIDTH - contactWidth) / 2,
      y,
      font: times,
      size: 9,
      color: colors.muted,
    });
    y -= 30;
  }

  // Section helper
  const drawSection = (title: string) => {
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y,
      font: times,
      size: 9,
      color: colors.primary,
    });
    y -= 12;
  };

  // Executive Summary
  if (resume.summary) {
    drawSection('Executive Summary');
    y = drawWrappedText(page, resume.summary, MARGIN, y, {
      font: timesItalic,
      size: 10,
      color: colors.text,
      maxWidth: contentWidth,
      lineHeight: 16,
    });
    y -= 20;
  }

  // Key Achievements box (if first experience has achievements)
  if (resume.experience[0]?.achievements && resume.experience[0].achievements.length > 0) {
    // Light gold background box
    const boxHeight = Math.min(resume.experience[0].achievements.length * 18 + 30, 100);
    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight + 15,
      width: contentWidth,
      height: boxHeight,
      color: rgb(0.99, 0.97, 0.92),
    });

    // Left gold accent bar
    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight + 15,
      width: 4,
      height: boxHeight,
      color: colors.primary,
    });

    page.drawText('KEY ACHIEVEMENTS', {
      x: MARGIN + 15,
      y: y,
      font: times,
      size: 9,
      color: colors.primary,
    });
    y -= 15;

    for (const achievement of resume.experience[0].achievements.slice(0, 3)) {
      page.drawText('◆', {
        x: MARGIN + 15,
        y,
        font: times,
        size: 8,
        color: colors.primary,
      });
      const lines = wrapText(achievement, times, 9, contentWidth - 35);
      for (const line of lines) {
        page.drawText(line, {
          x: MARGIN + 28,
          y,
          font: times,
          size: 9,
          color: colors.text,
        });
        y -= 14;
      }
    }
    y -= 15;
  }

  // Professional Experience
  if (resume.experience.length > 0) {
    drawSection('Professional Experience');

    for (const exp of resume.experience) {
      page.drawText(exp.position || 'Position', {
        x: MARGIN,
        y,
        font: timesBold,
        size: 11,
        color: colors.text,
      });

      const dateText = `${exp.startDate} — ${exp.current ? 'Present' : exp.endDate}`;
      const dateWidth = times.widthOfTextAtSize(dateText, 9);
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN - dateWidth,
        y,
        font: times,
        size: 9,
        color: colors.muted,
      });
      y -= 14;

      page.drawText(exp.company || 'Company', {
        x: MARGIN,
        y,
        font: times,
        size: 10,
        color: colors.primary,
      });
      y -= 12;

      if (exp.description) {
        y = drawWrappedText(page, exp.description, MARGIN, y, {
          font: times,
          size: 9,
          color: colors.text,
          maxWidth: contentWidth,
        });
      }
      y -= 15;
    }
  }

  // Two column footer
  const colWidth = (contentWidth - 30) / 2;

  // Education (left column)
  if (resume.education.length > 0) {
    page.drawText('EDUCATION', {
      x: MARGIN,
      y,
      font: times,
      size: 9,
      color: colors.primary,
    });

    let eduY = y - 15;
    for (const edu of resume.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      page.drawText(degreeText || 'Degree', {
        x: MARGIN,
        y: eduY,
        font: timesBold,
        size: 9,
        color: colors.text,
      });
      eduY -= 11;

      page.drawText(`${edu.institution}, ${edu.endDate}`, {
        x: MARGIN,
        y: eduY,
        font: times,
        size: 8,
        color: colors.muted,
      });
      eduY -= 15;
    }
  }

  // Skills (right column)
  if (resume.skills.length > 0) {
    const rightX = MARGIN + colWidth + 30;
    page.drawText('CORE COMPETENCIES', {
      x: rightX,
      y,
      font: times,
      size: 9,
      color: colors.primary,
    });

    const skillsY = y - 15;
    const skillsText = resume.skills.join(' • ');
    drawWrappedText(page, skillsText, rightX, skillsY, {
      font: times,
      size: 8,
      color: colors.text,
      maxWidth: colWidth,
    });
  }
}

// ============ MAIN EXPORT FUNCTION ============
export async function generatePDF(resume: ResumeData, templateId: TemplateId): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  switch (templateId) {
    case 'modern':
      await generateModernPDF(pdfDoc, resume);
      break;
    case 'classic':
      await generateClassicPDF(pdfDoc, resume);
      break;
    case 'minimal':
      await generateMinimalPDF(pdfDoc, resume);
      break;
    case 'professional':
      await generateProfessionalPDF(pdfDoc, resume);
      break;
    case 'developer':
      await generateDeveloperPDF(pdfDoc, resume);
      break;
    case 'creative':
      await generateCreativePDF(pdfDoc, resume);
      break;
    case 'executive':
      await generateExecutivePDF(pdfDoc, resume);
      break;
    default:
      await generateModernPDF(pdfDoc, resume);
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
