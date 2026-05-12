import type { ContactInfo } from '@/types/resume';
import type { OnProgressCallback } from '@/hooks/useExportProgress';

/**
 * Thrown when the Puppeteer / server-side PDF pipeline is unavailable.
 * PreviewPage catches this and falls back to window.print() with a friendly
 * message — "PDF export is not available right now. Opening print dialog…"
 *
 * During the Appwrite Functions migration all three exports below throw this
 * error unconditionally so users always get the print-dialog fallback instead
 * of a broken "Failed to generate PDF." toast (which happens when the wrong
 * function name is exported and the import resolves to `undefined`).
 */
export class PDFServerUnavailableError extends Error {
  constructor(message = 'PDF export is being migrated to Appwrite Functions. Please use the print dialog for now.') {
    super(message);
    this.name = 'PDFServerUnavailableError';
  }
}

export interface GenerateNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onePage?: boolean;
  atsMode?: boolean;
  customBreakPositions?: number[];
  onProgress?: OnProgressCallback;
}

export interface GenerateCoverLetterNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onProgress?: OnProgressCallback;
}

/**
 * Generate a resume PDF from a live DOM template element.
 * Puppeteer pipeline pending Appwrite Functions migration — falls back to
 * window.print() via PDFServerUnavailableError caught in PreviewPage.
 */
export async function generateNativePDF(
  _templateEl: HTMLElement,
  _options: GenerateNativePDFOptions = {},
): Promise<Blob> {
  throw new PDFServerUnavailableError();
}

/**
 * Generate a cover-letter PDF from a cover letter record + contact info.
 * Puppeteer pipeline pending Appwrite Functions migration — falls back to
 * window.print() via PDFServerUnavailableError caught in PreviewPage.
 */
export async function generateCoverLetterNativePDF(
  _letter: unknown,
  _contactInfo: ContactInfo | undefined,
  _options: GenerateCoverLetterNativePDFOptions = {},
): Promise<Blob> {
  throw new PDFServerUnavailableError();
}

/**
 * Merge two PDF blobs into one (resume + cover letter combined export).
 * Puppeteer pipeline pending Appwrite Functions migration — falls back to
 * window.print() via PDFServerUnavailableError caught in PreviewPage.
 */
export async function mergePDFBlobs(
  _blobA: Blob,
  _blobB: Blob,
): Promise<Blob> {
  throw new PDFServerUnavailableError();
}
