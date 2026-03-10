/**
 * Professional Company Briefing PDF Generator
 * Uses pdf-lib to create a structured, branded PDF report.
 */
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, degrees } from 'pdf-lib';
import type { CompanyBriefing } from '@/types/companyBriefing';
import wiseAiLogoPng from '@/assets/wise-ai-logo-dark.png';

// Layout constants
const PAGE_W = 595; // A4
const PAGE_H = 842;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 40;
const HEADER_TOP = PAGE_H - MARGIN;

// Colors
const PRIMARY = rgb(0.13, 0.42, 0.85); // brand blue
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.75, 0.75, 0.75);
const DIVIDER = rgb(0.88, 0.88, 0.88);
const WATERMARK = rgb(0.92, 0.92, 0.95);
const WHITE = rgb(1, 1, 1);

interface PdfContext {
  doc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  logoImage: Awaited<ReturnType<PDFDocument['embedPng']>> | null;
  userEmail: string;
  pages: PDFPage[];
  currentPage: PDFPage;
  y: number;
}

function addNewPage(ctx: PdfContext): PDFPage {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(page);
  ctx.currentPage = page;
  ctx.y = HEADER_TOP - 20;
  drawWatermark(page, ctx.fontBold);
  return page;
}

function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.y - needed < MARGIN + FOOTER_H) {
    addNewPage(ctx);
  }
}

function drawWatermark(page: PDFPage, font: PDFFont) {
  const text = 'WiseResume AI';
  const size = 48;
  // Draw diagonal watermark pattern
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      page.drawText(text, {
        x: 80 + col * 200,
        y: 150 + row * 200,
        size,
        font,
        color: WATERMARK,
        rotate: degrees(35),
        opacity: 0.08,
      });
    }
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(ctx: PdfContext, text: string, opts: {
  font: PDFFont; size: number; color: typeof DARK; indent?: number; maxW?: number; lineHeight?: number;
}): number {
  const { font, size, color, indent = 0, lineHeight = size * 1.5 } = opts;
  const maxW = opts.maxW ?? (CONTENT_W - indent);
  const lines = wrapText(text, font, size, maxW);
  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    ctx.currentPage.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font, color });
    ctx.y -= lineHeight;
  }
  return lines.length;
}

function drawSectionTitle(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 30);
  ctx.y -= 8;
  // Divider line
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: ctx.y + 16 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 16 },
    thickness: 0.5,
    color: DIVIDER,
  });
  ctx.currentPage.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 18;
}

function drawKeyValue(ctx: PdfContext, label: string, value: string) {
  const labelW = ctx.fontBold.widthOfTextAtSize(label + ': ', 9);
  ensureSpace(ctx, 14);
  ctx.currentPage.drawText(label + ': ', { x: MARGIN + 8, y: ctx.y, size: 9, font: ctx.fontBold, color: GRAY });
  // Wrap value next to label
  const valueLines = wrapText(value, ctx.fontRegular, 9, CONTENT_W - 8 - labelW);
  valueLines.forEach((line, i) => {
    if (i > 0) {
      ctx.y -= 13;
      ensureSpace(ctx, 13);
    }
    ctx.currentPage.drawText(line, {
      x: MARGIN + 8 + (i === 0 ? labelW : labelW),
      y: ctx.y,
      size: 9,
      font: ctx.fontRegular,
      color: DARK,
    });
  });
  ctx.y -= 14;
}

function drawBullet(ctx: PdfContext, title: string, detail?: string) {
  ensureSpace(ctx, 14);
  ctx.currentPage.drawText('•', { x: MARGIN + 8, y: ctx.y, size: 9, font: ctx.fontRegular, color: PRIMARY });
  drawWrapped(ctx, title, { font: ctx.fontBold, size: 9, color: DARK, indent: 20, lineHeight: 13 });
  if (detail) {
    drawWrapped(ctx, detail, { font: ctx.fontRegular, size: 8.5, color: GRAY, indent: 20, lineHeight: 12 });
  }
  ctx.y -= 2;
}

function drawTags(ctx: PdfContext, tags: string[]) {
  // Render as comma-separated text
  const text = tags.join('  •  ');
  drawWrapped(ctx, text, { font: ctx.fontRegular, size: 9, color: DARK, indent: 8, lineHeight: 14 });
}

function drawFooters(ctx: PdfContext) {
  const totalPages = ctx.pages.length;
  ctx.pages.forEach((page, i) => {
    const footerY = MARGIN - 10;
    // Divider
    page.drawLine({
      start: { x: MARGIN, y: footerY + 12 },
      end: { x: PAGE_W - MARGIN, y: footerY + 12 },
      thickness: 0.5,
      color: DIVIDER,
    });
    const leftText = `Report by WiseResume AI  |  wiseresume.lovable.app`;
    page.drawText(leftText, { x: MARGIN, y: footerY, size: 7, font: ctx.fontRegular, color: LIGHT_GRAY });

    const emailText = ctx.userEmail || '';
    if (emailText) {
      page.drawText(emailText, { x: MARGIN, y: footerY - 10, size: 7, font: ctx.fontRegular, color: LIGHT_GRAY });
    }

    const pageText = `Page ${i + 1} of ${totalPages}`;
    const pageTextW = ctx.fontRegular.widthOfTextAtSize(pageText, 7);
    page.drawText(pageText, { x: PAGE_W - MARGIN - pageTextW, y: footerY, size: 7, font: ctx.fontRegular, color: LIGHT_GRAY });
  });
}

