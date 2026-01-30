/**
 * PDF Resume Parser
 * 
 * Main entry point for parsing PDF resumes. Uses layout-aware text extraction
 * to preserve line breaks and structure, then parses into structured resume data.
 */

import { ResumeData } from '@/types/resume';
import { extractTextFromPDF, PDFParseError } from './pdf/textExtractor';
import { parseResumeText } from './pdf/sectionParsers';

export { PDFParseError };

/**
 * Parse a PDF file and extract structured resume data.
 * Throws PDFParseError with specific codes for different failure modes.
 */
export async function parseResumePDF(file: File): Promise<ResumeData> {
  // Extract text with layout preservation
  const text = await extractTextFromPDF(file);
  
  // Parse into structured data
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
