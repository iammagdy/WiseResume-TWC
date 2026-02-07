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
import { supabase } from '@/integrations/supabase/client';

export { PDFParseError, estimateOCRTime };
export type { ExtractionResult, OCRProgressCallback };

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
 * Exported for use with Word and Image parsing.
 */
export async function parseTextWithAI(text: string): Promise<ResumeData> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  try {
    console.log('Calling AI to parse resume text...');
    
    // Get the user's access token from the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('No auth session, falling back to local parser');
      return parseResumeText(text);
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('AI parsing failed:', response.status, error);
      
      // Throw specific errors for rate limits and payment issues
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits.');
      }
      
      throw new Error(error.error || 'AI parsing failed');
    }

    const data = await response.json();
    console.log('AI parsing successful');
    return data;
  } catch (error) {
    console.error('AI parsing error, falling back to local parser:', error);
    
    // Re-throw rate limit and payment errors
    if (error instanceof Error && 
        (error.message.includes('Rate limit') || error.message.includes('credits'))) {
      throw error;
    }
    
    // Fall back to local regex parsing for network errors
    console.log('Using fallback local parser...');
    return parseResumeText(text);
  }
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
  
  // Parse into structured data using AI
  const data = await parseTextWithAI(extraction.text);
  
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
  const hasContent = counts.experienceCount > 0 || counts.educationCount > 0 || counts.skillsCount > 0 || !!data.summary;
  
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
