/**
 * PDF Resume Parser
 * 
 * Main entry point for parsing PDF resumes. Uses layout-aware text extraction
 * to preserve line breaks and structure, then uses AI to parse into structured resume data.
 * 
 * Supports OCR fallback for scanned/image-based PDFs via parseResumePDFWithOCR.
 */

import { ResumeData } from '@/types/resume';
import { extractTextFromPDF, PDFParseError, ExtractionResult } from './pdf/textExtractor';
import { extractTextWithOCR, OCRProgressCallback, estimateOCRTime } from './pdf/ocrExtractor';
import { parseResumeText } from './pdf/sectionParsers';
import { preprocessResumeText, extractContactHints } from './pdf/textPreprocessor';

import { handleAIError } from './aiProvider';

export { PDFParseError, estimateOCRTime };
export type { ExtractionResult, OCRProgressCallback };

/** Timeout for AI parsing requests (20 seconds - falls back to local parser quickly) */
const PARSE_TIMEOUT = 20000;

/**
 * Result from initial PDF parsing attempt.
 * If needsOCR is true, call parseResumePDFWithOCR to try OCR extraction.
 */
export interface ParseResult {
  success: boolean;
  data?: ResumeData;
  needsOCR: boolean;
  pageCount: number;
  parseStatus: 'success' | 'partial' | 'failed';
  parseWarnings: string[];
}

/**
 * Call the AI edge function to parse resume text into structured data.
 * Falls back to local regex parsing if AI fails.
 * Includes 60s timeout to prevent infinite hangs.
 * Exported for use with Word and Image parsing.
 */
