import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export type TemplateStyle = 'professional' | 'modern' | 'minimal';

interface CoverLetterRecord {
  job_title: string;
  company?: string | null;
  content: string;
  title?: string | null;
  tone?: string | null;
  template_style?: string | null;
  created_at?: string | null;
}

const PAGE_W = 612;
const PAGE_H = 792;

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontSize: number,
  maxW: number
): { text: string; isParaStart: boolean }[] {
  const paragraphs = text.split('\n');
  const lines: { text: string; isParaStart: boolean }[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push({ text: '', isParaStart: true });
      continue;
    }
    const words = para.split(/\s+/);
    let cur = '';
    let first = true;
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxW && cur) {
        lines.push({ text: cur, isParaStart: first });
        cur = w;
        first = false;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push({ text: cur, isParaStart: first });
  }
  return lines;
}

async function renderProfessional(pdfDoc: PDFDocument, letter: CoverLetterRecord): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 72;
  const MAX_W = PAGE_W - MARGIN * 2;
  const ACCENT_COLOR = rgb(30 / 255, 64 / 255, 175 / 255);
  const TITLE_SIZE = 16;
  const COMPANY_SIZE = 11;
  const DATE_SIZE = 10;
  const BODY_SIZE = 11;
  const FOOTER_SIZE = 8;
  const BODY_LINE_HEIGHT = BODY_SIZE * 1.5;
  const PARAGRAPH_GAP = 8;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE, MAX_W);

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  page.drawRectangle({ x: 0, y: PAGE_H - 3, width: PAGE_W, height: 3, color: ACCENT_COLOR });

  let y = PAGE_H - 3 - 16 - TITLE_SIZE;
  page.drawText(titleText, { x: MARGIN, y, size: TITLE_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 6;

  if (companyText) {
    y -= COMPANY_SIZE;
    page.drawText(companyText, { x: MARGIN, y, size: COMPANY_SIZE, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    y -= 12;
  } else {
    y -= 8;
  }

  y -= DATE_SIZE;
  page.drawText(dateStr, { x: MARGIN, y, size: DATE_SIZE, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 8;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  const bodyTop = y;
  const footerY = MARGIN + FOOTER_SIZE + 8;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP;
    if (y < footerY) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: MARGIN, y, size: BODY_SIZE, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= BODY_LINE_HEIGHT;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE);
    p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE - 4, size: FOOTER_SIZE, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
  }
}

async function renderModern(pdfDoc: PDFDocument, letter: CoverLetterRecord): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 56;
  const SIDEBAR_W = 160;
  const BODY_X = MARGIN + SIDEBAR_W + 16;
  const BODY_W = PAGE_W - BODY_X - MARGIN;
  const ACCENT_COLOR = rgb(15 / 255, 118 / 255, 110 / 255); // teal #0f766e
  const TITLE_SIZE = 18;
  const META_SIZE = 9;
  const BODY_SIZE = 10.5;
  const FOOTER_SIZE = 8;
  const BODY_LINE_HEIGHT = BODY_SIZE * 1.55;
  const PARAGRAPH_GAP = 7;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE, BODY_W);

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Left accent bar
  page.drawRectangle({ x: 0, y: 0, width: 6, height: PAGE_H, color: ACCENT_COLOR });

  // Header area background
  page.drawRectangle({ x: 0, y: PAGE_H - 100, width: PAGE_W, height: 100, color: rgb(0.97, 0.97, 0.97) });

  // Title
  page.drawText(titleText, { x: MARGIN, y: PAGE_H - 42, size: TITLE_SIZE, font: fontBold, color: rgb(0.08, 0.08, 0.08) });

  // Company & date in header
  let metaY = PAGE_H - 42 - TITLE_SIZE - 6;
  if (companyText) {
    page.drawText(companyText, { x: MARGIN, y: metaY, size: META_SIZE + 1, font: fontRegular, color: ACCENT_COLOR });
    metaY -= META_SIZE + 5;
  }
  page.drawText(dateStr, { x: MARGIN, y: metaY, size: META_SIZE, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

  let y = PAGE_H - 100 - 24;
  const footerY = MARGIN + FOOTER_SIZE + 8;
  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP;
    if (y < footerY) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      page.drawRectangle({ x: 0, y: 0, width: 6, height: PAGE_H, color: ACCENT_COLOR });
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: BODY_X, y, size: BODY_SIZE, font: fontRegular, color: rgb(0.12, 0.12, 0.12) });
    }
    y -= BODY_LINE_HEIGHT;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE);
    p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE - 4, size: FOOTER_SIZE, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
  }
}

async function renderMinimal(pdfDoc: PDFDocument, letter: CoverLetterRecord): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 90;
  const MAX_W = PAGE_W - MARGIN * 2;
  const TITLE_SIZE = 14;
  const META_SIZE = 9;
  const BODY_SIZE = 11;
  const FOOTER_SIZE = 8;
  const BODY_LINE_HEIGHT = BODY_SIZE * 1.7;
  const PARAGRAPH_GAP = 10;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE, MAX_W);

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  let y = PAGE_H - MARGIN - TITLE_SIZE;

  page.drawText(titleText, { x: MARGIN, y, size: TITLE_SIZE, font: fontBold, color: rgb(0.08, 0.08, 0.08) });
  y -= TITLE_SIZE + 6;

  if (companyText) {
    page.drawText(companyText, { x: MARGIN, y, size: META_SIZE, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    y -= META_SIZE + 4;
  }

  page.drawText(dateStr, { x: MARGIN, y, size: META_SIZE, font: fontRegular, color: rgb(0.55, 0.55, 0.55) });
  y -= 28;

  const bodyTop = y;
  const footerY = MARGIN + FOOTER_SIZE + 8;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP;
    if (y < footerY) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: MARGIN, y, size: BODY_SIZE, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= BODY_LINE_HEIGHT;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE);
    p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE - 4, size: FOOTER_SIZE, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });
  }
}

export async function generateCoverLetterPDF(letter: CoverLetterRecord): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const style = (letter.template_style as TemplateStyle) || 'professional';

  if (style === 'modern') {
    await renderModern(pdfDoc, letter);
  } else if (style === 'minimal') {
    await renderMinimal(pdfDoc, letter);
  } else {
    await renderProfessional(pdfDoc, letter);
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
