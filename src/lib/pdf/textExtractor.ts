import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// ─── Promise.withResolvers polyfill (main thread) ────────────────────────────
// pdfjs-dist v4+ calls Promise.withResolvers() internally. This API was
// added in Safari 17.4 (iOS 17.4, March 2024). iPhones on iOS ≤ 17.3 throw
// a TypeError the moment pdfjs tries to use it, causing every
// page.getTextContent() call to fail with PAGE_ERRORS.
// We polyfill here (main thread) and also inject it into the worker thread
// via buildPolyfillWorkerSrc() below.
if (typeof Promise.withResolvers !== 'function') {
  (Promise as unknown as Record<string, unknown>).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

/**
 * Build a classic blob worker URL that injects the Promise.withResolvers
 * polyfill into the worker thread BEFORE the pdfjs IIFE executes.
 *
 * Why a blob wrapper?
 * - pdfjs-dist v5's pdf.worker.min.mjs is an IIFE (no top-level import/export)
 *   and CAN be loaded with importScripts() in a classic Web Worker.
 * - Main-thread polyfills never reach the worker global scope — they are
 *   separate JS environments.
 * - The CSP already allows `worker-src 'self' blob:` so blob: workers are
 *   permitted without any config change.
 * - importScripts() with a same-origin URL is unconditionally allowed by the
 *   browser regardless of script-src, so this does not tighten the CSP.
 *
 * If URL.createObjectURL is not available (e.g. SSR / test environment) we
 * fall back to the raw worker URL so callers are never broken.
 */
export function buildPolyfillWorkerSrc(rawWorkerUrl: string): string {
  if (typeof URL === 'undefined' || typeof Blob === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return rawWorkerUrl;
  }
  try {
    // Resolve to an absolute URL so importScripts() inside the blob worker
    // can reach the file regardless of the page's base URL.
    const absoluteSrc = new URL(rawWorkerUrl, globalThis.location?.href ?? '/').href;

    // Compact polyfill repeated inside the worker scope. Written in ES5 so it
    // executes cleanly as a classic script in any browser that supports
    // Web Workers (no arrow functions, no const/let).
    const polyfill =
      'if(typeof Promise.withResolvers!=="function"){' +
      'Promise.withResolvers=function(){' +
      'var r,j;var p=new Promise(function(a,b){r=a;j=b;});' +
      'return{promise:p,resolve:r,reject:j};' +
      '};' +
      '}';

    // importScripts() runs synchronously and blocks until the script is
    // executed, so the polyfill is guaranteed to be in scope before any
    // pdfjs code runs.
    const code = `${polyfill}\nimportScripts(${JSON.stringify(absoluteSrc)});`;
    const blob = new Blob([code], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
  } catch {
    // Any failure (e.g. CSP that somehow blocks createObjectURL) degrades
    // gracefully: the raw worker URL is used and pdfjs behaves as before.
    return rawWorkerUrl;
  }
}

// Set the worker source. The blob wrapper injects the Promise.withResolvers
// polyfill into the worker thread so pdfjs v4+ works on iOS < 17.4.
// On non-iOS platforms the same wrapper is used for consistency — it has no
// negative performance impact and keeps the code path uniform.
pdfjsLib.GlobalWorkerOptions.workerSrc = buildPolyfillWorkerSrc(pdfWorkerUrl);

/**
 * Yield to the browser's event loop between expensive per-page extractions
 * so the UI thread can paint progress. pdfjs already parses on its own
 * worker, but `getTextContent` resolves on the main thread and the
 * subsequent line-reconstruction is pure JS.
 */
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
  // pdfjs can return this as an Array or a TypedArray depending on build/runtime
  transform: ArrayLike<number>;
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

type AnyTextItem = { str: string; transform?: unknown; hasEOL?: boolean };

function hasStr(item: any): item is AnyTextItem {
  return typeof item?.str === 'string';
}

// Type guard to filter out TextMarkedContent items (which lack str/transform)
function isTextItem(item: any): item is TextItem {
  const t = item?.transform;
  // Accept both Array and TypedArray (Float32Array), avoid filtering out real text
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

// Custom error types for better error handling
export class PDFParseError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_TEXT' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'PDFParseError';
  }
}

/**
 * Why text extraction came back empty. Helps the UI distinguish
 * a true scanned/image PDF (where OCR is the right answer) from
 * an iOS-WebKit font/asset decode failure (where OCR will likely
 * also fail and the user should be steered to desktop or Word).
 */
export type ExtractionFailureReason =
  | 'NO_ITEMS'           // Every page returned an empty items[] — likely scanned PDF
  | 'EMPTY_STRINGS'      // Items present but every str was empty — likely font/cmap decode failed
  | 'TOO_FEW_WORDS'      // Got some text but below the resume-content threshold
  | 'PAGE_ERRORS';       // getTextContent threw on every page

/**
 * Result from text extraction, including metadata about extraction quality.
 */
export interface ExtractionResult {
  text: string;
  method: 'text';
  pageCount: number;
  needsOCR: boolean; // True if text extraction found nothing usable
  confidence: number; // 0-1 quality score
  qualityIssues: string[]; // e.g. ["low word count", "possible multi-column"]
  pageTexts?: string[]; // Per-page text for header/footer removal
  /**
   * Set when the text path failed to produce a usable result. Lets the UI
   * pick a better recovery message than the generic "scanned PDF" prompt
   * (e.g. iOS Safari font decode failures look identical to scanned PDFs
   * to the existing logic but won't be solved by OCR either).
   */
  failureReason?: ExtractionFailureReason;
  /** True when running in iOS Safari/WebKit (incl. iOS Chrome). */
  isIOS?: boolean;
}

/**
 * Detect iOS / iPadOS WebKit. iOS Chrome/Edge/Firefox all use WebKit
 * under the hood (App Store policy), so a UA-based check covers all
 * iPhone browsers. Returns false on the server.
 */
export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPhone / iPod / iPad classic
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS 13+ identifies as Mac but exposes touch points
  const isMacLike = /Macintosh/i.test(ua);
  const hasTouch = (navigator as any).maxTouchPoints > 1;
  return isMacLike && hasTouch;
}

