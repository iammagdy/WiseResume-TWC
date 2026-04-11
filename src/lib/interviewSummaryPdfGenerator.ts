import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import type { AnswerScore, TranscriptEntry } from '@/hooks/useVoiceInterview';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const MAX_W = PAGE_W - MARGIN * 2;

// Brand palette matching the modern/default resume template (#1e40af)
const ACCENT = rgb(30 / 255, 64 / 255, 175 / 255);
const ACCENT_LIGHT = rgb(219 / 255, 234 / 255, 254 / 255);
const HEADER_BG = rgb(248 / 255, 250 / 255, 255 / 255);
const TEXT_DARK = rgb(0.08, 0.08, 0.20);
const TEXT_MID = rgb(0.30, 0.35, 0.55);
const TEXT_LIGHT = rgb(0.50, 0.50, 0.60);

// Layout
const BRAND_BAR_H = 4;
const HEADER_H = 96;
const FOOTER_RESERVED = 50;

function scoreColor(score: number): ReturnType<typeof rgb> {
  if (score >= 8) return rgb(34 / 255, 197 / 255, 94 / 255);
  if (score >= 6) return rgb(234 / 255, 179 / 255, 8 / 255);
  if (score >= 4) return rgb(249 / 255, 115 / 255, 22 / 255);
  return rgb(239 / 255, 68 / 255, 68 / 255);
}

function scoreLabel(score: number): string {
  if (score >= 8) return 'Strong';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Fair';
  return 'Needs Work';
}

function wrapText(
  text: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (!text.trim()) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .trim();
}

/** Extract Q&A pairs from the transcript. Each "user" entry following an "interviewer"
 *  entry forms a Q&A pair. Returns pairs in order. */
function extractQAPairs(transcript: TranscriptEntry[]): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i];
    if (entry.role === 'interviewer') {
      const nextUser = transcript.slice(i + 1).find(e => e.role === 'user');
      if (nextUser) {
        pairs.push({ question: entry.text.trim(), answer: nextUser.text.trim() });
      }
    }
  }
  return pairs;
}

interface DrawContext {
  pdfDoc: PDFDocument;
  pages: ReturnType<PDFDocument['addPage']>[];
  fontBold: import('pdf-lib').PDFFont;
  fontRegular: import('pdf-lib').PDFFont;
  y: number;
  currentPage: ReturnType<PDFDocument['addPage']>;
}

function newPage(ctx: DrawContext): void {
  const p = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(p);
  ctx.currentPage = p;
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: DrawContext, needed: number): void {
  if (ctx.y - needed < FOOTER_RESERVED) {
    newPage(ctx);
  }
}

function drawText(
  ctx: DrawContext,
  text: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  x: number = MARGIN
): void {
  ctx.currentPage.drawText(text, { x, y: ctx.y, size, font, color });
}

function drawWrappedText(
  ctx: DrawContext,
  text: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
  x: number = MARGIN,
  maxWidth: number = MAX_W
): void {
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    ensureSpace(ctx, size + 4);
    if (line) drawText(ctx, line, font, size, color, x);
    ctx.y -= lineHeight;
  }
}

function drawHRule(
  ctx: DrawContext,
  color: ReturnType<typeof rgb>,
  thickness: number = 0.5
): void {
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness,
    color,
  });
}

function drawSectionHeading(ctx: DrawContext, label: string): void {
  ensureSpace(ctx, 24);
  drawText(ctx, label, ctx.fontBold, 9, ACCENT);
  ctx.y -= 4;
  drawHRule(ctx, ACCENT_LIGHT, 0.75);
  ctx.y -= 12;
}

/** Try to load the logo as a PNG and embed it. Returns null on failure. */
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

export interface InterviewSummaryPdfOptions {
  candidateName?: string;
  summary: string;
  duration: number;
  scores: AnswerScore[];
  overallScore: number | null;
  transcript?: TranscriptEntry[];
  date?: Date;
}