export async function generateCompanyBriefingPDF(briefing: CompanyBriefing, userEmail: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed logo
  let logoImage: PdfContext['logoImage'] = null;
  try {
    const logoResp = await fetch(wiseAiLogoPng);
    const logoBytes = await logoResp.arrayBuffer();
    logoImage = await doc.embedPng(new Uint8Array(logoBytes));
  } catch {
    // Continue without logo
  }

  const firstPage = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: PdfContext = {
    doc,
    fontRegular,
    fontBold,
    logoImage,
    userEmail,
    pages: [firstPage],
    currentPage: firstPage,
    y: HEADER_TOP,
  };

  drawWatermark(firstPage, fontBold);

  // ─── Header ───
  const logoSize = 36;
  if (logoImage) {
    const logoDims = logoImage.scale(logoSize / logoImage.height);
    firstPage.drawImage(logoImage, {
      x: MARGIN,
      y: ctx.y - logoSize + 8,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  const titleX = MARGIN + (logoImage ? logoSize + 12 : 0);
  firstPage.drawText('Company Briefing Report', {
    x: titleX,
    y: ctx.y - 4,
    size: 18,
    font: fontBold,
    color: PRIMARY,
  });

  const snap = briefing.companySnapshot;
  firstPage.drawText(snap.name, {
    x: titleX,
    y: ctx.y - 22,
    size: 12,
    font: fontRegular,
    color: DARK,
  });

  ctx.y -= logoSize + 16;

  // Accent line
  firstPage.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 2,
    color: PRIMARY,
  });
  ctx.y -= 16;

  // ─── Company Snapshot ───
  drawSectionTitle(ctx, 'Company Snapshot');
  drawKeyValue(ctx, 'Industry', snap.industry);
  drawKeyValue(ctx, 'Size', snap.size);
  drawKeyValue(ctx, 'Headquarters', snap.hq);
  drawKeyValue(ctx, 'Founded', snap.founded);
  drawKeyValue(ctx, 'Mission', snap.mission);
  if (snap.website) drawKeyValue(ctx, 'Website', snap.website);
  if (snap.revenue) drawKeyValue(ctx, 'Revenue', snap.revenue);
  if (snap.stockTicker) drawKeyValue(ctx, 'Stock Ticker', snap.stockTicker);

  // ─── Recent Highlights ───
  drawSectionTitle(ctx, 'Recent Highlights');
  for (const h of briefing.recentHighlights) {
    drawBullet(ctx, h.title, h.summary);
  }

  // ─── Products & Services ───
  if (briefing.productsOrServices?.length) {
    drawSectionTitle(ctx, 'Products & Services');
    drawTags(ctx, briefing.productsOrServices);
  }

  // ─── Tech Stack ───
  if (briefing.techStack?.length) {
    drawSectionTitle(ctx, 'Tech Stack');
    drawTags(ctx, briefing.techStack);
  }

  // ─── Competitors ───
  if (briefing.competitors?.length) {
    drawSectionTitle(ctx, 'Competitors');
    drawTags(ctx, briefing.competitors);
  }

  // ─── Culture Signals ───
  drawSectionTitle(ctx, 'Culture Signals');
  for (const c of briefing.cultureSignals) {
    drawBullet(ctx, c.signal, c.detail);
  }

  // ─── Workplace Insights ───
  if (briefing.glassdoorInsights) {
    const gi = briefing.glassdoorInsights;
    drawSectionTitle(ctx, 'Workplace Insights');
    drawKeyValue(ctx, 'Rating', gi.rating);
    if (gi.prosThemes.length) drawKeyValue(ctx, 'Pros', gi.prosThemes.join(', '));
    if (gi.consThemes.length) drawKeyValue(ctx, 'Cons', gi.consThemes.join(', '));
  }

  // ─── Key People ───
  drawSectionTitle(ctx, 'Key People');
  for (const p of briefing.keyPeople) {
    drawBullet(ctx, p.role, p.context);
  }

  // ─── Talking Points ───
  drawSectionTitle(ctx, 'Talking Points');
  for (const t of briefing.talkingPoints) {
    drawBullet(ctx, t.point, `↳ ${t.connection}`);
  }

  // ─── Questions to Ask ───
  drawSectionTitle(ctx, 'Questions to Ask');
  for (const q of briefing.questionsToAsk) {
    drawBullet(ctx, `"${q.question}"`, q.why);
  }

  // Draw footers on all pages
  drawFooters(ctx);

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