/**
 * Extract text from PDF with layout-aware line reconstruction.
 * Groups text items by Y coordinate to preserve line breaks.
 * 
 * Returns an ExtractionResult with metadata about extraction quality.
 * If needsOCR is true, the caller should offer OCR as a fallback.
 *
 * On iOS, when the first pass produces "items but all str empty"
 * (EMPTY_STRINGS — typically caused by WebKit failing to decode the
 * embedded subset font's cmap), we retry once with `useSystemFonts:true`
 * and `disableFontFace:true` so pdfjs falls back to system-installed
 * fonts. This recovers most "selectable text PDF that worked on Android
 * but not iPhone" cases without OCR.
 */
export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  // First pass: standard extraction.
  const first = await extractOnce(file, /*forceSystemFonts*/ false);

  // iOS recovery pass: only when the text path failed in a way that's
  // consistent with a font/cmap decode bug rather than a true scan.
  // Skipped on non-iOS where the standard path is already reliable.
  if (
    first.isIOS &&
    !first.text &&
    (first.failureReason === 'EMPTY_STRINGS' || first.failureReason === 'PAGE_ERRORS')
  ) {
    console.warn('[textExtractor] iOS first pass empty — retrying with system fonts', {
      failureReason: first.failureReason,
    });
    try {
      const retry = await extractOnce(file, /*forceSystemFonts*/ true);
      if (retry.text && !retry.needsOCR) {
        console.info('[textExtractor] iOS system-font retry succeeded', {
          chars: retry.text.length,
          confidence: retry.confidence,
        });
        return retry;
      }
      // Retry also empty — return retry result so failureReason reflects
      // the second attempt (which used the more permissive font path).
      return retry;
    } catch (retryErr) {
      console.warn('[textExtractor] iOS system-font retry threw', retryErr);
      // Fall through to the original first-pass result below.
    }
  }

  return first;
}

/**
 * Single extraction attempt. Factored out so we can run it twice on
 * iOS with different font-loading options.
 */
