import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

interface CoverLetterRecord {
  job_title: string;
  company?: string | null;
  content: string;
  title?: string | null;
  tone?: string | null;
  created_at?: string | null;
}

const MARGIN = 72; // 1 inch
const PAGE_W = 612;
const PAGE_H = 792;
const MAX_W = PAGE_W - MARGIN * 2;

const ACCENT_COLOR = rgb(30 / 255, 64 / 255, 175 / 255); // #1e40af

const TITLE_SIZE = 16;
const COMPANY_SIZE = 11;
const DATE_SIZE = 10;
const BODY_SIZE = 11;
const FOOTER_SIZE = 8;

const BODY_LINE_HEIGHT = BODY_SIZE * 1.5;
const PARAGRAPH_GAP = 8;

export async function generateCoverLetterPDF(letter: CoverLetterRecord): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dateStr = format(
    letter.created_at ? new Date(letter.created_at) : new Date(),
    'MMMM d, yyyy'
  );

  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';

  // Split content into paragraphs
  const paragraphs = letter.content.split('\n');

  // Pre-wrap all paragraphs into lines
  type LineEntry = { text: string; isParaStart: boolean };
  const allLines: LineEntry[] = [];

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    if (!para.trim()) {
      allLines.push({ text: '', isParaStart: true });
      continue;
    }
    const words = para.split(/\s+/);
    let cur = '';
    let first = true;
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (fontRegular.widthOfTextAtSize(test, BODY_SIZE) > MAX_W && cur) {
        allLines.push({ text: cur, isParaStart: first });
        cur = w;
        first = false;
      } else {
        cur = test;
      }
    }
    if (cur) allLines.push({ text: cur, isParaStart: first });
  }

  // Calculate header height
  const headerHeight = 3 + 16 + TITLE_SIZE + 6 + (companyText ? COMPANY_SIZE + 12 : 8) + DATE_SIZE + 16;

  // Render pages
  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Draw header on first page
  // Accent bar
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 3,
    width: PAGE_W,
    height: 3,
    color: ACCENT_COLOR,
  });

  let y = PAGE_H - 3 - 16 - TITLE_SIZE;

  // Title
  page.drawText(titleText, {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 6;

  // Company
  if (companyText) {
    y -= COMPANY_SIZE;
    page.drawText(companyText, {
      x: MARGIN,
      y,
      size: COMPANY_SIZE,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 12;
  } else {
    y -= 8;
  }

  // Date
  y -= DATE_SIZE;
  page.drawText(dateStr, {
    x: MARGIN,
    y,
    size: DATE_SIZE,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 8;

  // Separator line
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  // Body
  const bodyTop = y;
  const footerY = MARGIN + FOOTER_SIZE + 8;

  for (const line of allLines) {
    // Add paragraph gap before new paragraphs (not the first one)
    if (line.isParaStart && y < bodyTop) {
      y -= PARAGRAPH_GAP;
    }

    if (y < footerY) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = PAGE_H - MARGIN;
    }

    if (line.text) {
      page.drawText(line.text, {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    y -= BODY_LINE_HEIGHT;
  }

  // Draw footers on all pages
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE);
    p.drawText(footerText, {
      x: (PAGE_W - fw) / 2,
      y: MARGIN - FOOTER_SIZE - 4,
      size: FOOTER_SIZE,
      font: fontRegular,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return pdfDoc.save();
}

export async function downloadCoverLetterPDF(letter: CoverLetterRecord): Promise<void> {
  const bytes = await generateCoverLetterPDF(letter);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cover-letter-${letter.job_title || 'untitled'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
