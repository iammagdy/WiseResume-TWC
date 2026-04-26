/**
 * OCR Extraction Module
 * 
 * Uses Tesseract.js to perform OCR on PDF pages rendered to canvas.
 * This is used as a fallback when standard text extraction fails (scanned/image PDFs).
 * Enhanced with image preprocessing and adaptive DPI retry for low-confidence pages.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, Worker } from 'tesseract.js';

import { preprocessResumeText } from './textPreprocessor';
import { isIOSWebKit } from './textExtractor';

// pdfjs-dist v4: configure worker via GlobalWorkerOptions (disableWorker was removed).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Categorised OCR failure. Lets the UI show a real cause instead of the
 * old hard-coded "check your internet connection" message that misled
 * iPhone users (Task #25).
 */
export type OCRErrorCode =
  | 'WORKER_INIT_FAILED'   // createWorker rejected (worker.min.js fetch / WASM init / langdata fetch)
  | 'PDF_LOAD_FAILED'      // getDocument failed before OCR even started
  | 'PAGE_RENDER_FAILED'   // page.render or canvas.toDataURL failed (often iOS canvas memory)
  | 'RECOGNITION_FAILED'   // worker.recognize threw on a page
  | 'LOW_QUALITY'          // OCR ran but output was empty/unreadable
  | 'UNKNOWN';

export class OCRError extends Error {
  constructor(
    message: string,
    public readonly code: OCRErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OCRError';
  }
}

function describeCause(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || String(err);
  }
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

/**
 * Yield to the browser's event loop so it can paint and process input
 * before we kick off the next heavy chunk of work. Prefers the modern
 * Scheduler API; falls back to a 0ms timeout in older browsers.
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

export interface OCRProgress {
  page: number;
  total: number;
  status: string;
}

export type OCRProgressCallback = (progress: OCRProgress) => void;

/** Minimum confidence threshold for a page (0-100). Below this, retry at higher DPI. */
const MIN_PAGE_CONFIDENCE = 30;

/**
 * Preprocess an image on canvas for better OCR:
 * Convert to grayscale and increase contrast.
 */
