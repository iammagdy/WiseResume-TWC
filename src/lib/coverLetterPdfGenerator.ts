import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export type TemplateStyle =
  | 'professional'
  | 'modern'
  | 'minimal'
  | 'compact'
  | 'creative';

interface CoverLetterRecord {
  job_title: string;
  company?: string | null;
  content: string;
  title?: string | null;
  tone?: string | null;
  template_style?: string | null;
  created_at?: string | null;
  /** Optional hex accent color from user's resume customization (e.g. "#1e40af") */
  accentHex?: string | null;
}

const PAGE_W = 612;
const PAGE_H = 792;

// Default brand accent — matches the "modern/default" template palette (#1e40af)
const DEFAULT_ACCENT = rgb(30 / 255, 64 / 255, 175 / 255);
const ACCENT_LIGHT = rgb(219 / 255, 234 / 255, 254 / 255);
const HEADER_BG = rgb(248 / 255, 250 / 255, 255 / 255);

// Typography sizes
const BRAND_SIZE = 8;
const TITLE_SIZE = 17;
const COMPANY_SIZE = 11;
const DATE_SIZE = 10;
const BODY_SIZE = 11;
const FOOTER_SIZE = 8;

const BODY_LINE_HEIGHT = BODY_SIZE * 1.55;
const PARAGRAPH_GAP = 9;

// Header layout constants
const HEADER_TOP_BAR_H = 4;
const HEADER_PADDING_TOP = 14;
const HEADER_PADDING_BOTTOM = 14;

/** Parse a hex color like "#1e40af" into a pdf-lib rgb value. Returns null if unparseable. */
function hexToRgb(hex: string): ReturnType<typeof rgb> | null {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return rgb(r / 255, g / 255, b / 255);
}

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

async function tryLoadLogo(pdfDoc: PDFDocument): Promise<import('pdf-lib').PDFImage | null> {
  try {
    const resp = await fetch('/logo-dark.png');
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return await pdfDoc.embedPng(new Uint8Array(buf));
  } catch {
    return null;
  }
}

function buildHeaderHeight(hasCompany: boolean): number {
  return (
    HEADER_TOP_BAR_H +
    HEADER_PADDING_TOP +
    TITLE_SIZE +
    6 +
    (hasCompany ? COMPANY_SIZE + 8 : 0) +
    DATE_SIZE +
    HEADER_PADDING_BOTTOM +
    8
  );
}

function drawBrandedHeader(
  page: ReturnType<PDFDocument['addPage']>,
  titleText: string,
  companyText: string,
  dateStr: string,
  fontBold: import('pdf-lib').PDFFont,
  fontRegular: import('pdf-lib').PDFFont,
  accent: ReturnType<typeof rgb>,
  logo: import('pdf-lib').PDFImage | null,
  margin: number
): number {
  const hasCompany = Boolean(companyText);
  const headerH = buildHeaderHeight(hasCompany);

  page.drawRectangle({
    x: 0,
    y: PAGE_H - headerH,
    width: PAGE_W,
    height: headerH,
    color: HEADER_BG,
  });

  page.drawRectangle({
    x: 0,
    y: PAGE_H - HEADER_TOP_BAR_H,
    width: PAGE_W,
    height: HEADER_TOP_BAR_H,
    color: accent,
  });

  const LOGO_SIZE = 20;
  const LOGO_X = PAGE_W - margin - LOGO_SIZE;
  const LOGO_Y = PAGE_H - HEADER_TOP_BAR_H - LOGO_SIZE - 6;
  if (logo) {
    page.drawImage(logo, {
      x: LOGO_X,
      y: LOGO_Y,
      width: LOGO_SIZE,
      height: LOGO_SIZE * (128 / 128),
    });
  } else {
    const brandLabel = 'WiseResume';
    const brandW = fontBold.widthOfTextAtSize(brandLabel, BRAND_SIZE);
    page.drawText(brandLabel, {
      x: PAGE_W - margin - brandW,
      y: PAGE_H - HEADER_TOP_BAR_H - HEADER_PADDING_TOP - BRAND_SIZE + 2,
      size: BRAND_SIZE,
      font: fontBold,
      color: accent,
    });
  }

  let y = PAGE_H - HEADER_TOP_BAR_H - HEADER_PADDING_TOP - TITLE_SIZE;

  page.drawText(titleText, {
    x: margin,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.20),
  });
  y -= 6;

  const titleW = fontBold.widthOfTextAtSize(titleText, TITLE_SIZE);
  page.drawLine({
    start: { x: margin, y: y + 2 },
    end: { x: margin + Math.min(titleW, 200), y: y + 2 },
    thickness: 2,
    color: accent,
  });
  y -= 4;

  if (hasCompany) {
    y -= COMPANY_SIZE;
    page.drawText(companyText, {
      x: margin,
      y,
      size: COMPANY_SIZE,
      font: fontRegular,
      color: rgb(0.30, 0.35, 0.55),
    });
    y -= 8;
  }

  y -= DATE_SIZE;
  page.drawText(dateStr, {
    x: margin,
    y,
    size: DATE_SIZE,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.55),
  });

  const sepY = PAGE_H - headerH + 8;
  page.drawLine({
    start: { x: margin, y: sepY },
    end: { x: PAGE_W - margin, y: sepY },
    thickness: 0.75,
    color: ACCENT_LIGHT,
  });

  return PAGE_H - headerH - 20;
}