export async function parseTextWithAI(text: string): Promise<ResumeData> {
  const { EDGE_FUNCTIONS_URL } = await import('@/lib/supabaseConstants');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT);

  try {
    if (import.meta.env.DEV) console.log('Calling AI to parse resume text...');
    
    // Get Supabase Auth JWT
    const { getSupabaseToken } = await import('@/lib/supabaseAuth');
    const token = await getSupabaseToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // fileType: 'text/plain' because the server receives pre-extracted plain text
    // regardless of the source document format (PDF, DOCX, etc). The MIME type
    // is required by the server for strict file-type enforcement.
    const requestBody = JSON.stringify({ text, fileType: 'text/plain' });

    let response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/parse-resume`, {
      method: 'POST',
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    // On 401, refresh the bridge token once and retry before falling back.
    if (response.status === 401) {
      const { refreshTokenIfNeeded } = await import('@/lib/supabaseBridge');
      const refreshed = await refreshTokenIfNeeded();
      if (refreshed) {
        const { getSupabaseToken: getToken } = await import('@/lib/supabaseAuth');
        const newToken = await getToken();
        const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/parse-resume`, {
          method: 'POST',
          headers: retryHeaders,
          body: requestBody,
          signal: controller.signal,
        });
      }
    }

    if (!response.ok) {
      await handleAIError(response, 'AI parsing failed');
    }

    const data = await response.json();
    if (import.meta.env.DEV) console.log('AI parsing successful');
    return regenerateResumeIds(data);
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('AI parsing timed out after 20s, falling back to local parser');
      return parseResumeText(text);
    }
    
    // Re-throw rate limit and payment errors
    if (error instanceof Error && 
        (error.message.includes('Rate limit') || error.message.includes('credits'))) {
      throw error;
    }
    
    // Log network/CORS failures — but still fall back to local parser
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      console.warn('AI parser unreachable (CORS or network issue) — using local fallback parser');
    } else {
      console.error('AI parsing error:', error);
    }
    
    // Fall back to local regex parsing for all non-billing failures
    if (import.meta.env.DEV) console.log('Using fallback local parser...');
    return parseResumeText(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Regenerate all IDs in resume data to prevent React key conflicts.
 * Applied after AI parsing or JSON import.
 */
export function regenerateResumeIds(data: ResumeData): ResumeData {
  return {
    ...data,
    id: undefined,
    experience: data.experience?.map(exp => ({ ...exp, id: crypto.randomUUID() })) || [],
    education: data.education?.map(edu => ({ ...edu, id: crypto.randomUUID() })) || [],
    certifications: data.certifications?.map(cert => ({ ...cert, id: crypto.randomUUID() })) || [],
    awards: data.awards?.map(a => ({ ...a, id: crypto.randomUUID() })) || [],
    projects: data.projects?.map(p => ({ ...p, id: crypto.randomUUID() })) || [],
    publications: data.publications?.map(p => ({ ...p, id: crypto.randomUUID() })) || [],
    volunteering: data.volunteering?.map(v => ({ ...v, id: crypto.randomUUID() })) || [],
    hobbies: data.hobbies?.map(h => ({ ...h, id: crypto.randomUUID() })) || [],
    references: data.references?.map(r => ({ ...r, id: crypto.randomUUID() })) || [],
    languages: data.languages?.map(l => ({ ...l, id: crypto.randomUUID() })) || [],
  };
}

/**
 * Parse a PDF file and extract structured resume data.
 * Returns a ParseResult indicating whether OCR is needed.
 */
export async function parseResumePDF(file: File): Promise<ParseResult> {
  // Extract text with layout preservation
  const extraction = await extractTextFromPDF(file);
  
  if (extraction.needsOCR) {
    return {
      success: false,
      needsOCR: true,
      pageCount: extraction.pageCount,
      parseStatus: 'failed',
      parseWarnings: ['PDF contains no selectable text — OCR is required to read this file.'],
    };
  }
  
  // Preprocess text to clean extraction artifacts
  let cleanedText: string;
  try {
    cleanedText = preprocessResumeText(extraction.text, extraction.pageTexts);
  } catch {
    console.warn('[pdfParser] preprocessResumeText failed, using raw text');
    cleanedText = extraction.text;
  }

  // Append contact info hints to help AI
  let textWithHints: string;
  try {
    const hints = extractContactHints(cleanedText);
    textWithHints = hints ? cleanedText + hints : cleanedText;
  } catch {
    console.warn('[pdfParser] extractContactHints failed, skipping hints');
    textWithHints = cleanedText;
  }
  
  // Parse into structured data using AI; fall back to local parser on any failure
  let data: ResumeData;
  try {
    data = await parseTextWithAI(textWithHints);
  } catch {
    console.warn('AI parsing failed in parseResumePDF — falling back to local parser');
    data = parseResumeText(textWithHints);
  }

  // Determine parse quality
  const extractionSummary = getExtractionSummary(data);
  const parseStatus: 'success' | 'partial' | 'failed' =
    extractionSummary.isEmpty ? 'failed' : extractionSummary.isPartial ? 'partial' : 'success';
  const parseWarnings: string[] = (parseStatus !== 'success') ? [extractionSummary.summary] : [];

  return {
    success: true,
    data,
    needsOCR: false,
    pageCount: extraction.pageCount,
    parseStatus,
    parseWarnings,
  };
}

/**
 * Parse a PDF file using OCR for scanned/image-based PDFs.
 * This is slower but works for PDFs without selectable text.
 * 
 * @param file - The PDF file to parse
 * @param onProgress - Optional callback for OCR progress updates
 * @returns Structured resume data with parse status
 */
export async function parseResumePDFWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<{ data: ResumeData; parseStatus: 'success' | 'partial' | 'failed'; parseWarnings: string[] }> {
  // Extract text using OCR
  const text = await extractTextWithOCR(file, onProgress);

  // Confidence gate: if OCR produced near-nothing, do not waste AI credits
  const { computeTextConfidence } = await import('./pdf/textPreprocessor');
  const { confidence } = computeTextConfidence(text);

  if (confidence < 0.25) {
    const emptyResume = parseResumeText(''); // returns an empty ResumeData skeleton
    return {
      data: emptyResume,
      parseStatus: 'failed',
      parseWarnings: [
        `Image quality too low to extract text reliably (confidence: ${Math.round(confidence * 100)}%). ` +
        'Please upload a clearer scan or a PDF with selectable text.'
      ],
    };
  }

  // Parse into structured data using AI; fall back to local parser on any failure
  let data: ResumeData;
  try {
    data = await parseTextWithAI(text);
  } catch {
    console.warn('AI parsing failed in parseResumePDFWithOCR — falling back to local parser');
    data = parseResumeText(text);
  }
  const summary = getExtractionSummary(data);
  const parseStatus: 'success' | 'partial' | 'failed' =
    summary.isEmpty ? 'failed' : summary.isPartial ? 'partial' : 'success';
  const parseWarnings: string[] = (parseStatus !== 'success') ? [summary.summary] : [];

  return { data, parseStatus, parseWarnings };
}

/**
 * Compute extraction quality summary for user feedback.
 */
export function getExtractionSummary(data: ResumeData): {
  isEmpty: boolean;
  isPartial: boolean;
  summary: string;
  counts: {
    hasName: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    experienceCount: number;
    educationCount: number;
    skillsCount: number;
  };
} {
  // Defensive access — AI or fallback parser may return incomplete structures
  const contact = data?.contactInfo ?? {};
  const counts = {
    hasName: !!(contact as any).fullName,
    hasEmail: !!(contact as any).email,
    hasPhone: !!(contact as any).phone,
    experienceCount: (data?.experience ?? []).length,
    educationCount: (data?.education ?? []).length,
    skillsCount: (data?.skills ?? []).length,
  };

  const hasContact = counts.hasName || counts.hasEmail || counts.hasPhone;
  const hasContent = counts.experienceCount > 0 || counts.educationCount > 0 || counts.skillsCount > 0 || !!data.summary || (data.awards?.length || 0) > 0 || (data.projects?.length || 0) > 0;
  
  const isEmpty = !hasContact && !hasContent;
  const isPartial = hasContact && !hasContent || !hasContact && hasContent;

  // Build summary message
  const parts: string[] = [];
  
  if (counts.hasName) parts.push('name');
  if (counts.hasEmail) parts.push('email');
  if (counts.experienceCount > 0) parts.push(`${counts.experienceCount} job${counts.experienceCount > 1 ? 's' : ''}`);
  if (counts.educationCount > 0) parts.push(`${counts.educationCount} education`);
  if (counts.skillsCount > 0) parts.push(`${counts.skillsCount} skill${counts.skillsCount > 1 ? 's' : ''}`);

  const summary = parts.length > 0 
    ? `Found: ${parts.join(', ')}`
    : 'No content detected';

  return { isEmpty, isPartial, summary, counts };
}
