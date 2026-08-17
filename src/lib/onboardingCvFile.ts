import type { ResumeData } from '@/types/resume';
import { parseResumePDF, parseResumePDFWithOCR, parseTextWithAI } from '@/lib/pdfParser';

export const ONBOARDING_CV_MAX_BYTES = 10 * 1024 * 1024;

export type OnboardingCvFileKind = 'pdf' | 'docx' | 'text' | 'image';

function fileExtension(fileName: string): string {
  const separatorIndex = fileName.lastIndexOf('.');
  return separatorIndex >= 0 ? fileName.slice(separatorIndex + 1).toLowerCase() : '';
}

/**
 * Validate the onboarding upload before any parser or file reader runs.
 */
export function classifyOnboardingCvFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
): OnboardingCvFileKind {
  if (file.size > ONBOARDING_CV_MAX_BYTES) {
    throw new Error('This file is larger than 10 MB. Please choose a smaller file.');
  }

  const extension = fileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  // The extension is the most reliable signal for browser-selected local files.
  // In particular, some platforms report DOCX files with the older Word MIME.
  if (extension === 'doc') {
    throw new Error('Legacy .doc files are not supported. Please convert your CV to DOCX or PDF.');
  }
  if (extension === 'pdf') return 'pdf';
  if (extension === 'docx') return 'docx';
  if (extension === 'txt') return 'text';

  if (mimeType === 'application/msword') {
    throw new Error('Legacy .doc files are not supported. Please convert your CV to DOCX or PDF.');
  }
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (mimeType === 'text/plain') return 'text';
  if (mimeType.startsWith('image/')) return 'image';

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, or image file.');
}

export async function parseOnboardingCvFile(file: File): Promise<ResumeData | undefined> {
  const fileKind = classifyOnboardingCvFile(file);

  if (fileKind === 'pdf') {
    const result = await parseResumePDF(file);
    if (result.needsOCR || !result.data) {
      return (await parseResumePDFWithOCR(file)).data;
    }
    return result.data;
  }

  if (fileKind === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return parseTextWithAI(value);
  }

  if (fileKind === 'text') {
    return parseTextWithAI(await file.text());
  }

  const { extractTextFromImage } = await import('@/lib/pdf/ocrExtractor');
  return parseTextWithAI(await extractTextFromImage(file));
}