function drawBrandedFooter(
  page: ReturnType<PDFDocument['addPage']>,
  fontRegular: import('pdf-lib').PDFFont,
  pageNum: number,
  totalPages: number,
  margin: number
): void {
  page.drawLine({
    start: { x: margin, y: margin - 10 },
    end: { x: PAGE_W - margin, y: margin - 10 },
    thickness: 0.5,
    color: ACCENT_LIGHT,
  });

  if (totalPages > 1) {
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pw = fontRegular.widthOfTextAtSize(pageText, FOOTER_SIZE);
    page.drawText(pageText, {
      x: (PAGE_W - pw) / 2,
      y: margin - 10 - FOOTER_SIZE - 4,
      size: FOOTER_SIZE,
      font: fontRegular,
      color: rgb(0.55, 0.55, 0.65),
    });
  }

  const badge = '• Created with WiseResume · part of The Wise Cloud';
  const bw = fontRegular.widthOfTextAtSize(badge, FOOTER_SIZE - 1);
  page.drawText(badge, {
    x: (PAGE_W - bw) / 2,
    y: margin - 10 - FOOTER_SIZE - 4 - (FOOTER_SIZE - 1) - 4,
    size: FOOTER_SIZE - 1,
    font: fontRegular,
    color: rgb(0.65, 0.65, 0.70),
  });
}

/** Professional template — branded header with accent bar, clean body, branded footer. */
async function renderProfessional(
  pdfDoc: PDFDocument,
  letter: CoverLetterRecord,
  logo: import('pdf-lib').PDFImage | null
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 72;
  const MAX_W = PAGE_W - MARGIN * 2;
  const accent = (letter.accentHex && hexToRgb(letter.accentHex)) || DEFAULT_ACCENT;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE, MAX_W);

  const footerReserved = MARGIN + FOOTER_SIZE * 2 + 22;

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  let y = drawBrandedHeader(page, titleText, companyText, dateStr, fontBold, fontRegular, accent, logo, MARGIN);
  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) {
      y -= PARAGRAPH_GAP;
    }
    if (y < footerReserved) {
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
        color: rgb(0.10, 0.10, 0.18),
      });
    }
    y -= BODY_LINE_HEIGHT;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawBrandedFooter(pages[i], fontRegular, i + 1, totalPages, MARGIN);
  }
}