function preprocessImageForOCR(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Apply contrast enhancement (stretch histogram)
    const contrast = 1.5; // 1.5x contrast boost
    const adjusted = Math.min(255, Math.max(0, ((gray - 128) * contrast) + 128));
    
    // Apply adaptive thresholding for very dark/light pixels
    const final = adjusted < 80 ? 0 : adjusted > 200 ? 255 : adjusted;
    
    data[i] = final;
    data[i + 1] = final;
    data[i + 2] = final;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Extract text from a PDF using OCR.
 * Renders each page to canvas and runs Tesseract OCR on the image.
 * Enhanced with image preprocessing and adaptive DPI retry.
 * 
 * @param file - The PDF file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<string> - The extracted text from all pages
 */
export async function extractTextWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<string> {
  const isIOS = isIOSWebKit();
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF document with locally-bundled cmaps and standard fonts so iOS
  // WebKit can decode embedded-font PDFs without falling back to OCR.
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
    }).promise;
  } catch (error) {
    console.error('[ocrExtractor] PDF load failed before OCR', { isIOS, error });
    throw new OCRError(
      'We couldn\'t open this PDF for scanning. The file may be damaged or in an unsupported format.',
      'PDF_LOAD_FAILED',
      error,
    );
  }
  const numPages = pdf.numPages;

  // Initialize Tesseract worker once for all pages (more efficient)
  onProgress?.({ page: 0, total: numPages, status: 'Initializing OCR engine...' });

  let worker: Worker;
  try {
    worker = await createWorker('eng', undefined, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/core',
      langPath: '/tesseract/lang',
    });
  } catch (error) {
    console.error('[ocrExtractor] Tesseract worker init failed', {
      isIOS,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      error,
    });
    // Surface the actual failure cause rather than the old hard-coded
    // "check your internet connection" message — most iPhone failures
    // here are WASM/SharedArrayBuffer related, not network.
    throw new OCRError(
      `Couldn't start the text-scanning engine in this browser (${describeCause(error)}). ` +
      'Try uploading from a desktop browser, or convert your CV to Word/JSON.',
      'WORKER_INIT_FAILED',
      error,
    );
  }

  const pageTexts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.({
        page: pageNum,
        total: numPages,
        status: `Processing page ${pageNum} of ${numPages}...`
      });

      // Yield to the event loop between pages so the UI thread can paint
      // progress, scroll, etc. Without this the main thread is busy looping
      // through canvas rendering + pixel preprocessing back-to-back, which
      // micro-stutters the upload UI even though Tesseract's recognizer
      // itself runs in its own Web Worker.
      if (pageNum > 1) await yieldToMain();

      // First attempt at standard scale (2x)
      let first: { text: string; confidence: number };
      try {
        first = await extractPageWithOCR(pdf, pageNum, worker, 2);
      } catch (pageErr) {
        console.error('[ocrExtractor] Page OCR failed', { pageNum, isIOS, pageErr });
        // Differentiate render-time failures (canvas/memory) from
        // recognition-time failures so the toast can be honest.
        const msg = describeCause(pageErr);
        const code: OCRErrorCode = /canvas|render|memory|context lost/i.test(msg)
          ? 'PAGE_RENDER_FAILED'
          : 'RECOGNITION_FAILED';
        throw new OCRError(
          `OCR failed on page ${pageNum} (${msg}).`,
          code,
          pageErr,
        );
      }

      // If confidence is very low, retry at higher DPI (3x)
      if (first.confidence < MIN_PAGE_CONFIDENCE && numPages <= 5) {
        onProgress?.({
          page: pageNum,
          total: numPages,
          status: `Re-processing page ${pageNum} at higher quality...`,
        });
        try {
          const retry = await extractPageWithOCR(pdf, pageNum, worker, 3);
          if (retry.confidence > first.confidence) {
            pageTexts.push(retry.text);
            continue;
          }
        } catch (retryErr) {
          // Retry failure is non-fatal — fall through with the
          // first-pass text instead of erroring the whole upload.
          console.warn('[ocrExtractor] High-DPI retry failed, keeping first pass', { pageNum, retryErr });
        }
      }

      pageTexts.push(first.text);
    }
  } finally {
    // Always terminate worker to free memory
    try { await worker.terminate(); } catch { /* swallow */ }
  }

  const fullText = pageTexts.join('\n\n');

  // Check if OCR produced meaningful content
  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  if (cleanedText.length < 100 || wordCount < 5) {
    throw new OCRError(
      'OCR couldn\'t read enough text from this PDF. The image may be too low quality, ' +
      'or the file may not contain real text. Try a clearer scan or upload a Word/JSON copy.',
      'LOW_QUALITY',
    );
  }

  // Apply text preprocessing to clean OCR artifacts
  return preprocessResumeText(fullText, pageTexts);
}

/**
 * Render a single PDF page to canvas and run OCR on it.
 */
async function extractPageWithOCR(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  worker: Worker,
  scale = 2
): Promise<{ text: string; confidence: number }> {
  const page = await pdf.getPage(pageNum);
  
  const viewport = page.getViewport({ scale });
  
  // Create canvas for rendering (cap at 2048px for iOS WebKit compatibility)
  const maxCanvasDim = 2048;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!context) {
    throw new Error('Failed to create canvas context for OCR');
  }
  
  let canvasWidth = viewport.width;
  let canvasHeight = viewport.height;
  let renderViewport = viewport;

  if (canvasWidth > maxCanvasDim || canvasHeight > maxCanvasDim) {
    // Compute scale factor so the render exactly matches the capped canvas size
    const capScaleFactor = maxCanvasDim / Math.max(canvasWidth, canvasHeight);
    canvasWidth = Math.round(canvasWidth * capScaleFactor);
    canvasHeight = Math.round(canvasHeight * capScaleFactor);
    // Re-derive a viewport at the adjusted scale so render ↔ canvas sizes match
    renderViewport = page.getViewport({ scale: scale * capScaleFactor });
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Render PDF page to canvas using the correctly-scaled viewport
  await page.render({
    canvasContext: context,
    viewport: renderViewport,
  }).promise;
  
  // Apply image preprocessing for better OCR accuracy
  preprocessImageForOCR(canvas);
  
  // Convert canvas to image data for Tesseract
  const imageData = canvas.toDataURL('image/png');
  
  // Run OCR on the rendered image
  const { data: { text, confidence: ocrConfidence } } = await worker.recognize(imageData);
  
  // Clean up canvas to free memory
  canvas.width = 0;
  canvas.height = 0;
  
  return { text: text.trim(), confidence: ocrConfidence };
}

