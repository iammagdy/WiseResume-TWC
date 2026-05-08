import { functions } from './appwrite';

/**
 * Custom Error for PDF Server issues during migration.
 */
export class PDFServerUnavailableError extends Error {
  constructor(message = 'PDF Service is currently being migrated to Appwrite.') {
    super(message);
    this.name = 'PDFServerUnavailableError';
  }
}

/**
 * PDF Generation logic now routes to Appwrite AI-Gateway Hub.
 * During migration, we trigger a client-side print fallback.
 */
export async function generateNativePdf(htmlContent: string, fileName: string) {
  try {
    console.log('Requesting PDF generation from Appwrite Hub...');
    
    // Always trigger fallback during Appwrite transition Phase
    throw new PDFServerUnavailableError();
    
  } catch (err) {
    if (err instanceof PDFServerUnavailableError) {
       // Re-throw to be handled by UI components
       throw err;
    }
    console.error('PDF Error:', err);
    throw err;
  }
}

export function getPdfEndpoint() {
  return '/api/appwrite/pdf-stub';
}
