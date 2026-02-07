import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  items: { x: number; str: string }[];
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
 * Result from text extraction, including metadata about extraction quality.
 */
export interface ExtractionResult {
  text: string;
  method: 'text';
  pageCount: number;
  needsOCR: boolean; // True if text extraction found nothing usable
}

/**
 * Extract text from PDF with layout-aware line reconstruction.
 * Groups text items by Y coordinate to preserve line breaks.
 * 
 * Returns an ExtractionResult with metadata about extraction quality.
 * If needsOCR is true, the caller should offer OCR as a fallback.
 */
export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (error: any) {
    if (error?.name === 'PasswordException') {
      throw new PDFParseError(
        'This PDF is password protected. Please provide an unprotected version.',
        'PASSWORD_PROTECTED'
      );
    }
    if (error?.message?.includes('Invalid PDF')) {
      throw new PDFParseError(
        'This PDF appears to be corrupted or invalid.',
        'CORRUPTED'
      );
    }
    throw new PDFParseError(
      'Failed to read this PDF file.',
      'UNKNOWN'
    );
  }

  const pageTexts: string[] = [];
  const debugPages: Array<{ page: number; rawItems: number; extractedChars: number }> = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent({ includeMarkedContent: false } as any);
    const rawItems = Array.isArray((textContent as any)?.items) ? (textContent as any).items.length : 0;
    const pageText = reconstructPageText((textContent as any).items as any[]);
    debugPages.push({ page: i, rawItems, extractedChars: pageText.length });
    pageTexts.push(pageText);
  }

  const fullText = pageTexts.join('\n\n');
  const pageCount = pdf.numPages;

  // Check if we got meaningful text
  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  // Be conservative: only classify as "no text" when extraction is truly empty/near-empty.
  const hasLetters = /[A-Za-z]/.test(cleanedText);
  
  if (cleanedText.length === 0 || (!hasLetters && cleanedText.length < 20)) {
    // Instead of throwing, return needsOCR flag so UI can offer OCR
    console.warn('PDF extraction produced too little text - OCR may be needed', {
      pages: pageCount,
      cleanedChars: cleanedText.length,
      debugPages,
    });
    
    return {
      text: '',
      method: 'text',
      pageCount,
      needsOCR: true,
    };
  }

  return {
    text: fullText,
    method: 'text',
    pageCount,
    needsOCR: false,
  };
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
    group.items.push({ x, str: item.str });
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
 */
function splitByColumnGap(items: { x: number; str: string }[]): { x: number; str: string }[][] {
  if (items.length < 2) return [items];

  const COLUMN_GAP_THRESHOLD = 100; // pixels - reduced for sidebar layouts
  const result: { x: number; str: string }[][] = [];
  let currentGroup: { x: number; str: string }[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const gap = items[i].x - (items[i - 1].x + items[i - 1].str.length * 5); // rough char width
    
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
