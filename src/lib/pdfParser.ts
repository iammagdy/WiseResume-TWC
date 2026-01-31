/**
 * PDF Resume Parser
 * 
 * Main entry point for parsing PDF resumes. Uses layout-aware text extraction
 * to preserve line breaks and structure, then parses into structured resume data.
 * 
 * Supports OCR fallback for scanned/image-based PDFs via parseResumePDFWithOCR.
 */

import { ResumeData } from '@/types/resume';
import { extractTextFromPDF, PDFParseError, ExtractionResult } from './pdf/textExtractor';
import { extractTextWithOCR, OCRProgressCallback, estimateOCRTime } from './pdf/ocrExtractor';
import { parseResumeText } from './pdf/sectionParsers';

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
  
  // Parse into structured data
  const data = parseResumeText(extraction.text);
  
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
  
  // Parse into structured data using existing parser
  return parseResumeText(text);
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
