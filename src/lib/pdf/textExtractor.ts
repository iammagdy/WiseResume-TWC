import type * as pdfjsLib from 'pdfjs-dist';
import { ensurePdfRuntimeAssets, ParserAssetError } from './runtimeAssets';
import { configurePdfJsWorker } from './pdfjsWorkerBootstrap';

interface SchedulerLike {
  yield?: () => Promise<void>;
}

function yieldToMain(): Promise<void> {
  const sched = (globalThis as unknown as { scheduler?: SchedulerLike }).scheduler;
  if (sched && typeof sched.yield === 'function') {
    return sched.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}

interface TextItem {
  str: string;
  transform: ArrayLike<number>;
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

type AnyTextItem = { str: string; transform?: unknown; hasEOL?: boolean };

function hasStr(item: any): item is AnyTextItem {
  return typeof item?.str === 'string';
}

function isTextItem(item: any): item is TextItem {
  const t = item?.transform;
  return (
    typeof item?.str === 'string' &&
    t &&
    typeof t.length === 'number' &&
    t.length >= 6 &&
    typeof t[4] === 'number' &&
    typeof t[5] === 'number'
  );
}

interface LineGroup {
  y: number;
  items: { x: number; str: string; width?: number }[];
}

export class PDFParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NO_TEXT'
      | 'PASSWORD_PROTECTED'
      | 'CORRUPTED'
      | 'WORKER_RUNTIME_FAILED'
      | 'ASSETS_MISSING'
      | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'PDFParseError';
  }
}

export type ExtractionFailureReason =
  | 'NO_ITEMS'
  | 'EMPTY_STRINGS'
  | 'TOO_FEW_WORDS'
  | 'PAGE_ERRORS';

export interface ExtractionResult {
  text: string;
  method: 'text';
  pageCount: number;
  needsOCR: boolean;
  confidence: number;
  qualityIssues: string[];
  pageTexts?: string[];
  failureReason?: ExtractionFailureReason;
  isIOS?: boolean;
}

export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  const isMacLike = /Macintosh/i.test(ua);
  const hasTouch = (navigator as any).maxTouchPoints > 1;
  return isMacLike && hasTouch;
}

export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  const first = await extractOnce(file, false);

  if (
    first.isIOS &&
    !first.text &&
    (first.failureReason === 'EMPTY_STRINGS' || first.failureReason === 'PAGE_ERRORS')
  ) {
    console.warn('[textExtractor] iOS first pass empty - retrying with system fonts', {
      failureReason: first.failureReason,
    });
    try {
      const retry = await extractOnce(file, true);
      if (retry.text && !retry.needsOCR) {
        console.info('[textExtractor] iOS system-font retry succeeded', {
          chars: retry.text.length,
          confidence: retry.confidence,
        });
        return retry;
      }
      return retry;
    } catch (retryErr) {
      console.warn('[textExtractor] iOS system-font retry threw', retryErr);
    }
  }

  return first;
}