/** Modern template — two-column sidebar layout with teal accent (or user accent). */
async function renderModern(
  pdfDoc: PDFDocument,
  letter: CoverLetterRecord,
  logo: import('pdf-lib').PDFImage | null
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 56;
  const SIDEBAR_W = 160;
  const BODY_X = MARGIN + SIDEBAR_W + 16;
  const BODY_W = PAGE_W - BODY_X - MARGIN;
  const ACCENT_COLOR = (letter.accentHex && hexToRgb(letter.accentHex)) || rgb(15 / 255, 118 / 255, 110 / 255);
  const TITLE_SIZE_M = 18;
  const META_SIZE = 9;
  const BODY_SIZE_M = 10.5;
  const FOOTER_SIZE_M = 8;
  const BODY_LINE_HEIGHT_M = BODY_SIZE_M * 1.55;
  const PARAGRAPH_GAP_M = 7;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE_M, BODY_W);

  const footerY = MARGIN - FOOTER_SIZE_M - 4;

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Sidebar background
  page.drawRectangle({ x: 0, y: 0, width: MARGIN + SIDEBAR_W, height: PAGE_H, color: ACCENT_COLOR });

  // Logo or brand mark in sidebar
  const LOGO_SIZE = 24;
  if (logo) {
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_H - MARGIN - LOGO_SIZE,
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    });
  } else {
    page.drawText('WiseResume', {
      x: MARGIN,
      y: PAGE_H - MARGIN - 10,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  // Sidebar title
  let sideY = PAGE_H - MARGIN - LOGO_SIZE - 20;
  page.drawText(titleText, { x: MARGIN, y: sideY, size: TITLE_SIZE_M, font: fontBold, color: rgb(1, 1, 1), maxWidth: SIDEBAR_W });
  sideY -= TITLE_SIZE_M + 6;

  if (companyText) {
    page.drawText(companyText, { x: MARGIN, y: sideY, size: META_SIZE, font: fontRegular, color: rgb(0.9, 0.9, 0.9) });
    sideY -= META_SIZE + 4;
  }

  page.drawText(dateStr, { x: MARGIN, y: sideY, size: META_SIZE, font: fontRegular, color: rgb(0.85, 0.85, 0.85) });

  // Body content
  let y = PAGE_H - MARGIN;
  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP_M;
    if (y < footerY + FOOTER_SIZE_M + 4) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      page.drawRectangle({ x: 0, y: 0, width: MARGIN + SIDEBAR_W, height: PAGE_H, color: ACCENT_COLOR });
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: BODY_X, y, size: BODY_SIZE_M, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= BODY_LINE_HEIGHT_M;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE_M);
    p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE_M - 4, size: FOOTER_SIZE_M, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });

    const badge = '• WiseResume · part of The Wise Cloud';
    const bw = fontRegular.widthOfTextAtSize(badge, 7);
    p.drawText(badge, { x: (PAGE_W - bw) / 2, y: MARGIN - FOOTER_SIZE_M - 18, size: 7, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });
  }
}

/** Minimal template — clean, understated, no sidebar, subtle accent rule. */
async function renderMinimal(
  pdfDoc: PDFDocument,
  letter: CoverLetterRecord,
  logo: import('pdf-lib').PDFImage | null
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 64;
  const MAX_W = PAGE_W - MARGIN * 2;
  const ACCENT_COLOR = (letter.accentHex && hexToRgb(letter.accentHex)) || DEFAULT_ACCENT;
  const TITLE_SIZE_N = 15;
  const BODY_SIZE_N = 10.5;
  const FOOTER_SIZE_N = 8;
  const BODY_LINE_HEIGHT_N = BODY_SIZE_N * 1.55;
  const PARAGRAPH_GAP_N = 8;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE_N, MAX_W);

  const footerReserved = MARGIN + FOOTER_SIZE_N * 2 + 16;

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Thin top accent rule
  page.drawRectangle({ x: 0, y: PAGE_H - 2, width: PAGE_W, height: 2, color: ACCENT_COLOR });

  // Logo or brand mark top-right
  const LOGO_SIZE = 18;
  if (logo) {
    page.drawImage(logo, {
      x: PAGE_W - MARGIN - LOGO_SIZE,
      y: PAGE_H - MARGIN - LOGO_SIZE + 10,
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    });
  } else {
    const bw = fontBold.widthOfTextAtSize('WiseResume', 7);
    page.drawText('WiseResume', {
      x: PAGE_W - MARGIN - bw,
      y: PAGE_H - MARGIN + 6,
      size: 7,
      font: fontBold,
      color: ACCENT_COLOR,
    });
  }

  let y = PAGE_H - MARGIN - 10;

  page.drawText(titleText, { x: MARGIN, y, size: TITLE_SIZE_N, font: fontBold, color: rgb(0.08, 0.08, 0.08) });
  y -= TITLE_SIZE_N + 4;

  if (companyText) {
    page.drawText(companyText, { x: MARGIN, y, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
  }

  page.drawText(dateStr, { x: MARGIN, y, size: 9, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
  y -= 10;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;

  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP_N;
    if (y < footerReserved) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      page.drawRectangle({ x: 0, y: PAGE_H - 2, width: PAGE_W, height: 2, color: ACCENT_COLOR });
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: MARGIN, y, size: BODY_SIZE_N, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= BODY_LINE_HEIGHT_N;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE_N);
    p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE_N - 4, size: FOOTER_SIZE_N, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });

    const badge = '• WiseResume · part of The Wise Cloud';
    const bw2 = fontRegular.widthOfTextAtSize(badge, 7);
    p.drawText(badge, { x: (PAGE_W - bw2) / 2, y: MARGIN - FOOTER_SIZE_N - 16, size: 7, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });
  }
}