async function extractOnce(file: File, forceSystemFonts: boolean): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const isIOS = isIOSWebKit();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      // System fonts: on the retry pass (and always on iOS), let pdfjs
      // fall back to system-installed fonts when an embedded font can't
      // be decoded. This is the fix for the iPhone "selectable PDF
      // returns blank strings" failure mode.
      useSystemFonts: isIOS || forceSystemFonts,
      // Disabling @font-face on the retry pass forces pdfjs to use the
      // system font path for *all* glyphs, which side-steps the broken
      // cmap entirely.
      disableFontFace: forceSystemFonts,
      // iOS Safari with strict CSP can't eval; safe to leave off
      // unconditionally — pdfjs only uses eval for a small perf win.
      isEvalSupported: false,
    }).promise;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '';
    const errorName = error instanceof Error ? error.name : '';

    if (errorName === 'PasswordException') {
      throw new PDFParseError(
        'This PDF is password protected. Please provide an unprotected version.',
        'PASSWORD_PROTECTED'
      );
    }
    // Any other load failure means the file itself is unreadable.
    // Include UA so iOS-specific failures are visible in any captured logs.
    console.error('[textExtractor] getDocument failed', {
      errorName,
      errorMessage,
      isIOS,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    });
    throw new PDFParseError(
      'This PDF appears to be corrupted or invalid.',
      'CORRUPTED'
    );
  }

  const pageTexts: string[] = [];
  const debugPages: Array<{ page: number; rawItems: number; nonEmptyItems: number; extractedChars: number; pageError?: string }> = [];
  const pageCount = pdf.numPages;
  let pageErrorCount = 0;

  // Process pages individually so a single bad page doesn't abort the whole extraction.
  for (let i = 1; i <= pageCount; i++) {
    // Yield between pages so the upload UI stays responsive on big PDFs.
    if (i > 1) await yieldToMain();
    try {
      const page = await pdf.getPage(i);
      // getTextContent options vary across pdfjs versions — use a plain object and cast
      const textContent = await page.getTextContent({ includeMarkedContent: false } as Parameters<typeof page.getTextContent>[0]);
      const itemsArr: any[] = Array.isArray((textContent as any)?.items) ? (textContent as any).items : [];
      const rawItems = itemsArr.length;
      // Count items that actually carry non-empty text — distinguishes a
      // scanned PDF (rawItems = 0) from an iOS font/cmap decode failure
      // (rawItems > 0 but every str is "").
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

  // If every page failed text extraction, decide whether OCR is the right
  // recovery path or whether we hit an iOS-WebKit font/asset decode bug.
  if (pageTexts.every(t => !t.trim())) {
    const totalRawItems = debugPages.reduce((n, d) => n + d.rawItems, 0);
    const totalNonEmpty = debugPages.reduce((n, d) => n + d.nonEmptyItems, 0);

    let failureReason: ExtractionFailureReason;
    if (pageErrorCount === pageCount) {
      failureReason = 'PAGE_ERRORS';
    } else if (totalRawItems > 0 && totalNonEmpty === 0) {
      // pdfjs returned text items but their .str was always blank — the
      // glyph-to-unicode mapping failed (subset font + missing cmap, or
      // standardFontData failed to load). OCR will likely also fail
      // because the raster is sharp text rendered with the same broken
      // font, so the right answer is to tell the user.
      failureReason = 'EMPTY_STRINGS';
    } else {
      failureReason = 'NO_ITEMS';
    }

    console.warn('[textExtractor] All pages failed text extraction', {
      pageCount,
      failureReason,
      isIOS,
      pageErrorCount,
      totalRawItems,
      totalNonEmpty,
      debugPages,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    });

    // Only *suppress* OCR on iOS, where EMPTY_STRINGS/PAGE_ERRORS are
    // overwhelmingly caused by WebKit asset/font decode failures that
    // OCR-on-the-same-rendered-page also can't fix. On other platforms
    // EMPTY_STRINGS/PAGE_ERRORS may still benefit from OCR (e.g., PDFs
    // with custom encodings on desktop), so preserve the original
    // "always offer OCR when text path is empty" behaviour there.
    const ocrUnlikelyToHelp =
      isIOS && (failureReason === 'EMPTY_STRINGS' || failureReason === 'PAGE_ERRORS');

    return {
      text: '',
      method: 'text',
      pageCount,
      needsOCR: !ocrUnlikelyToHelp,
      confidence: 0,
      qualityIssues: ['text extraction failed for all pages'],
      failureReason,
      isIOS,
    };
  }

  const fullText = pageTexts.join('\n\n');

  // Check if we got meaningful text
  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  const hasLetters = /[A-Za-z]/.test(cleanedText);
  const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 1).length;

  // Log first 200 chars for debugging parsing issues
  if (import.meta.env.DEV) console.log('PDF extraction preview:', cleanedText.substring(0, 200), `(${wordCount} words, ${cleanedText.length} chars)`);

  if (cleanedText.length === 0 || !hasLetters || wordCount < 10) {
    // Try raw EOL-based extraction as hybrid fallback before triggering OCR
    const rawText = await extractRawText(pageTexts, pdf, debugPages);
    if (rawText) {
      const { computeTextConfidence } = await import('./textPreprocessor');
      const { confidence, issues } = computeTextConfidence(rawText.text);
      if (confidence >= 0.3) {
        return {
          text: rawText.text,
          method: 'text',
          pageCount,
          needsOCR: false,
          confidence,
          qualityIssues: issues,
          pageTexts: rawText.pageTexts,
        };
      }
    }

    console.warn('PDF extraction produced too little text', {
      pages: pageCount,
      cleanedChars: cleanedText.length,
      isIOS,
      debugPages,
    });

    // If we got *some* items but their text was tiny, the file might
    // still be a real text PDF that pdfjs decoded poorly (common on
    // iOS for embedded subset fonts). Distinguish that case from an
    // honestly-sparse scanned PDF so the UI can offer the right recovery.
    const totalRawItems = debugPages.reduce((n, d) => n + d.rawItems, 0);
    const totalNonEmpty = debugPages.reduce((n, d) => n + d.nonEmptyItems, 0);
    let failureReason: ExtractionFailureReason = 'TOO_FEW_WORDS';
    if (totalRawItems > 0 && totalNonEmpty === 0) failureReason = 'EMPTY_STRINGS';

    // Mirror the all-pages-empty branch: only suppress OCR on iOS for
    // EMPTY_STRINGS (font/cmap decode failure) where OCR is unlikely
    // to help. Non-iOS users keep the legacy "always offer OCR when
    // text is too sparse" behaviour.
    const ocrUnlikelyToHelp = isIOS && failureReason === 'EMPTY_STRINGS';

    return {
      text: '',
      method: 'text',
      pageCount,
      needsOCR: !ocrUnlikelyToHelp,
      confidence: 0,
      qualityIssues: ['no extractable text'],
      failureReason,
      isIOS,
    };
  }

  // Compute confidence for the extracted text
  const { computeTextConfidence } = await import('./textPreprocessor');
  const { confidence, issues } = computeTextConfidence(fullText);

  // If layout-aware extraction has low confidence, try hybrid
  if (confidence < 0.5) {
    const rawText = await extractRawText(pageTexts, pdf, debugPages);
    if (rawText) {
      const rawQuality = computeTextConfidence(rawText.text);
      if (rawQuality.confidence > confidence) {
        return {
          text: rawText.text,
          method: 'text',
          pageCount,
          needsOCR: false,
          confidence: rawQuality.confidence,
          qualityIssues: rawQuality.issues,
          pageTexts: rawText.pageTexts,
        };
      }
    }
  }

  return {
    text: fullText,
    method: 'text',
    pageCount,
    needsOCR: confidence < 0.2,
    confidence,
    qualityIssues: issues,
    pageTexts,
  };
}

