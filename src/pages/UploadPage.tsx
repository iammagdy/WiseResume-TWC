import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, Link as LinkIcon, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
// mammoth is dynamically imported when needed (see handleWordFile)
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations } from '@/hooks/useResumes';
import { useResumeScore, ResumeHealthScore } from '@/hooks/useResumeScore';
import { 
  parseResumePDF, 
  parseResumePDFWithOCR,
  parseTextWithAI,
  regenerateResumeIds,
  getExtractionSummary, 
  getLowConfidenceFields,
  PDFParseError,
  estimateOCRTime,
  OCRProgressCallback,
} from '@/lib/pdfParser';
import { extractTextFromImage, OCRError } from '@/lib/pdf/ocrExtractor';
import { preprocessResumeText, extractContactHints } from '@/lib/pdf/textPreprocessor';
import { validateAndCleanResumeData, extractTextFromHTML } from '@/lib/jsonResumeValidator';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { UploadErrorRecovery, UploadErrorType } from '@/components/upload/UploadErrorRecovery';
import { UploadProgressSteps, ParseStep } from '@/components/upload/UploadProgressSteps';
import { ImportReviewSheet, SelectedSections, ContactEdits } from '@/components/upload/ImportReviewSheet';
import { ATSValidationChecklist } from '@/components/upload/ATSValidationChecklist';
import { ImportUploadSheet } from '@/components/upload/ImportUploadSheet';
import { detectFileType, type FileType } from '@/lib/detectFileType';
import { UploadZone } from '@/components/upload/UploadZone';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { createResume } = useResumeMutations();
  const { scoreResume } = useResumeScore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseStep, setParseStep] = useState<ParseStep>('reading');
  
  // File type selector state
  const [showImportSheet, setShowImportSheet] = useState(false);
  
  // Error recovery state
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);
  const [errorType, setErrorType] = useState<UploadErrorType>('UNKNOWN');
  const [extractedSections, setExtractedSections] = useState<{
    contact?: boolean;
    summary?: boolean;
    experience?: number;
    education?: number;
    skills?: number;
  } | undefined>(undefined);
  
  // OCR fallback state
  const [showOCRPrompt, setShowOCRPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number; status?: string } | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  
  // Import review state
  const [showImportReview, setShowImportReview] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);
  
  // ATS scoring state for import flow
  const [importATSScore, setImportATSScore] = useState<ResumeHealthScore | null>(null);
  const [isImportScoring, setIsImportScoring] = useState(false);

  // Validation checklist state
  const [showValidationChecklist, setShowValidationChecklist] = useState(false);
  const [validationResumeData, setValidationResumeData] = useState<ResumeData | null>(null);
  const [validationSections, setValidationSections] = useState<SelectedSections | null>(null);

  // Parse recovery banner state
  const [showParseRecoveryBanner, setShowParseRecoveryBanner] = useState(false);
  const [parseRecoveryWarnings, setParseRecoveryWarnings] = useState<string[]>([]);

  // Low-confidence field banner
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  // URL import state
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Surface low-confidence fields whenever new parsed data arrives.
  useEffect(() => {
    if (pendingResumeData) {
      setLowConfidenceFields(getLowConfidenceFields(pendingResumeData._meta, 0.6));
    } else {
      setLowConfidenceFields([]);
    }
  }, [pendingResumeData]);

  // Fire ATS scoring in the background after parse completes
  const triggerATSScoring = useCallback((resumeData: ResumeData) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    setIsImportScoring(true);
    setImportATSScore(null);
    scoreResume(tempId, resumeData, now)
      .then((result) => setImportATSScore(result))
      .finally(() => setIsImportScoring(false));
  }, [scoreResume]);

  const handleOCRConfirm = useCallback(async () => {
    if (!pendingFile) return;
    
    setIsOCRProcessing(true);
    
    try {
      const progressCallback: OCRProgressCallback = (progress) => {
        setOcrProgress({ page: progress.page, total: progress.total, status: progress.status });
      };
      
      const { data: resumeData, parseStatus: ocrStatus, parseWarnings: ocrWarnings } =
        await parseResumePDFWithOCR(pendingFile, progressCallback);
      const extraction = getExtractionSummary(resumeData);

      if (ocrStatus !== 'success') {
        setParseRecoveryWarnings(ocrWarnings);
        setShowParseRecoveryBanner(true);
      }

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        return;
      }

      // Route through ImportReviewSheet + ValidationChecklist like all other paths
      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
        setShowErrorRecovery(true);
      } else if (error instanceof OCRError) {
        // Surface real Tesseract errors with a categorised recovery
        // instead of the old hard-coded "check your internet" toast.
        if (error.code === 'WORKER_INIT_FAILED' || error.code === 'PAGE_RENDER_FAILED') {
          setErrorType('OCR_ENGINE_FAILED');
          setParseRecoveryWarnings([error.message]);
          setShowParseRecoveryBanner(true);
          setShowErrorRecovery(true);
        } else {
          // LOW_QUALITY / RECOGNITION_FAILED / PDF_LOAD_FAILED — show
          // the real cause to the user via toast + NO_TEXT recovery.
          toast.error(error.message, { duration: 6000 });
          setErrorType('NO_TEXT');
          setShowErrorRecovery(true);
        }
      } else {
        toast.error(
          error instanceof Error 
            ? error.message 
            : 'OCR extraction failed. The PDF may be too low quality.',
          { duration: 5000 }
        );
      }
    } finally {
      setIsOCRProcessing(false);
      setShowOCRPrompt(false);
      setPendingFile(null);
      setOcrProgress(null);
    }
  }, [pendingFile, triggerATSScoring]);

  const handleOCRCancel = useCallback(() => {
    setShowOCRPrompt(false);
    setPendingFile(null);
    setIsProcessing(false);
  }, []);

  // Handle import confirmation — show validation checklist instead of navigating directly
  const handleImportConfirm = useCallback(async (data: ResumeData, sections: SelectedSections, contactEdits?: ContactEdits) => {
    // Filter data based on selected sections
    const filteredData: ResumeData = {
      ...data,
      contactInfo: sections.contactInfo ? {
        ...data.contactInfo,
        ...(contactEdits?.fullName ? { fullName: contactEdits.fullName } : {}),
        ...(contactEdits?.email ? { email: contactEdits.email } : {}),
      } : {
        fullName: '',
        email: '',
        phone: '',
        location: '',
      },
      summary: sections.summary ? data.summary : '',
      experience: sections.experience ? data.experience : [],
      education: sections.education ? data.education : [],
      skills: sections.skills ? data.skills : [],
      certifications: sections.certifications ? data.certifications : [],
      projects: sections.projects ? (data.projects || []) : [],
      awards: sections.awards ? (data.awards || []) : [],
      languages: sections.languages ? (data.languages || []) : [],
      volunteering: sections.volunteering ? (data.volunteering || []) : [],
      publications: sections.publications ? (data.publications || []) : [],
    };

    // Store filtered data and show validation checklist
    setValidationResumeData(filteredData);
    setValidationSections(sections);
    setShowImportReview(false);
    setShowValidationChecklist(true);
  }, []);

  // Continue from validation checklist — save and navigate to editor
  const handleValidationContinue = useCallback(async () => {
    if (!validationResumeData || !validationSections) return;

    if (user) {
      try {
        const newResume = await createResume.mutateAsync({
          resume: validationResumeData,
          title: validationResumeData.contactInfo.fullName || 'Uploaded Resume',
        });
        setCurrentResumeId(newResume.id);
        setCurrentResume({
          ...validationResumeData,
          id: newResume.id,
        });
        if (importATSScore) {
          useATSScoreHistoryStore.getState().addScore(newResume.id, importATSScore);
        }
      } catch {
        setCurrentResume(validationResumeData);
      }
    } else {
      setCurrentResume(validationResumeData);
    }

    setShowValidationChecklist(false);
    setValidationResumeData(null);
    setValidationSections(null);

    const selectedCount = Object.values(validationSections).filter(Boolean).length;
    const sectionNames = Object.entries(validationSections)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .slice(0, 3);
    const moreCount = selectedCount - sectionNames.length;
    const summary = sectionNames.join(', ') + (moreCount > 0 ? ` +${moreCount} more` : '');
    toast.success(`Import complete! ${summary}`, { duration: 4000 });
    navigate('/editor');
  }, [validationResumeData, validationSections, user, createResume, setCurrentResume, setCurrentResumeId, navigate, importATSScore]);

  // Go back from validation to import review
  const handleValidationBack = useCallback(() => {
    setShowValidationChecklist(false);
    setShowImportReview(true);
    // Restore pending data so ImportReviewSheet can display it
    if (validationResumeData) {
      setPendingResumeData(validationResumeData);
    }
  }, [validationResumeData]);

  const handleImportReviewClose = useCallback(() => {
    setShowImportReview(false);
    setPendingResumeData(null);
    setImportATSScore(null);
    setIsImportScoring(false);
  }, []);

  // Handle JSON file (direct import, skips AI)
  const handleJSONFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const text = await file.text();
      let parsed: unknown;
      
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error('Invalid JSON file. Please check the file format.');
        setIsProcessing(false);
        return;
      }

      setParseStep('extracting');
      await new Promise(resolve => setTimeout(resolve, 200));

      const validated = validateAndCleanResumeData(parsed);
      const withNewIds = regenerateResumeIds(validated);
      const extraction = getExtractionSummary(withNewIds);

      if (extraction.isEmpty) {
        toast.error('No resume data found in JSON file.');
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 300));

      setPendingResumeData(withNewIds);
      setShowImportReview(true);
      triggerATSScoring(withNewIds);
      toast.success('JSON imported! No AI processing needed.', { duration: 3000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse JSON file.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle URL import — fetches page HTML via the Express proxy (avoids CORS),
  // strips markup, and pipes the cleaned text through the same AI parser used
  // for PDFs/Word/HTML.
  const handleUrlImport = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setUrlError('Please paste a URL first.');
      return;
    }
    // Accept URLs without a scheme by assuming https://
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      // Validate client-side before the round-trip
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('Only http and https URLs are supported.');
        return;
      }
    } catch {
      setUrlError('That doesn\'t look like a valid URL.');
      return;
    }

    setUrlError(null);
    setFileName(url);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      // Step 1: fetch the HTML via the Express fetch-url proxy (avoids CORS).
      const proxyRes = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!proxyRes.ok) {
        const errBody = await proxyRes.json().catch(() => ({}));
        const msg = (errBody as { error?: string }).error || `Could not fetch the page (${proxyRes.status}).`;
        setUrlError(msg);
        toast.error(msg, { duration: 5000 });
        setIsProcessing(false);
        return;
      }
      const { html } = await proxyRes.json() as { html: string };

      setParseStep('extracting');
      const text = extractTextFromHTML(html);

      if (!text.trim() || text.length < 50) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      // Step 2: run through the same preprocessing + AI parsing pipeline as PDFs
      let cleanedText: string;
      try {
        cleanedText = preprocessResumeText(text);
      } catch {
        cleanedText = text;
      }
      let textWithHints: string;
      try {
        const hints = extractContactHints(cleanedText);
        textWithHints = hints ? cleanedText + hints : cleanedText;
      } catch {
        textWithHints = cleanedText;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(textWithHints);
      if (resumeData._meta) resumeData._meta.source = 'url';

      const extraction = getExtractionSummary(resumeData);
      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
      setUrlInput('');
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
        setShowErrorRecovery(true);
      } else {
        const msg = error instanceof Error ? error.message : 'Failed to import from URL.';
        toast.error(msg, { duration: 5000 });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [triggerATSScoring]);

  // Handle HTML file
  const handleHTMLFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const html = await file.text();
      
      setParseStep('extracting');
      const text = extractTextFromHTML(html);

      if (!text.trim() || text.length < 50) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      // Apply same preprocessing pipeline as PDFs
      let cleanedText: string;
      try {
        cleanedText = preprocessResumeText(text);
      } catch {
        cleanedText = text;
      }
      let textWithHints: string;
      try {
        const hints = extractContactHints(cleanedText);
        textWithHints = hints ? cleanedText + hints : cleanedText;
      } catch {
        textWithHints = cleanedText;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(textWithHints);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
      } else {
        setErrorType('CORRUPTED');
      }
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle Word document
  const handleWordFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setParseStep('extracting');
      
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');

      // Try HTML conversion first — preserves bullets, bold, and list structure
      // which are critical signals for identifying achievements vs. responsibilities
      let text = '';
      try {
        const htmlResult = await mammoth.default.convertToHtml({ arrayBuffer });
        if (htmlResult.value.trim()) {
          // Strip HTML tags but preserve line structure from <li>, <p>, <br>
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
      } catch {
        // HTML conversion failed, fall through to raw text
      }

      // Fallback: raw text extraction
      if (!text) {
        const rawResult = await mammoth.default.extractRawText({ arrayBuffer });
        text = rawResult.value;
      }

      if (!text.trim()) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      // Apply same preprocessing pipeline as PDFs
      let cleanedText: string;
      try {
        cleanedText = preprocessResumeText(text);
      } catch {
        cleanedText = text;
      }
      let textWithHints: string;
      try {
        const hints = extractContactHints(cleanedText);
        textWithHints = hints ? cleanedText + hints : cleanedText;
      } catch {
        textWithHints = cleanedText;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(textWithHints);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
      } else {
        setErrorType('CORRUPTED');
      }
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle image file (OCR)
  const handleImageFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const progressCallback: OCRProgressCallback = (progress) => {
        setOcrProgress({ page: progress.page, total: progress.total, status: progress.status });
      };

      setParseStep('extracting');
      const text = await extractTextFromImage(file, progressCallback);

      if (!text.trim()) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(text);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      toast.warning(
        'Resume extracted via OCR. Please review all sections for accuracy.',
        { duration: 6000 }
      );

      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to extract text from image.';
      if (msg === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
      } else if (error instanceof OCRError) {
        // Mirror the PDF OCR path so image-OCR users get the same
        // semantically-correct recovery state instead of a generic UNKNOWN.
        if (error.code === 'WORKER_INIT_FAILED' || error.code === 'PAGE_RENDER_FAILED') {
          setErrorType('OCR_ENGINE_FAILED');
          setParseRecoveryWarnings([error.message]);
          setShowParseRecoveryBanner(true);
        } else {
          // LOW_QUALITY / RECOGNITION_FAILED / PDF_LOAD_FAILED — show
          // the real cause to the user via toast + NO_TEXT recovery.
          toast.error(error.message, { duration: 6000 });
          setErrorType('NO_TEXT');
        }
      } else {
        toast.error(msg, { duration: 5000 });
        setErrorType('UNKNOWN');
      }
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, []);

  const handleFile = useCallback(async (file: File, fileType?: FileType) => {
    const detectedType = fileType || detectFileType(file);

    // Size check — surface before closing the import sheet so the user
    // can immediately retry with another file from the same place.
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    // Reject unsupported types before closing the sheet for the same
    // reason — keeps the user in-context to pick a valid file.
    if (
      detectedType !== 'pdf' &&
      detectedType !== 'json' &&
      detectedType !== 'html' &&
      detectedType !== 'word' &&
      detectedType !== 'image'
    ) {
      toast.error('Unsupported file type. Please use PDF, Word, Image, JSON, or HTML files.');
      return;
    }

    // Validations passed — close the sheet so the upload progress UI
    // becomes visible behind it.
    setShowImportSheet(false);

    // Route to appropriate handler
    if (detectedType === 'json') {
      await handleJSONFile(file);
      return;
    }

    if (detectedType === 'html') {
      await handleHTMLFile(file);
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

    // Existing PDF handling — unsupported types are already rejected
    // by the early-return guard above, so detectedType is 'pdf' here.
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      // Step 1: Reading
      await new Promise(resolve => setTimeout(resolve, 300));
      setParseStep('detecting');
      
      const result = await parseResumePDF(file);
      
      // Step 2: Detecting text
      if (result.needsOCR) {
        setPendingFile(file);
        setEstimatedTime(estimateOCRTime(result.pageCount));
        setShowOCRPrompt(true);
        setIsProcessing(false);
        return;
      }

      // Early failure: text extracted but too short to be a real resume.
      // Show a clear error instead of sending blank content to the AI.
      if (!result.success && !result.needsOCR) {
        // iOS-specific font/asset decode failure: don't push the user
        // into a doomed OCR path — show a clear "try desktop / Word"
        // message and surface the diagnostic warnings (Task #25).
        // Only the failure modes the extractor *suppresses* OCR for
        // are listed here; TOO_FEW_WORDS is intentionally routed to
        // the OCR prompt instead via the earlier `needsOCR` return,
        // so listing it here would be unreachable and inconsistent.
        const isIOSFontFailure =
          result.isIOS &&
          (result.failureReason === 'EMPTY_STRINGS' ||
           result.failureReason === 'PAGE_ERRORS');
        setErrorType(isIOSFontFailure ? 'IOS_BROWSER_INCOMPATIBLE' : 'NO_TEXT');
        if (result.parseWarnings.length > 0) {
          setParseRecoveryWarnings(result.parseWarnings);
          setShowParseRecoveryBanner(true);
        }
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }
      
      setParseStep('extracting');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const resumeData = result.data!;
      const extraction = getExtractionSummary(resumeData);

      if (result.parseStatus !== 'success') {
        setParseRecoveryWarnings(result.parseWarnings);
        setShowParseRecoveryBanner(true);
      }

      if (extraction.isEmpty) {
        // Show error recovery UI instead of just a toast
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 300));

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      // Show import review sheet instead of navigating directly
      setPendingResumeData(resumeData);
      setShowImportReview(true);
      triggerATSScoring(resumeData);
    } catch (error) {
      if (error instanceof PDFParseError) {
        switch (error.code) {
          case 'PASSWORD_PROTECTED':
            setErrorType('PASSWORD_PROTECTED');
            setShowErrorRecovery(true);
            break;
          case 'CORRUPTED':
            setErrorType('CORRUPTED');
            setShowErrorRecovery(true);
            break;
          case 'NO_TEXT':
            setErrorType('NO_TEXT');
            setShowErrorRecovery(true);
            break;
          default:
            setErrorType('UNKNOWN');
            setShowErrorRecovery(true);
        }
      } else if (error instanceof Error && error.message === 'AI_UNREACHABLE') {
        setErrorType('AI_UNREACHABLE');
        setShowErrorRecovery(true);
      } else {
        setErrorType('UNKNOWN');
        setShowErrorRecovery(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [handleWordFile, handleImageFile]);

  const handleStartFresh = useCallback(() => {
    setShowErrorRecovery(false);
    navigate('/editor');
  }, [navigate]);

  const handleStartBlankResume = useCallback(async () => {
    setShowErrorRecovery(false);
    if (!user) {
      const { v4: uuidv4 } = await import('uuid');
      const guestId = uuidv4();
      setCurrentResumeId(guestId);
      setCurrentResume({
        id: guestId,
        contactInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        templateId: 'modern',
      });
      navigate('/editor');
      return;
    }
    try {
      const newResume = await createResume.mutateAsync({
        resume: {
          contactInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '' },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          templateId: 'modern',
        },
        title: 'My Resume',
      });
      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary,
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id,
      });
      navigate('/editor');
    } catch {
      navigate('/editor');
    }
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate]);

  const handleTryDifferentFile = useCallback(() => {
    setShowErrorRecovery(false);
    setFileName(null);
  }, []);

  const handleTryOCRFromRecovery = useCallback(() => {
    if (pendingFile) {
      setShowErrorRecovery(false);
      setShowOCRPrompt(true);
    }
  }, [pendingFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle file selection from the new ImportUploadSheet. `type` may be
  // null when the picked/dropped file isn't one of the supported formats;
  // we forward `undefined` so handleFile re-runs detection and surfaces
  // the unsupported-type toast through its existing branch.
  const handleFileFromSheet = useCallback((file: File, type: FileType | null) => {
    handleFile(file, type ?? undefined);
  }, [handleFile]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <Upload className="w-5 h-5 text-primary" />
          <h1 className="text-page-title truncate">Upload Resume</h1>
        </div>
      </header>
      {lowConfidenceFields.length > 0 && !isProcessing && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">Please double-check these fields:</span>{' '}
              <span className="text-muted-foreground">{lowConfidenceFields.join(', ')}</span>
            </p>
          </div>
        </div>
      )}
      {showParseRecoveryBanner && (
        <div className="mx-4 mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground mb-1">We had trouble reading your document</h4>
            <p className="text-sm text-muted-foreground mb-3">{parseRecoveryWarnings.join(' ')}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                onClick={() => {
                  setShowParseRecoveryBanner(false);
                  navigate('/upload');
                }}
              >
                Try a different file
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => setShowParseRecoveryBanner(false)}
              >
                Fill in manually
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showErrorRecovery ? (
            <motion.div
              key="error-recovery"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UploadErrorRecovery
                errorType={errorType}
                extractedSections={extractedSections}
                onTryOCR={errorType === 'NO_TEXT' ? handleTryOCRFromRecovery : undefined}
                onStartFresh={handleStartFresh}
                onStartBlankResume={handleStartBlankResume}
                onTryDifferentFile={handleTryDifferentFile}
                hasOCROption={errorType === 'NO_TEXT'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="upload-zone"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Upload Zone */}
              <UploadZone
                isDragging={isDragging}
                isProcessing={isProcessing}
                onUploadClick={() => !isProcessing && setShowImportSheet(true)}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isProcessing ? (
                  <UploadProgressSteps currentStep={parseStep} fileName={fileName ?? undefined} />
                ) : (
                  <div className="flex flex-col items-center bg-background rounded-2xl px-6 py-7 w-full max-w-xs">
                    <motion.div
                      className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-5"
                      animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                      style={{
                        boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.4)',
                      }}
                    >
                      {isDragging ? (
                        <FileText className="w-10 h-10 text-primary-foreground" />
                      ) : (
                        <Upload className="w-10 h-10 text-primary-foreground" />
                      )}
                    </motion.div>
                    
                    <h2 className="text-xl font-display font-semibold mb-2 text-center">
                      {isDragging ? 'Drop to Upload' : 'Upload Your Resume'}
                    </h2>
                    
                    <p className="text-muted-foreground text-center text-sm mb-4 max-w-[260px]">
                      Tap to pick your CV — we'll detect the format
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>PDF, Word, Image, JSON, HTML • max 10MB</span>
                    </div>
                  </div>
                )}
              </UploadZone>

              {/* URL import */}
              {!isProcessing && (
                <motion.form
                  className="mt-5 p-4 rounded-xl bg-muted/30 border border-border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUrlImport(urlInput);
                  }}
                >
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    Or paste a resume URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      inputMode="url"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); if (urlError) setUrlError(null); }}
                      placeholder="https://example.com/my-resume"
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md bg-background border border-border outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Resume URL"
                      disabled={isProcessing}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      disabled={isProcessing || !urlInput.trim()}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                    </button>
                  </div>
                  {urlError && (
                    <p className="mt-2 text-xs text-destructive">{urlError}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    We'll fetch the page text and run it through the same parser. Public pages only.
                  </p>
                </motion.form>
              )}

              {/* Tips - More Compact */}
              {!isProcessing && (
                <motion.div
                  className="mt-5 p-4 rounded-xl bg-muted/50 border border-border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="font-medium text-sm mb-2">💡 For best results</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Text-based PDFs & Word docs work best</li>
                    <li>✓ Keep formatting simple</li>
                    <li>✓ Photos & scans? We'll use OCR</li>
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* OCR Prompt Dialog */}
      <OCRPromptDialog
        open={showOCRPrompt}
        onConfirm={handleOCRConfirm}
        onCancel={handleOCRCancel}
        isProcessing={isOCRProcessing}
        progress={ocrProgress ?? undefined}
        estimatedTime={estimatedTime}
      />
      
      {/* Import Review Sheet */}
      <ImportReviewSheet
        open={showImportReview}
        onClose={handleImportReviewClose}
        onImport={handleImportConfirm}
        parsedData={pendingResumeData}
        atsScore={importATSScore}
        isScoring={isImportScoring}
      />
      
      {/* ATS Validation Checklist */}
      {validationResumeData && (
        <ATSValidationChecklist
          open={showValidationChecklist}
          parsedData={validationResumeData}
          atsScore={importATSScore}
          onContinue={handleValidationContinue}
          onBack={handleValidationBack}
        />
      )}

      {/* Import Upload Sheet (replaces FileTypeSelector) */}
      <ImportUploadSheet
        open={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        onFileSelect={handleFileFromSheet}
        isProcessing={isProcessing}
      />
    </div>
  );
}
