/**
 * useResumeUpload
 *
 * Reusable hook that encapsulates the full file-processing pipeline for
 * parsing a CV: file-type detection → PDF/DOCX/image/JSON/HTML text
 * extraction → preprocessing → AI parsing → confidence scoring.
 *
 * Consumers (DashboardPage, UploadPage) call processFile() and react to
 * the returned state. Saving to Appwrite, ATS scoring, and navigation
 * remain in the consumer — this hook only handles parsing.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  parseResumePDF,
  parseResumePDFWithOCR,
  parseTextWithAI,
  regenerateResumeIds,
  getExtractionSummary,
  getLowConfidenceFields,
  PDFParseError,
  estimateOCRTime,
} from '@/lib/pdfParser';
import type { OCRProgressCallback } from '@/lib/pdfParser';
import { extractTextFromImage, OCRError } from '@/lib/pdf/ocrExtractor';
import { preprocessResumeText, extractContactHints } from '@/lib/pdf/textPreprocessor';
import { validateAndCleanResumeData, extractTextFromHTML } from '@/lib/jsonResumeValidator';
import { detectFileType, type FileType } from '@/lib/detectFileType';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import type { ParseStep } from '@/components/upload/UploadProgressSteps';
import type { UploadErrorType } from '@/components/upload/UploadErrorRecovery';

export interface OCRState {
  showPrompt: boolean;
  progress: { page: number; total: number; status?: string } | null;
  estimatedTime: string;
  pendingFile: File | null;
}

export interface UploadError {
  type: UploadErrorType;
  warnings: string[];
}

export interface UseResumeUploadReturn {
  processFile: (file: File, fileType?: FileType | null) => Promise<void>;
  isProcessing: boolean;
  parseStep: ParseStep;
  fileName: string | null;
  parsedData: ResumeData | null;
  lowConfidenceFields: string[];
  error: UploadError | null;
  ocrState: OCRState;
  confirmOCR: () => Promise<void>;
  cancelOCR: () => void;
  clearError: () => void;
  clearParsedData: () => void;
}

export function useResumeUpload(): UseResumeUploadReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseStep, setParseStep] = useState<ParseStep>('reading');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
  const [error, setError] = useState<UploadError | null>(null);
  const [ocrState, setOcrState] = useState<OCRState>({
    showPrompt: false,
    progress: null,
    estimatedTime: '',
    pendingFile: null,
  });

  useEffect(() => {
    if (parsedData) {
      setLowConfidenceFields(getLowConfidenceFields(parsedData._meta, 0.6));
    } else {
      setLowConfidenceFields([]);
    }
  }, [parsedData]);

  const clearError = useCallback(() => setError(null), []);
  const clearParsedData = useCallback(() => setParsedData(null), []);

  const handleWordFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    setParseStep('reading');

    try {
      await new Promise(r => setTimeout(r, 300));
      setParseStep('extracting');

      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');

      let text = '';
      try {
        const htmlResult = await mammoth.default.convertToHtml({ arrayBuffer });
        if (htmlResult.value.trim()) {
          text = htmlResult.value
            .replace(/<li[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        }
      } catch { /* fall through to raw text */ }

      if (!text) {
        const rawResult = await mammoth.default.extractRawText({ arrayBuffer });
        text = rawResult.value;
      }

      if (!text.trim()) {
        setError({ type: 'NO_TEXT', warnings: [] });
        setIsProcessing(false);
        return;
      }

      let cleanedText: string;
      try { cleanedText = preprocessResumeText(text); } catch { cleanedText = text; }
      let textWithHints: string;
      try {
        const hints = extractContactHints(cleanedText);
        textWithHints = hints ? cleanedText + hints : cleanedText;
      } catch { textWithHints = cleanedText; }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(textWithHints);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setError({ type: 'NO_TEXT', warnings: [] });
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(r => setTimeout(r, 400));
      setParsedData(resumeData);
    } catch (err) {
      setError({
        type: err instanceof Error && err.message === 'AI_UNREACHABLE' ? 'AI_UNREACHABLE' : 'CORRUPTED',
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleImageFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    setParseStep('reading');

    try {
      const progressCallback: OCRProgressCallback = (p) => {
        setOcrState(prev => ({ ...prev, progress: { page: p.page, total: p.total, status: p.status } }));
      };

      setParseStep('extracting');
      const text = await extractTextFromImage(file, progressCallback);

      if (!text.trim()) {
        setError({ type: 'NO_TEXT', warnings: [] });
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(text);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setError({ type: 'NO_TEXT', warnings: [] });
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(r => setTimeout(r, 400));
      toast.warning('Resume extracted via OCR. Please review all sections for accuracy.', { duration: 6000 });
      setParsedData(resumeData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'AI_UNREACHABLE') {
        setError({ type: 'AI_UNREACHABLE', warnings: [] });
      } else if (err instanceof OCRError) {
        if (err.code === 'WORKER_INIT_FAILED' || err.code === 'PAGE_RENDER_FAILED') {
          setError({ type: 'OCR_ENGINE_FAILED', warnings: [err.message] });
        } else {
          toast.error(err.message, { duration: 6000 });
          setError({ type: 'NO_TEXT', warnings: [] });
        }
      } else {
        toast.error(msg || 'Failed to extract text from image.', { duration: 5000 });
        setError({ type: 'UNKNOWN', warnings: [] });
      }
    } finally {
      setIsProcessing(false);
      setOcrState(prev => ({ ...prev, progress: null }));
    }
  }, []);

  const confirmOCR = useCallback(async () => {
    const pendingFile = ocrState.pendingFile;
    if (!pendingFile) return;

    setOcrState(prev => ({ ...prev, showPrompt: false }));
    setIsProcessing(true);

    try {
      const progressCallback: OCRProgressCallback = (p) => {
        setOcrState(prev => ({ ...prev, progress: { page: p.page, total: p.total, status: p.status } }));
      };

      const { data: resumeData, parseStatus, parseWarnings } =
        await parseResumePDFWithOCR(pendingFile, progressCallback);
      const extraction = getExtractionSummary(resumeData);

      if (parseStatus !== 'success' && parseWarnings.length > 0) {
        toast.warning(parseWarnings[0], { duration: 5000 });
      }

      if (extraction.isEmpty) {
        setError({ type: 'NO_TEXT', warnings: [] });
        return;
      }

      setParseStep('complete');
      await new Promise(r => setTimeout(r, 300));
      setParsedData(resumeData);
    } catch (err) {
      if (err instanceof Error && err.message === 'AI_UNREACHABLE') {
        setError({ type: 'AI_UNREACHABLE', warnings: [] });
      } else if (err instanceof OCRError) {
        if (err.code === 'WORKER_INIT_FAILED' || err.code === 'PAGE_RENDER_FAILED') {
          setError({ type: 'OCR_ENGINE_FAILED', warnings: [err.message] });
        } else {
          toast.error(err.message, { duration: 6000 });
          setError({ type: 'NO_TEXT', warnings: [] });
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'OCR extraction failed.', { duration: 5000 });
      }
    } finally {
      setIsProcessing(false);
      setOcrState(prev => ({ ...prev, pendingFile: null, progress: null }));
    }
  }, [ocrState.pendingFile]);

  const cancelOCR = useCallback(() => {
    setOcrState({ showPrompt: false, progress: null, estimatedTime: '', pendingFile: null });
    setIsProcessing(false);
  }, []);

  const processFile = useCallback(async (file: File, fileType?: FileType | null) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    const detectedType = fileType !== undefined ? fileType : detectFileType(file);

    if (!detectedType) {
      toast.error('Unsupported file type. Please use PDF, Word, Image, JSON, or HTML files.');
      return;
    }

    setError(null);
    setParsedData(null);

    if (detectedType === 'json') {
      setFileName(file.name);
      setIsProcessing(true);
      setParseStep('reading');
      try {
        const text = await file.text();
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch {
          toast.error('Invalid JSON file. Please check the file format.');
          setIsProcessing(false);
          return;
        }
        setParseStep('extracting');
        await new Promise(r => setTimeout(r, 200));
        const validated = validateAndCleanResumeData(parsed);
        const withNewIds = regenerateResumeIds(validated);
        const extraction = getExtractionSummary(withNewIds);
        if (extraction.isEmpty) {
          toast.error('No resume data found in JSON file.');
          setIsProcessing(false);
          return;
        }
        setParseStep('complete');
        await new Promise(r => setTimeout(r, 300));
        setParsedData(withNewIds);
        toast.success('JSON imported! No AI processing needed.', { duration: 3000 });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to parse JSON file.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (detectedType === 'html') {
      setFileName(file.name);
      setIsProcessing(true);
      setParseStep('reading');
      try {
        const html = await file.text();
        setParseStep('extracting');
        const text = extractTextFromHTML(html);
        if (!text.trim() || text.length < 50) {
          setError({ type: 'NO_TEXT', warnings: [] });
          setIsProcessing(false);
          return;
        }
        let cleanedText: string;
        try { cleanedText = preprocessResumeText(text); } catch { cleanedText = text; }
        let textWithHints: string;
        try {
          const hints = extractContactHints(cleanedText);
          textWithHints = hints ? cleanedText + hints : cleanedText;
        } catch { textWithHints = cleanedText; }
        setParseStep('analyzing');
        const resumeData = await parseTextWithAI(textWithHints);
        const extraction = getExtractionSummary(resumeData);
        if (extraction.isEmpty) { setError({ type: 'NO_TEXT', warnings: [] }); setIsProcessing(false); return; }
        setParseStep('complete');
        await new Promise(r => setTimeout(r, 400));
        setParsedData(resumeData);
      } catch (err) {
        setError({
          type: err instanceof Error && err.message === 'AI_UNREACHABLE' ? 'AI_UNREACHABLE' : 'CORRUPTED',
          warnings: [],
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (detectedType === 'word') {
      await handleWordFile(file);
      return;
    }

    if (detectedType === 'image') {
      await handleImageFile(file);
      return;
    }

    // PDF
    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    setParseStep('reading');

    try {
      await new Promise(r => setTimeout(r, 300));
      setParseStep('detecting');

      const result = await parseResumePDF(file);

      if (result.needsOCR) {
        setOcrState({
          showPrompt: true,
          progress: null,
          estimatedTime: estimateOCRTime(result.pageCount),
          pendingFile: file,
        });
        setIsProcessing(false);
        return;
      }

      if (!result.success && !result.needsOCR) {
        const isIOSFontFailure =
          result.isIOS &&
          (result.failureReason === 'EMPTY_STRINGS' || result.failureReason === 'PAGE_ERRORS');
        setError({
          type: isIOSFontFailure ? 'IOS_BROWSER_INCOMPATIBLE' : 'NO_TEXT',
          warnings: result.parseWarnings,
        });
        setIsProcessing(false);
        return;
      }

      setParseStep('extracting');
      await new Promise(r => setTimeout(r, 200));

      const resumeData = result.data!;
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setError({ type: 'NO_TEXT', warnings: [] });
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      await new Promise(r => setTimeout(r, 300));
      setParseStep('complete');
      await new Promise(r => setTimeout(r, 400));

      setParsedData(resumeData);
    } catch (err) {
      if (err instanceof PDFParseError) {
        const map: Record<string, UploadErrorType> = {
          PASSWORD_PROTECTED: 'PASSWORD_PROTECTED',
          CORRUPTED: 'CORRUPTED',
          NO_TEXT: 'NO_TEXT',
        };
        setError({ type: map[err.code] ?? 'UNKNOWN', warnings: [] });
      } else if (err instanceof Error && err.message === 'AI_UNREACHABLE') {
        setError({ type: 'AI_UNREACHABLE', warnings: [] });
      } else {
        setError({ type: 'UNKNOWN', warnings: [] });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [handleWordFile, handleImageFile]);

  return {
    processFile,
    isProcessing,
    parseStep,
    fileName,
    parsedData,
    lowConfidenceFields,
    error,
    ocrState,
    confirmOCR,
    cancelOCR,
    clearError,
    clearParsedData,
  };
}