/**
 * Fallback raw text extraction using hasEOL-based joins.
 * Used when layout-aware extraction fails or scores low.
 */
async function extractRawText(
  _existingPageTexts: string[],
  pdf: pdfjsLib.PDFDocumentProxy,
  _debugPages: Array<{ page: number; rawItems: number; extractedChars: number }>
): Promise<{ text: string; pageTexts: string[] } | null> {
  try {
    const rawPageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      if (i > 1) await yieldToMain();
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent({ includeMarkedContent: false } as any);
      const items = (textContent as any).items as any[];
      
      const parts: string[] = [];
      for (const item of items) {
        if (typeof item?.str === 'string') {
          const t = item.str;
          if (t.trim()) parts.push(t);
          if (item.hasEOL) parts.push('\n');
        }
      }
      const pageText = parts.join(' ')
        .replace(/ *\n */g, '\n')
        .replace(/[\t\r\f\v ]+/g, ' ')
        .trim();
      rawPageTexts.push(pageText);
    }
    
    const fullText = rawPageTexts.join('\n\n');
    const wordCount = fullText.replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 1).length;
    
    if (wordCount < 10) return null;
    return { text: fullText, pageTexts: rawPageTexts };
  } catch {
    return null;
  }
}

/**
 * Reconstruct text with proper line breaks using Y-coordinate grouping.
 * Handles two-column layouts by detecting large X gaps.
 */
