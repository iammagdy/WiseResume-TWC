import { PDFServerUnavailableError } from '@/lib/nativePdfGenerator';
import { OffscreenRenderTimeoutError } from '@/lib/exportResumePdf';

export function getPdfExportErrorMessage(error: unknown): string {
  if (error instanceof PDFServerUnavailableError) {
    if (import.meta.env.DEV) {
      return 'PDF server is not running. In a second terminal run: npm run dev:pdf-server (or use npm run dev:full next time).';
    }
    return error.message;
  }

  if (error instanceof OffscreenRenderTimeoutError) {
    return 'Resume preview did not load in time. Wait a moment and try again.';
  }

  if (error instanceof Error && error.message) {
    const lower = error.message.toLowerCase();
    if (lower.includes('unauthorized') || lower.includes('authentication')) {
      return 'Sign in again to export PDF.';
    }
    if (lower.includes('server configuration error')) {
      if (import.meta.env.DEV) {
        return 'PDF server is missing Appwrite config. Restart it with npm run dev:pdf-server (reads .env.local).';
      }
    }
    return error.message;
  }

  return 'Download failed. Try again.';
}