async function extractOnce(file: File, forceSystemFonts: boolean): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const isIOS = isIOSWebKit();

  let pdf;
  try {
    await ensurePdfRuntimeAssets();
    await configurePdfJsWorker();
    const pdfjsLib = await import('pdfjs-dist');

    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      useSystemFonts: isIOS || forceSystemFonts,
      disableFontFace: forceSystemFonts,
      isEvalSupported: false,
    }).promise;
  } catch (error: unknown) {
    if (error instanceof ParserAssetError) {
      throw new PDFParseError(error.message, 'ASSETS_MISSING');
    }
    const errorMessage = error instanceof Error ? error.message : '';
    const errorName = error instanceof Error ? error.name : '';

    if (errorName === 'PasswordException') {
      throw new PDFParseError(
        'This PDF is password protected. Please provide an unprotected version.',
        'PASSWORD_PROTECTED',
      );
    }
    if (/fake worker|importscripts|worker/i.test(errorMessage)) {
      throw new PDFParseError(
        'The PDF reader could not start in this browser environment.',
        'WORKER_RUNTIME_FAILED',
      );
    }

    console.error('[textExtractor] getDocument failed', {
      errorName,
      errorMessage,
      isIOS,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    });
    throw new PDFParseError('This PDF appears to be corrupted or invalid.', 'CORRUPTED');
  }

  const pageTexts: string[] = [];
  const debugPages: Array<{ page: number; rawItems: number; nonEmptyItems: number; extractedChars: number; pageError?: string }> = [];
  const pageCount = pdf.numPages;
  let pageErrorCount = 0;

  for (let i = 1; i <= pageCount; i++) {
    if (i > 1) await yieldToMain();
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent({ includeMarkedContent: false } as Parameters<typeof page.getTextContent>[0]);
      const itemsArr: any[] = Array.isArray((textContent as any)?.items) ? (textContent as any).items : [];
      const rawItems = itemsArr.length;
      const nonEmptyItems = itemsArr.reduce((n, it) => n + (typeof it?.str === 'string' && it.str.trim() ? 1 : 0), 0);
      const pageText = reconstructPageText(itemsArr);
      debugPages.push({ page: i, rawItems, nonEmptyItems, extractedChars: pageText.length });
      pageTexts.push(pageText);
    } catch (pageError: unknown) {
      console.warn(`[textExtractor] Page ${i} text extraction failed:`, pageError);
      pageTexts.push('');
      pageErrorCount++;
      debugPages.push({
        page: i,
        rawItems: 0,
        nonEmptyItems: 0,
        extractedChars: 0,
        pageError: pageError instanceof Error ? pageError.message : String(pageError),
      });
    }
  }

  const fullText = pageTexts.join('\n\n');
  const cleanedText = fullText
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const totalWords = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0;
  const hasAnyItems = debugPages.some((page) => page.rawItems > 0);
  const hasAnyNonEmptyItems = debugPages.some((page) => page.nonEmptyItems > 0);

  let failureReason: ExtractionFailureReason | undefined;
  if (!cleanedText) {
    if (pageErrorCount === pageCount) failureReason = 'PAGE_ERRORS';
    else if (!hasAnyItems) failureReason = 'NO_ITEMS';
    else if (hasAnyItems && !hasAnyNonEmptyItems) failureReason = 'EMPTY_STRINGS';
  } else if (totalWords < 15) {
    failureReason = 'TOO_FEW_WORDS';
  }

  const needsOCR = !cleanedText || totalWords < 15;
  const qualityIssues: string[] = [];
  if (totalWords < 15) qualityIssues.push('low word count');
  if (pageErrorCount > 0) qualityIssues.push('page extraction errors');
  if (pageCount > 1 && pageTexts.some((t) => !t.trim())) qualityIssues.push('some pages empty');

  const confidence = needsOCR ? 0 : Math.max(0.35, Math.min(1, totalWords / 250));

  if (import.meta.env.DEV) {
    console.log(`PDF extraction preview: ${cleanedText.slice(0, 140)} (${totalWords} words, ${cleanedText.length} chars)`);
  }
  if (needsOCR) {
    console.warn('PDF extraction produced too little text', {
      pages: pageCount,
      cleanedChars: cleanedText.length,
      isIOS,
      failureReason,
      debugPages,
    });
  }

  return {
    text: cleanedText,
    method: 'text',
    pageCount,
    needsOCR,
    confidence,
    qualityIssues,
    pageTexts,
    failureReason,
    isIOS,
  };
}

function reconstructPageText(items: any[]): string {
  const textItems = items.filter(isTextItem);
  if (textItems.length === 0) {
    const fallback = items.filter(hasStr).map((it) => it.str.trim()).filter(Boolean);
    return fallback.join(' ').trim();
  }

  const lines: LineGroup[] = [];
  const Y_TOLERANCE = 3;

  for (const item of textItems) {
    const x = item.transform[4];
    const y = item.transform[5];
    const existingLine = lines.find((line) => Math.abs(line.y - y) <= Y_TOLERANCE);

    if (existingLine) {
      existingLine.items.push({ x, str: item.str, width: item.width });
    } else {
      lines.push({ y, items: [{ x, str: item.str, width: item.width }] });
    }
  }

  lines.sort((a, b) => b.y - a.y);

  const reconstructedLines = lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    let lastEndX = 0;

    for (const item of line.items) {
      const gap = item.x - lastEndX;
      const needsSpace = lineText && gap > 2;

      if (needsSpace) {
        lineText += ' ';
      }

      lineText += item.str;
      lastEndX = item.x + (item.width || 0);
    }

    return lineText.trim();
  });

  return reconstructedLines
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