function reconstructPageText(items: any[]): string {
  // Prefer layout-aware reconstruction when we have coordinates...
  const strItems = items.filter(hasStr);
  const textItems = strItems.filter(isTextItem);

  // ...but fall back to a simpler join if pdf.js doesn't provide usable transforms.
  // This avoids false "image-based" classifications for selectable-text PDFs.
  if (textItems.length === 0) {
    const parts: string[] = [];
    for (const it of strItems) {
      const t = it.str.replace(/\s+/g, ' ').trim();
      if (!t) continue;
      parts.push(t);
      if ((it as any).hasEOL) parts.push('\n');
    }
    const joined = parts.join(' ');
    return joined
      .replace(/ *\n */g, '\n')
      .replace(/[\t\r\f\v ]+/g, ' ')
      .trim();
  }

  // Group items by Y coordinate (with tolerance for slight variations)
  const Y_TOLERANCE = 5;
  const lineGroups: LineGroup[] = [];

  for (const item of textItems) {
    const text = item.str.trim();
    if (!text) continue;

    const x = item.transform[4];
    const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;

    let group = lineGroups.find(g => Math.abs(g.y - y) < Y_TOLERANCE);
    if (!group) {
      group = { y, items: [] };
      lineGroups.push(group);
    }
    group.items.push({ x, str: item.str, width: typeof item.width === 'number' ? item.width : undefined });
  }

  // Sort lines by Y (descending, since PDF Y increases upward)
  lineGroups.sort((a, b) => b.y - a.y);

  const lines: string[] = [];

  for (const group of lineGroups) {
    // Sort items within line by X (left to right)
    group.items.sort((a, b) => a.x - b.x);

    // Detect two-column layout: if there's a large X gap, split into separate lines
    const splitLines = splitByColumnGap(group.items);

    for (const lineItems of splitLines) {
      const lineText = lineItems.map(item => item.str).join(' ').trim();
      if (lineText) {
        lines.push(lineText);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Split a line into multiple lines if there's a large gap (two-column layout).
 * Uses the actual glyph width from the PDF text item when available,
 * falling back to a ~6px-per-character estimate when it is not.
 */
function splitByColumnGap(items: { x: number; str: string; width?: number }[]): { x: number; str: string }[][] {
  if (items.length < 2) return [items];

  const COLUMN_GAP_THRESHOLD = 60; // pixels - lowered for sidebar/two-column CVs
  const result: { x: number; str: string }[][] = [];
  let currentGroup: { x: number; str: string }[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    // Prefer the actual rendered width; fall back to 6px-per-char estimate
    const prevWidth = (typeof prev.width === 'number' && prev.width > 0)
      ? prev.width
      : prev.str.length * 6;
    const gap = items[i].x - (prev.x + prevWidth);

    if (gap > COLUMN_GAP_THRESHOLD) {
      result.push(currentGroup);
      currentGroup = [items[i]];
    } else {
      currentGroup.push(items[i]);
    }
  }

  if (currentGroup.length > 0) {
    result.push(currentGroup);
  }

  return result;
}
