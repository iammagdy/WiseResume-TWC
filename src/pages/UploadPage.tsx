import { useState, useCallback, useEffect, useRef } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations } from '@/hooks/useResumes';
import { useResumeScore, ResumeHealthScore } from '@/hooks/useResumeScore';
import { extractTextFromHTML } from '@/lib/jsonResumeValidator';
import { preprocessResumeText, extractContactHints } from '@/lib/pdf/textPreprocessor';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { UploadErrorRecovery, UploadErrorType } from '@/components/upload/UploadErrorRecovery';
import { UploadProgressSteps } from '@/components/upload/UploadProgressSteps';
import { ImportReviewSheet, SelectedSections, ContactEdits } from '@/components/upload/ImportReviewSheet';
import { ATSValidationChecklist } from '@/components/upload/ATSValidationChecklist';
import { ImportUploadSheet } from '@/components/upload/ImportUploadSheet';
import { type FileType } from '@/lib/detectFileType';
import { UploadZone } from '@/components/upload/UploadZone';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { useResumeUpload } from '@/hooks/useResumeUpload';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { createResume } = useResumeMutations();
  const { scoreResume } = useResumeScore();

  const {
    processFile,
    processText,
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
  } = useResumeUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);

  const [showImportReview, setShowImportReview] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);

  const [importATSScore, setImportATSScore] = useState<ResumeHealthScore | null>(null);
  const [isImportScoring, setIsImportScoring] = useState(false);

  const [showValidationChecklist, setShowValidationChecklist] = useState(false);
  const [validationResumeData, setValidationResumeData] = useState<ResumeData | null>(null);
  const [validationSections, setValidationSections] = useState<SelectedSections | null>(null);

  const [showParseRecoveryBanner, setShowParseRecoveryBanner] = useState(false);
  const [parseRecoveryWarnings, setParseRecoveryWarnings] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const [extractedSections, setExtractedSections] = useState<{
    contact?: boolean;
    summary?: boolean;
    experience?: number;
    education?: number;
    skills?: number;
  } | undefined>(undefined);

  // Watch parsedData from hook → open review sheet + trigger ATS scoring
  const prevParsedRef = useRef<ResumeData | null>(null);
  useEffect(() => {
    if (parsedData && parsedData !== prevParsedRef.current) {
      prevParsedRef.current = parsedData;
      setPendingResumeData(parsedData);
      setShowImportReview(true);
      triggerATSScoring(parsedData);
    }
    if (!parsedData) {
      prevParsedRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedData]);

  // Watch error warnings → show parse recovery banner
  useEffect(() => {
    if (error?.warnings && error.warnings.length > 0) {
      setParseRecoveryWarnings(error.warnings);
      setShowParseRecoveryBanner(true);
    }
  }, [error]);

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
    setIsOCRProcessing(true);
    try { await confirmOCR(); } finally { setIsOCRProcessing(false); }
  }, [confirmOCR]);

  const handleImportConfirm = useCallback(async (data: ResumeData, sections: SelectedSections, contactEdits?: ContactEdits) => {
    const filteredData: ResumeData = {
      ...data,
      contactInfo: sections.contactInfo ? {
        ...data.contactInfo,
        ...(contactEdits?.fullName ? { fullName: contactEdits.fullName } : {}),
        ...(contactEdits?.email ? { email: contactEdits.email } : {}),
      } : { fullName: '', email: '', phone: '', location: '' },
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

    setValidationResumeData(filteredData);
    setValidationSections(sections);
    setShowImportReview(false);
    setShowValidationChecklist(true);
  }, []);

  const handleValidationContinue = useCallback(async () => {
    if (!validationResumeData || !validationSections) return;

    if (user) {
      try {
        const newResume = await createResume.mutateAsync({
          resume: validationResumeData,
          title: validationResumeData.contactInfo.fullName || 'Uploaded Resume',
        });
        setCurrentResumeId(newResume.id);
        setCurrentResume({ ...validationResumeData, id: newResume.id });
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

  const handleValidationBack = useCallback(() => {
    setShowValidationChecklist(false);
    setShowImportReview(true);
    if (validationResumeData) setPendingResumeData(validationResumeData);
  }, [validationResumeData]);

  const handleImportReviewClose = useCallback(() => {
    setShowImportReview(false);
    setPendingResumeData(null);
    clearParsedData();
    setImportATSScore(null);
    setIsImportScoring(false);
  }, [clearParsedData]);

  const handleStartFresh = useCallback(() => {
    clearError();
    navigate('/editor');
  }, [clearError, navigate]);

  const handleStartBlankResume = useCallback(async () => {
    clearError();
    if (!user) {
      const { v4: uuidv4 } = await import('uuid');
      const guestId = uuidv4();
      setCurrentResumeId(guestId);
      setCurrentResume({
        id: guestId,
        contactInfo: { fullName: '', email: '', phone: '', location: '' },
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
          contactInfo: { fullName: '', email: '', phone: '', location: '' },
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
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate, clearError]);

  const handleTryDifferentFile = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleTryOCRFromRecovery = useCallback(() => {
    if (ocrState.pendingFile) {
      clearError();
    }
  }, [ocrState.pendingFile, clearError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileFromSheet = useCallback((file: File, type: FileType | null) => {
    setShowImportSheet(false);
    processFile(file, type ?? undefined);
  }, [processFile]);

  const handleUrlImport = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) { setUrlError('Please paste a URL first.'); return; }
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('Only http and https URLs are supported.');
        return;
      }
    } catch {
      setUrlError("That doesn't look like a valid URL.");
      return;
    }
    setUrlError(null);

    try {
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
        return;
      }
      const { html } = await proxyRes.json() as { html: string };

      const text = extractTextFromHTML(html);
      if (!text.trim() || text.length < 50) {
        setUrlError('No readable text found on this page. Try a direct PDF or Word link instead.');
        return;
      }

      let cleanedText: string;
      try { cleanedText = preprocessResumeText(text); } catch { cleanedText = text; }
      let textWithHints: string;
      try {
        const hints = extractContactHints(cleanedText);
        textWithHints = hints ? cleanedText + hints : cleanedText;
      } catch { textWithHints = cleanedText; }

      await processText(textWithHints, url, 'url');
      setUrlInput('');
    } catch (err) {
      if (!(err instanceof Error && err.message === 'AI_UNREACHABLE')) {
        const msg = err instanceof Error ? err.message : 'Failed to import from URL.';
        toast.error(msg, { duration: 5000 });
      }
    }
  }, [processText]);

  const showErrorRecovery = error !== null;
  const errorType: UploadErrorType = error?.type ?? 'UNKNOWN';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <Upload className="w-5 h-5 text-primary" />
          <h1 className="text-page-title truncate">Upload Resume</h1>
        </div>
      </header>

      {lowConfidenceFields.length > 0 && !isProcessing && !showImportReview && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">Please double-check these fields:</span>{' '}
              <span className="text-muted-foreground">{lowConfidenceFields.join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {showParseRecoveryBanner && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/25 flex items-start gap-3 shadow-soft-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground mb-1">We had trouble reading your document</h4>
            <p className="text-sm text-muted-foreground mb-3">{parseRecoveryWarnings.join(' ')}</p>
            <div className="flex flex-col xs:flex-row gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] flex-1 sm:flex-none"
                onClick={() => { setShowParseRecoveryBanner(false); navigate('/upload'); }}
              >
                Try a different file
              </Button>
              <Button
                size="sm"
                className="min-h-[44px] flex-1 sm:flex-none"
                onClick={() => setShowParseRecoveryBanner(false)}
              >
                Fill in manually
              </Button>
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
                hasOCROption={errorType === 'NO_TEXT' && !!ocrState.pendingFile}
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
                  <div className="flex flex-col items-center w-full max-w-sm px-2 sm:px-4 py-2">
                    <motion.div
                      className="w-20 h-20 rounded-full bg-primary shadow-soft-md flex items-center justify-center mb-5"
                      animate={isDragging ? { scale: 1.06 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isDragging ? (
                        <FileText className="w-10 h-10 text-primary-foreground" aria-hidden />
                      ) : (
                        <Upload className="w-10 h-10 text-primary-foreground" aria-hidden />
                      )}
                    </motion.div>
                    <h2 className="text-h2 text-foreground mb-2 text-center">
                      {isDragging ? 'Drop to upload' : 'Upload your resume'}
                    </h2>
                    <p className="text-muted-foreground text-center text-sm mb-4 max-w-[280px] leading-relaxed">
                      {isDragging
                        ? 'Release to start importing'
                        : 'Tap to browse or drag a file here — we detect the format automatically'}
                    </p>
                    <span className="inline-flex items-center justify-center mb-4 w-full sm:w-auto min-w-[200px] min-h-[44px] rounded-md bg-primary text-primary-foreground text-sm font-semibold px-4 shadow-soft-sm pointer-events-none">
                      Browse files
                    </span>
                    <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                      <FileText className="w-4 h-4 shrink-0" aria-hidden />
                      <span>PDF, Word, image, JSON, HTML · max 10MB</span>
                    </p>
                  </div>
                )}
              </UploadZone>

              {/* URL import */}
              {!isProcessing && (
                <motion.form
                  className="mt-5 p-4 rounded-xl bg-card border border-border shadow-soft-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUrlImport(urlInput);
                  }}
                >
                  <label htmlFor="resume-url-input" className="flex items-center gap-2 text-label text-foreground mb-2">
                    <LinkIcon className="w-4 h-4 text-primary shrink-0" aria-hidden />
                    Or paste a resume URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="resume-url-input"
                      type="url"
                      inputMode="url"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); if (urlError) setUrlError(null); }}
                      placeholder="https://example.com/my-resume"
                      className="flex-1 min-w-0"
                      aria-label="Resume URL"
                      disabled={isProcessing}
                    />
                    <Button
                      type="submit"
                      className="min-h-[44px] sm:min-w-[120px] shrink-0"
                      disabled={isProcessing || !urlInput.trim()}
                    >
                      {isProcessing ? <MiniSpinner size={16} /> : 'Import'}
                    </Button>
                  </div>
                  {urlError && (
                    <p className="mt-2 text-xs text-destructive">{urlError}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    We'll fetch the page text and run it through the same parser. Public pages only.
                  </p>
                </motion.form>
              )}

              {/* Tips */}
              {!isProcessing && (
                <motion.section
                  className="mt-5 p-4 rounded-xl bg-card border border-border shadow-soft-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  aria-labelledby="upload-tips-heading"
                >
                  <h3 id="upload-tips-heading" className="text-label text-foreground mb-3">
                    Tips for best results
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      Text-based PDFs and Word docs parse fastest
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      Simple formatting improves field detection
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      Photos and scans are supported via OCR
                    </li>
                  </ul>
                </motion.section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OCR Prompt Dialog */}
      <OCRPromptDialog
        open={ocrState.showPrompt}
        onConfirm={handleOCRConfirm}
        onCancel={cancelOCR}
        isProcessing={isOCRProcessing}
        progress={ocrState.progress ?? undefined}
        estimatedTime={ocrState.estimatedTime}
      />

      {/* Import Review Sheet */}
      <ImportReviewSheet
        open={showImportReview}
        onClose={handleImportReviewClose}
        onImport={handleImportConfirm}
        parsedData={pendingResumeData}
        atsScore={importATSScore}
        isScoring={isImportScoring}
        lowConfidenceFields={lowConfidenceFields}
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

      {/* Import Upload Sheet */}
      <ImportUploadSheet
        open={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        onFileSelect={handleFileFromSheet}
        isProcessing={isProcessing}
      />
    </div>
  );
}