/** Compact template — denser typography, tighter margins, single thin top rule. */
async function renderCompact(
  pdfDoc: PDFDocument,
  letter: CoverLetterRecord,
  logo: import('pdf-lib').PDFImage | null
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 48;
  const MAX_W = PAGE_W - MARGIN * 2;
  const ACCENT_COLOR = (letter.accentHex && hexToRgb(letter.accentHex)) || rgb(15 / 255, 23 / 255, 42 / 255);
  const TITLE_SIZE_C = 13;
  const BODY_SIZE_C = 10;
  const FOOTER_SIZE_C = 7;
  const BODY_LINE_HEIGHT_C = BODY_SIZE_C * 1.4;
  const PARAGRAPH_GAP_C = 6;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE_C, MAX_W);

  const footerReserved = MARGIN + FOOTER_SIZE_C * 2 + 12;

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Thin top accent rule
  page.drawRectangle({ x: 0, y: PAGE_H - 1.5, width: PAGE_W, height: 1.5, color: ACCENT_COLOR });

  // Brand mark top-right (compact uses text only — no logo to keep it tight)
  if (logo) {
    page.drawImage(logo, {
      x: PAGE_W - MARGIN - 14,
      y: PAGE_H - MARGIN - 14 + 6,
      width: 14,
      height: 14,
    });
  }

  let y = PAGE_H - MARGIN - 6;

  // Inline header: title · company on one row, date right-aligned
  page.drawText(titleText, { x: MARGIN, y, size: TITLE_SIZE_C, font: fontBold, color: ACCENT_COLOR });
  if (companyText) {
    const titleW = fontBold.widthOfTextAtSize(titleText, TITLE_SIZE_C);
    page.drawText(` · ${companyText}`, { x: MARGIN + titleW, y, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.45) });
  }
  const dateW = fontRegular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, { x: PAGE_W - MARGIN - dateW, y, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.5) });
  y -= TITLE_SIZE_C + 4;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.4, color: rgb(0.85, 0.85, 0.88) });
  y -= 12;

  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP_C;
    if (y < footerReserved) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      page.drawRectangle({ x: 0, y: PAGE_H - 1.5, width: PAGE_W, height: 1.5, color: ACCENT_COLOR });
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: MARGIN, y, size: BODY_SIZE_C, font: fontRegular, color: rgb(0.12, 0.12, 0.18) });
    }
    y -= BODY_LINE_HEIGHT_C;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    if (totalPages > 1) {
      const footerText = `${i + 1} / ${totalPages}`;
      const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE_C);
      p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE_C - 4, size: FOOTER_SIZE_C, font: fontRegular, color: rgb(0.65, 0.65, 0.7) });
    }
    const badge = '• WiseResume';
    const bw = fontRegular.widthOfTextAtSize(badge, 6.5);
    p.drawText(badge, { x: (PAGE_W - bw) / 2, y: MARGIN - FOOTER_SIZE_C - 14, size: 6.5, font: fontRegular, color: rgb(0.7, 0.7, 0.75) });
  }
}