/**
 * Estimate OCR processing time based on page count.
 * Returns a human-readable string.
 */
export function estimateOCRTime(pageCount: number): string {
  // Rough estimate: ~10-15 seconds per page on average
  const minSeconds = pageCount * 10;
  const maxSeconds = pageCount * 20;
  
  if (maxSeconds < 60) {
    return `${minSeconds}-${maxSeconds} seconds`;
  } else {
    const minMinutes = Math.ceil(minSeconds / 60);
    const maxMinutes = Math.ceil(maxSeconds / 60);
    return `${minMinutes}-${maxMinutes} minutes`;
  }
}

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extract text from an image file using OCR.
 * Works with JPG, PNG, and other image formats.
 * 
 * @param file - The image file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<string> - The extracted text
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<string> {
  const isIOS = isIOSWebKit();
  onProgress?.({ page: 1, total: 1, status: 'Loading image...' });

  // Load image
  const img = await loadImage(file);

  // Create canvas at image dimensions (cap at 4000px for performance)
  const maxDim = 4000;
  let width = img.width;
  let height = img.height;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new OCRError('Failed to create canvas context for OCR.', 'PAGE_RENDER_FAILED');
  }

  // Draw image to canvas
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  onProgress?.({ page: 1, total: 1, status: 'Initializing OCR engine...' });

  // Initialize Tesseract worker
  let worker: Worker;
  try {
    worker = await createWorker('eng', undefined, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/core',
      langPath: '/tesseract/lang',
    });
  } catch (error) {
    console.error('[ocrExtractor] Tesseract worker init failed (image)', {
      isIOS,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      error,
    });
    // Surface the real cause instead of the old hard-coded
    // "check your internet connection" message (Task #25).
    throw new OCRError(
      `Couldn't start the text-scanning engine in this browser (${describeCause(error)}). ` +
      'Try uploading from a desktop browser, or convert your CV to Word/JSON.',
      'WORKER_INIT_FAILED',
      error,
    );
  }

  try {
    onProgress?.({ page: 1, total: 1, status: 'Extracting text...' });

    // Convert canvas to image data for Tesseract
    const imageData = canvas.toDataURL('image/png');

    // Run OCR
    let recognized: { data: { text: string } };
    try {
      recognized = await worker.recognize(imageData);
    } catch (recogErr) {
      console.error('[ocrExtractor] worker.recognize failed (image)', { isIOS, recogErr });
      throw new OCRError(
        `OCR couldn't read this image (${describeCause(recogErr)}).`,
        'RECOGNITION_FAILED',
        recogErr,
      );
    }
    const text = recognized.data.text;

    // Clean up
    canvas.width = 0;
    canvas.height = 0;

    const cleanedText = text.replace(/\s+/g, ' ').trim();
    if (cleanedText.length < 20) {
      throw new OCRError(
        'OCR couldn\'t read enough text from this image. The picture may be too low quality, ' +
        'or it may not contain real text. Try a clearer photo or upload a Word/JSON copy.',
        'LOW_QUALITY',
      );
    }

    return text.trim();
  } finally {
    try { await worker.terminate(); } catch { /* swallow */ }
  }
}
