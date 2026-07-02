import { useState, useCallback, useEffect, useRef } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, Link as LinkIcon, Sparkles } from 'lucide-react';
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
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';
import { useLocale } from '@/i18n/LocaleProvider';

export default function UploadPage() {
  const { t } = useLocale();
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
  // Guards against a rapid double-tap on "Continue" creating two resume docs.
  const isContinuingRef = useRef(false);
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
    // Prevent a rapid double-tap from creating two resume documents before the
    // first create resolves (frontend-local guard only; no API change).
    if (isContinuingRef.current) return;
    isContinuingRef.current = true;

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
        toast.error(t('app.uploadPage.saveError'), { duration: 5000 });
        isContinuingRef.current = false;
        return;
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
  }, [validationResumeData, validationSections, user, createResume, setCurrentResume, setCurrentResumeId, navigate, importATSScore, t]);

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
        templateId: DEFAULT_RESUME_TEMPLATE_ID,
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
          templateId: DEFAULT_RESUME_TEMPLATE_ID,
        },
        title: t('app.uploadPage.defaultResumeTitle'),
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
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate, clearError, t]);

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
    if (!trimmed) { setUrlError(t('app.uploadPage.urlImport.pasteFirst')); return; }
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError(t('app.uploadPage.urlImport.httpOnly'));
        return;
      }
    } catch {
      setUrlError(t('app.uploadPage.urlImport.invalidUrl'));
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
        const msg = (errBody as { error?: string }).error || t('app.uploadPage.urlImport.fetchFailed', { status: proxyRes.status });
        setUrlError(msg);
        toast.error(msg, { duration: 5000 });
        return;
      }
      const { html } = await proxyRes.json() as { html: string };

      const text = extractTextFromHTML(html);
      if (!text.trim() || text.length < 50) {
        setUrlError(t('app.uploadPage.urlImport.noReadableText'));
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
        const msg = err instanceof Error ? err.message : t('app.uploadPage.urlImport.importFailed');
        toast.error(msg, { duration: 5000 });
      }
    }
  }, [processText, t]);

  const showErrorRecovery = error !== null;
  const errorType: UploadErrorType = error?.type ?? 'UNKNOWN';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile header */}
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="w-3.5 h-3.5 text-primary" aria-hidden />
          </div>
          <h1 className="text-page-title truncate">{t('app.uploadPage.title')}</h1>
        </div>
      </header>

      <div className="lg:hidden shrink-0 px-4 pt-4 pb-2 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/12">
          <Upload className="w-3 h-3" aria-hidden />
          {t('app.uploadPage.eyebrow')}
        </span>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {t('app.uploadPage.description')}
        </p>
      </div>

      {lowConfidenceFields.length > 0 && !isProcessing && !showImportReview && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{t('app.uploadPage.reviewFields')}</span>{' '}
              <span className="text-muted-foreground">{lowConfidenceFields.join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {showParseRecoveryBanner && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/25 flex items-start gap-3 shadow-soft-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground mb-1">{t('app.uploadPage.parseRecovery.title')}</h4>
            <p className="text-sm text-muted-foreground mb-3">{parseRecoveryWarnings.join(' ')}</p>
            <div className="flex flex-col xs:flex-row gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] flex-1 sm:flex-none"
                onClick={() => { setShowParseRecoveryBanner(false); handleTryDifferentFile(); }}
              >
                {t('app.uploadPage.parseRecovery.tryDifferentFile')}
              </Button>
              <Button
                size="sm"
                className="min-h-[44px] flex-1 sm:flex-none"
                onClick={() => { setShowParseRecoveryBanner(false); handleStartBlankResume(); }}
              >
                {t('app.uploadPage.parseRecovery.continueManually')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 py-6 lg:py-10 overflow-y-auto">
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
              className="flex-1 flex flex-col lg:max-w-lg lg:mx-auto lg:w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Desktop context hero — only shown when idle (not processing, no error) */}
              <div className="hidden lg:flex flex-col items-center text-center mb-7 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/12">
                  <Upload className="w-3 h-3" aria-hidden />
                  {t('app.uploadPage.eyebrow')}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  {t('app.uploadPage.heroTitle')}
                </h1>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  {t('app.uploadPage.description')}
                </p>
              </div>

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
                      className="relative w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-5"
                      style={{ boxShadow: '0 8px 24px -4px hsl(var(--primary)/0.4)' }}
                      animate={isDragging ? { scale: 1.07, rotate: -4 } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {isDragging ? (
                        <FileText className="w-9 h-9 text-primary-foreground" aria-hidden />
                      ) : (
                        <Upload className="w-9 h-9 text-primary-foreground" aria-hidden />
                      )}
                    </motion.div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground mb-1.5 text-center">
                      {isDragging ? t('app.uploadPage.dropTitle') : t('app.uploadPage.uploadTitle')}
                    </h2>
                    <p className="text-muted-foreground text-center text-sm mb-5 max-w-[260px] leading-relaxed">
                      {isDragging
                        ? t('app.uploadPage.dropDescription')
                        : t('app.uploadPage.idleDescription')}
                    </p>
                    <span className="inline-flex items-center justify-center mb-5 w-full sm:w-auto min-w-[200px] min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-5 pointer-events-none"
                      style={{ boxShadow: '0 4px 14px -2px hsl(var(--primary)/0.35)' }}>
                      {t('app.uploadPage.browse')}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {['PDF', 'Word', 'Image', 'JSON', 'HTML'].map((fmt) => (
                        <span
                          key={fmt}
                          className="text-xs font-medium text-muted-foreground bg-muted/40 border border-border/60 rounded-md px-2 py-0.5"
                        >
                          {fmt}
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground/70">· {t('app.uploadPage.maxSize')}</span>
                    </div>
                  </div>
                )}
              </UploadZone>

              {/* URL import */}
              {!isProcessing && (
                <motion.form
                  className="mt-5 p-4 rounded-2xl bg-card border border-border shadow-soft-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUrlImport(urlInput);
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-3.5 h-3.5 text-primary" aria-hidden />
                    </div>
                    <label htmlFor="resume-url-input" className="text-sm font-semibold text-foreground">
                      {t('app.uploadPage.urlImport.title')}
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="resume-url-input"
                      type="url"
                      inputMode="url"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); if (urlError) setUrlError(null); }}
                      placeholder="https://example.com/my-resume.pdf"
                      className="flex-1 min-w-0"
                      aria-label={t('app.uploadPage.urlImport.aria')}
                      disabled={isProcessing}
                    />
                    <Button
                      type="submit"
                      className="min-h-[44px] sm:min-w-[120px] shrink-0"
                      disabled={isProcessing || !urlInput.trim()}
                    >
                      {isProcessing ? <MiniSpinner size={16} /> : t('app.uploadPage.urlImport.submit')}
                    </Button>
                  </div>
                  {urlError && (
                    <p className="mt-2 text-xs text-destructive">{urlError}</p>
                  )}
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    {t('app.uploadPage.urlImport.description')}
                  </p>
                </motion.form>
              )}

              {/* Tips */}
              {!isProcessing && (
                <motion.section
                  className="mt-5 p-4 rounded-2xl bg-card border border-border shadow-soft-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  aria-labelledby="upload-tips-heading"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3 h-3 text-primary" aria-hidden />
                    </div>
                    <h3 id="upload-tips-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('app.uploadPage.tips.title')}
                    </h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2.5">
                    {[
                      t('app.uploadPage.tips.textPdfWord'),
                      t('app.uploadPage.tips.simpleFormatting'),
                      t('app.uploadPage.tips.ocrSupported'),
                    ].map((tip) => (
                      <li key={tip} className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0 flex-none" aria-hidden />
                        {tip}
                      </li>
                    ))}
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