export async function generateInterviewSummaryPDF(opts: InterviewSummaryPdfOptions): Promise<Uint8Array> {
  const { summary, duration, scores, overallScore, date = new Date(), candidateName, transcript } = opts;
  const dateStr = format(date, 'MMMM d, yyyy');
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins}m ${String(secs).padStart(2, '0')}s`;

  // Build Q&A pairs from transcript so we can display question + answer in each score card
  const qaPairs = transcript ? extractQAPairs(transcript) : [];

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Try to embed logo
  const logo = await tryLoadLogo(pdfDoc);

  const firstPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const ctx: DrawContext = {
    pdfDoc,
    pages: [firstPage],
    fontBold,
    fontRegular,
    y: PAGE_H,
    currentPage: firstPage,
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  ctx.currentPage.drawRectangle({
    x: 0,
    y: PAGE_H - HEADER_H,
    width: PAGE_W,
    height: HEADER_H,
    color: HEADER_BG,
  });

  ctx.currentPage.drawRectangle({
    x: 0,
    y: PAGE_H - BRAND_BAR_H,
    width: PAGE_W,
    height: BRAND_BAR_H,
    color: ACCENT,
  });

  // Logo or text brand mark (top-right)
  const LOGO_SIZE = 20;
  const LOGO_X = PAGE_W - MARGIN - LOGO_SIZE;
  const LOGO_Y = PAGE_H - BRAND_BAR_H - LOGO_SIZE - 8;
  if (logo) {
    ctx.currentPage.drawImage(logo, {
      x: LOGO_X,
      y: LOGO_Y,
      width: LOGO_SIZE,
      height: LOGO_SIZE * (488 / 512), // maintain aspect ratio
    });
  } else {
    const brand = 'WiseResume';
    const brandW = fontBold.widthOfTextAtSize(brand, 8);
    ctx.currentPage.drawText(brand, {
      x: PAGE_W - MARGIN - brandW,
      y: PAGE_H - BRAND_BAR_H - 16,
      size: 8,
      font: fontBold,
      color: ACCENT,
    });
  }

  // Headline
  ctx.currentPage.drawText('Interview Summary Report', {
    x: MARGIN,
    y: PAGE_H - BRAND_BAR_H - 24,
    size: 18,
    font: fontBold,
    color: TEXT_DARK,
  });

  // Accent underline
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: PAGE_H - BRAND_BAR_H - 30 },
    end: { x: MARGIN + 210, y: PAGE_H - BRAND_BAR_H - 30 },
    thickness: 2,
    color: ACCENT,
  });

  // Metadata row
  const metaParts: string[] = [dateStr, `Duration: ${durationStr}`];
  if (candidateName) metaParts.unshift(candidateName);
  const metaStr = metaParts.join('   ·   ');
  ctx.currentPage.drawText(metaStr, {
    x: MARGIN,
    y: PAGE_H - BRAND_BAR_H - 48,
    size: 9,
    font: fontRegular,
    color: TEXT_MID,
  });

  // Overall score pill
  if (overallScore !== null) {
    const sc = overallScore;
    const pillLabel = `Overall Score: ${sc}/10  ${scoreLabel(sc)}`;
    const pillW = fontBold.widthOfTextAtSize(pillLabel, 9) + 16;
    const pillX = MARGIN;
    const pillY = PAGE_H - BRAND_BAR_H - 68;
    ctx.currentPage.drawRectangle({
      x: pillX,
      y: pillY - 2,
      width: pillW,
      height: 14,
      color: ACCENT_LIGHT,
      borderColor: ACCENT,
      borderWidth: 0.75,
    });
    ctx.currentPage.drawText(pillLabel, {
      x: pillX + 8,
      y: pillY + 1,
      size: 9,
      font: fontBold,
      color: ACCENT,
    });
  }

  // Header separator
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: PAGE_H - HEADER_H + 6 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - HEADER_H + 6 },
    thickness: 0.75,
    color: ACCENT_LIGHT,
  });

  ctx.y = PAGE_H - HEADER_H - 18;

  // ── AI SUMMARY ────────────────────────────────────────────────────────────────
  const bodySize = 10;
  const bodyLineH = bodySize * 1.55;

  drawSectionHeading(ctx, 'AI FEEDBACK SUMMARY');

  const cleanSummary = stripMarkdown(summary);
  const summaryParas = cleanSummary.split('\n').filter(p => p.trim());
  for (const para of summaryParas) {
    drawWrappedText(ctx, para.trim(), fontRegular, bodySize, TEXT_DARK, bodyLineH);
    ctx.y -= 3;
  }

  // ── PER-ANSWER BREAKDOWN ─────────────────────────────────────────────────────
  if (scores.length > 0) {
    ctx.y -= 12;
    drawSectionHeading(ctx, 'ANSWER BREAKDOWN');

    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      // Find matching Q&A pair by answer index (questionIndex is 1-based from the hook)
      // qaPairs is 0-based, so index = s.questionIndex - 1
      const pairIndex = s.questionIndex - 1;
      const qa = qaPairs[pairIndex] ?? null;

      const tipSize = 9;
      const tipLineH = tipSize * 1.5;
      const labelSize = 9;

      // Estimate card height
      let cardH = 18; // header row
      if (qa) {
        const qLines = wrapText(qa.question, fontRegular, tipSize, MAX_W - 10);
        cardH += tipSize + 6 + qLines.length * tipLineH + 6;
        const aLines = wrapText(qa.answer, fontRegular, tipSize, MAX_W - 10);
        cardH += tipSize + 6 + aLines.length * tipLineH + 6;
      }
      if (s.tip) {
        const tLines = wrapText(s.tip, fontRegular, tipSize, MAX_W - 10);
        cardH += tipSize + 4 + tLines.length * tipLineH;
      }
      if (s.improvedAnswer) {
        const iLines = wrapText(`"${s.improvedAnswer}"`, fontRegular, tipSize - 1, MAX_W - 14);
        cardH += tipSize + 4 + iLines.length * (tipSize * 1.4);
      }
      cardH += 10; // bottom padding

      ensureSpace(ctx, cardH + 8);

      const cardTop = ctx.y + 4;
      const cardBottom = ctx.y - cardH + 4;

      // Card background
      ctx.currentPage.drawRectangle({
        x: MARGIN - 6,
        y: cardBottom,
        width: MAX_W + 12,
        height: cardTop - cardBottom,
        color: rgb(0.98, 0.98, 1.0),
        borderColor: ACCENT_LIGHT,
        borderWidth: 0.75,
      });

      // Left accent stripe
      ctx.currentPage.drawRectangle({
        x: MARGIN - 6,
        y: cardBottom,
        width: 3,
        height: cardTop - cardBottom,
        color: scoreColor(s.score),
      });

      // Answer #N label
      drawText(ctx, `Answer #${s.questionIndex}`, fontBold, 10, TEXT_DARK, MARGIN + 4);

      // Score badge top-right
      const badgeLabel = `${s.score}/10  ${scoreLabel(s.score)}`;
      const badgeW = fontBold.widthOfTextAtSize(badgeLabel, 8) + 12;
      const badgeX = PAGE_W - MARGIN - badgeW;
      ctx.currentPage.drawRectangle({
        x: badgeX,
        y: ctx.y - 2,
        width: badgeW,
        height: 12,
        color: ACCENT_LIGHT,
      });
      ctx.currentPage.drawText(badgeLabel, {
        x: badgeX + 6,
        y: ctx.y + 1,
        size: 8,
        font: fontBold,
        color: scoreColor(s.score),
      });

      ctx.y -= 16;

      // Question text
      if (qa?.question) {
        drawText(ctx, 'Question:', fontBold, labelSize, ACCENT, MARGIN + 4);
        ctx.y -= tipLineH;
        drawWrappedText(ctx, qa.question, fontRegular, tipSize, TEXT_DARK, tipLineH, MARGIN + 4, MAX_W - 10);
        ctx.y -= 4;
      }

      // Candidate answer text
      if (qa?.answer) {
        drawText(ctx, 'Your Answer:', fontBold, labelSize, rgb(0.20, 0.55, 0.30), MARGIN + 4);
        ctx.y -= tipLineH;
        drawWrappedText(ctx, qa.answer, fontRegular, tipSize, TEXT_MID, tipLineH, MARGIN + 4, MAX_W - 10);
        ctx.y -= 4;
      }

      // Tip
      if (s.tip) {
        drawText(ctx, 'Tip:', fontBold, labelSize, rgb(0.60, 0.40, 0.10), MARGIN + 4);
        ctx.y -= tipLineH;
        drawWrappedText(ctx, s.tip, fontRegular, tipSize, TEXT_MID, tipLineH, MARGIN + 4, MAX_W - 10);
        ctx.y -= 4;
      }

      // Improved answer
      if (s.improvedAnswer) {
        drawText(ctx, 'Suggested Answer:', fontBold, labelSize - 1, TEXT_LIGHT, MARGIN + 4);
        ctx.y -= tipSize * 1.4;
        drawWrappedText(
          ctx,
          `"${s.improvedAnswer}"`,
          fontRegular,
          tipSize - 1,
          TEXT_LIGHT,
          tipSize * 1.4,
          MARGIN + 8,
          MAX_W - 14
        );
        ctx.y -= 2;
      }

      ctx.y -= 12;
    }
  }

  // ── FOOTERS ───────────────────────────────────────────────────────────────────
  const totalPages = ctx.pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = ctx.pages[i];

    p.drawLine({
      start: { x: MARGIN, y: MARGIN - 8 },
      end: { x: PAGE_W - MARGIN, y: MARGIN - 8 },
      thickness: 0.5,
      color: ACCENT_LIGHT,
    });

    if (totalPages > 1) {
      const pt = `Page ${i + 1} of ${totalPages}`;
      const ptW = fontRegular.widthOfTextAtSize(pt, 8);
      p.drawText(pt, {
        x: (PAGE_W - ptW) / 2,
        y: MARGIN - 22,
        size: 8,
        font: fontRegular,
        color: TEXT_LIGHT,
      });
    }

    const badge = '• Interview Summary · WiseResume · part of The Wise Cloud';
    const bw = fontRegular.widthOfTextAtSize(badge, 7);
    p.drawText(badge, {
      x: (PAGE_W - bw) / 2,
      y: MARGIN - 36,
      size: 7,
      font: fontRegular,
      color: rgb(0.65, 0.65, 0.70),
    });
  }

  return pdfDoc.save();
}

export async function downloadInterviewSummaryPDF(opts: InterviewSummaryPdfOptions): Promise<void> {
  const bytes = await generateInterviewSummaryPDF(opts);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-summary-${format(opts.date ?? new Date(), 'yyyy-MM-dd')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
