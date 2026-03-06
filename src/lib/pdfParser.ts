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

/** Timeout for AI parsing requests (120 seconds - increased for complex PDFs) */
const PARSE_TIMEOUT = 120000;

/**
 * Result from initial PDF parsing attempt.
 * If needsOCR is true, call parseResumePDFWithOCR to try OCR extraction.
 */
export interface ParseResult {
  success: boolean;
  data?: ResumeData;
  needsOCR: boolean;
  pageCount: number;
}

/**
 * Call the AI edge function to parse resume text into structured data.
 * Falls back to local regex parsing if AI fails.
 * Includes 60s timeout to prevent infinite hangs.
 * Exported for use with Word and Image parsing.
 */
export async function parseTextWithAI(text: string): Promise<ResumeData> {
  const { SUPABASE_URL } = await import('@/lib/supabaseConstants');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT);

  try {
    if (import.meta.env.DEV) console.log('Calling AI to parse resume text...');
    
    // Get Clerk-issued Supabase JWT
    const { getClerkSupabaseToken } = await import('@/lib/clerkSupabase');
    const token = await getClerkSupabaseToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      await handleAIError(response, 'AI parsing failed');
    }

    const data = await response.json();
    if (import.meta.env.DEV) console.log('AI parsing successful');
    return regenerateResumeIds(data);
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('AI parsing timed out after 120s, falling back to local parser');
      return parseResumeText(text);
    }
    
    console.error('AI parsing error:', error);
    
    // Re-throw rate limit and payment errors
    if (error instanceof Error && 
        (error.message.includes('Rate limit') || error.message.includes('credits'))) {
      throw error;
    }
    
    // Detect CORS / network failures and throw explicit error instead of silent fallback
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      console.error('AI parser unreachable (likely CORS or network issue)');
      throw new Error('AI_UNREACHABLE');
    }
    
    // Fall back to local regex parsing only for non-network parse failures
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
    };
  }
  
  // Preprocess text to clean extraction artifacts
  const cleanedText = preprocessResumeText(extraction.text, extraction.pageTexts);
  
  // Append contact info hints to help AI
  const hints = extractContactHints(cleanedText);
  const textWithHints = hints ? cleanedText + hints : cleanedText;
  
  // Parse into structured data using AI
  const data = await parseTextWithAI(textWithHints);
  
  return {
    success: true,
    data,
    needsOCR: false,
    pageCount: extraction.pageCount,
  };
}

/**
 * Parse a PDF file using OCR for scanned/image-based PDFs.
 * This is slower but works for PDFs without selectable text.
 * 
 * @param file - The PDF file to parse
 * @param onProgress - Optional callback for OCR progress updates
 * @returns Structured resume data
 */
export async function parseResumePDFWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<ResumeData> {
  // Extract text using OCR
  const text = await extractTextWithOCR(file, onProgress);
  
  // Parse into structured data using AI
  return parseTextWithAI(text);
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
  const counts = {
    hasName: !!data.contactInfo.fullName,
    hasEmail: !!data.contactInfo.email,
    hasPhone: !!data.contactInfo.phone,
    experienceCount: data.experience.length,
    educationCount: data.education.length,
    skillsCount: data.skills.length,
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