/** Creative template — bold gradient-effect header band with oversized title. */
async function renderCreative(
  pdfDoc: PDFDocument,
  letter: CoverLetterRecord,
  logo: import('pdf-lib').PDFImage | null
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 56;
  const MAX_W = PAGE_W - MARGIN * 2;
  const accent = (letter.accentHex && hexToRgb(letter.accentHex)) || rgb(124 / 255, 58 / 255, 237 / 255);
  const accentDark = rgb(30 / 255, 27 / 255, 75 / 255);
  const TITLE_SIZE_R = 24;
  const META_SIZE_R = 10;
  const BODY_SIZE_R = 11;
  const FOOTER_SIZE_R = 8;
  const BODY_LINE_HEIGHT_R = BODY_SIZE_R * 1.55;
  const PARAGRAPH_GAP_R = 9;

  const dateStr = format(letter.created_at ? new Date(letter.created_at) : new Date(), 'MMMM d, yyyy');
  const titleText = letter.title || letter.job_title;
  const companyText = letter.company || '';
  const allLines = wrapText(letter.content, fontRegular, BODY_SIZE_R, MAX_W);

  const HEADER_H = 140;
  const footerReserved = MARGIN + FOOTER_SIZE_R * 2 + 18;

  const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Simulated gradient: full accent band + thin darker band at the bottom
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: accent });
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: 8, color: accentDark });

  // Decorative dot row
  for (let i = 0; i < 3; i++) {
    page.drawCircle({
      x: MARGIN + i * 14,
      y: PAGE_H - 32,
      size: 3,
      color: rgb(1, 1, 1),
      opacity: 1 - i * 0.25,
    });
  }

  // Title + meta on the band
  let headerY = PAGE_H - 60;
  page.drawText(titleText, { x: MARGIN, y: headerY, size: TITLE_SIZE_R, font: fontBold, color: rgb(1, 1, 1) });
  headerY -= TITLE_SIZE_R + 6;
  const metaParts: string[] = [];
  if (companyText) metaParts.push(companyText);
  metaParts.push(dateStr);
  page.drawText(metaParts.join('  •  '), { x: MARGIN, y: headerY, size: META_SIZE_R, font: fontRegular, color: rgb(1, 1, 1) });

  // Brand top-right
  if (logo) {
    page.drawImage(logo, { x: PAGE_W - MARGIN - 22, y: PAGE_H - MARGIN - 6, width: 22, height: 22 });
  } else {
    const brand = 'WiseResume';
    const bw = fontBold.widthOfTextAtSize(brand, 9);
    page.drawText(brand, { x: PAGE_W - MARGIN - bw, y: PAGE_H - 26, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  }

  let y = PAGE_H - HEADER_H - 28;
  const bodyTop = y;

  for (const line of allLines) {
    if (line.isParaStart && y < bodyTop) y -= PARAGRAPH_GAP_R;
    if (y < footerReserved) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      // Continuation pages get a thin accent rule only — no full header band.
      page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: accent });
      y = PAGE_H - MARGIN;
    }
    if (line.text) {
      page.drawText(line.text, { x: MARGIN, y, size: BODY_SIZE_R, font: fontRegular, color: rgb(0.12, 0.12, 0.18) });
    }
    y -= BODY_LINE_HEIGHT_R;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    if (totalPages > 1) {
      const footerText = `Page ${i + 1} of ${totalPages}`;
      const fw = fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE_R);
      p.drawText(footerText, { x: (PAGE_W - fw) / 2, y: MARGIN - FOOTER_SIZE_R - 4, size: FOOTER_SIZE_R, font: fontRegular, color: rgb(0.6, 0.6, 0.65) });
    }
    const badge = '• Created with WiseResume · part of The Wise Cloud';
    const bw = fontRegular.widthOfTextAtSize(badge, 7);
    p.drawText(badge, { x: (PAGE_W - bw) / 2, y: MARGIN - FOOTER_SIZE_R - 16, size: 7, font: fontRegular, color: rgb(0.65, 0.65, 0.7) });
  }
}

export async function generateCoverLetterPDF(letter: CoverLetterRecord): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const style = (letter.template_style as TemplateStyle) || 'professional';
  const logo = await tryLoadLogo(pdfDoc);

  switch (style) {
    case 'modern':
      await renderModern(pdfDoc, letter, logo);
      break;
    case 'minimal':
      await renderMinimal(pdfDoc, letter, logo);
      break;
    case 'compact':
      await renderCompact(pdfDoc, letter, logo);
      break;
    case 'creative':
      await renderCreative(pdfDoc, letter, logo);
      break;
    case 'professional':
    default:
      await renderProfessional(pdfDoc, letter, logo);
      break;
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
