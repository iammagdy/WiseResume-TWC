/**
 * DashboardUploadWidget
 *
 * Embeds a compact "Upload Resume" button + drag-and-drop zone directly on
 * the dashboard. Uses useResumeUpload for the full parsing pipeline and shows
 * the enhanced ImportReviewSheet for the review step — all without navigating
 * away from the dashboard.
 *
 * Mobile: tapping "Upload Resume" opens the native document/photo picker.
 *         A separate "Scan with Camera" button (touch-device only) sets
 *         capture="environment" so iOS/Android immediately opens the camera.
 * Desktop: drag-and-drop works on the zone; clicking opens the OS picker.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Camera, Loader2, AlertTriangle, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportReviewSheet, SelectedSections, ContactEdits } from '@/components/upload/ImportReviewSheet';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { UploadProgressSteps } from '@/components/upload/UploadProgressSteps';
import { getUploadErrorCopy } from '@/components/upload/UploadErrorRecovery';
import { useResumeUpload } from '@/hooks/useResumeUpload';
import { useResumeMutations } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { useAuth } from '@/hooks/useAuth';
import { ALL_ACCEPT_STRING, detectFileType } from '@/lib/detectFileType';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { ResumeData } from '@/types/resume';

type DashboardUploadVariant = 'default' | 'compact' | 'workspace' | 'toolbar';

interface DashboardUploadWidgetProps {
  /** @deprecated Prefer `variant="compact"` */
  compact?: boolean;
  variant?: DashboardUploadVariant;
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function DashboardUploadWidget({
  compact = false,
  variant: variantProp,
}: DashboardUploadWidgetProps) {
  const variant: DashboardUploadVariant = variantProp ?? (compact ? 'compact' : 'default');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { scoreResume } = useResumeScore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [atsScore, setAtsScore] = useState<ResumeHealthScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => { setIsTouch(isTouchDevice()); }, []);

  const {
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
  } = useResumeUpload();

  // Open review sheet when parsing completes
  useEffect(() => {
    if (parsedData && !isProcessing) {
      setShowReview(true);
      triggerATSScoring(parsedData);
    }
  }, [parsedData, isProcessing]);

  const triggerATSScoring = useCallback((resumeData: ResumeData) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    setIsScoring(true);
    setAtsScore(null);
    scoreResume(tempId, resumeData, now)
      .then((result) => setAtsScore(result))
      .finally(() => setIsScoring(false));
  }, [scoreResume]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    haptics.light();
    processFile(file, detectFileType(file));
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file) { haptics.light(); processFile(file); }
  }, [isProcessing, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleImportConfirm = useCallback(async (
    data: ResumeData,
    sections: SelectedSections,
    contactEdits: ContactEdits,
  ) => {
    const filteredData: ResumeData = {
      ...data,
      contactInfo: sections.contactInfo
        ? {
            ...data.contactInfo,
            fullName: contactEdits.fullName || data.contactInfo.fullName,
            email: contactEdits.email || data.contactInfo.email,
          }
        : { fullName: '', email: '', phone: '', location: '' },
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

    setShowReview(false);

    try {
      if (user) {
        const newResume = await createResume.mutateAsync({
          resume: filteredData,
          title: filteredData.contactInfo.fullName || 'Uploaded Resume',
        });
        setCurrentResumeId(newResume.id);
        setCurrentResume({ ...filteredData, id: newResume.id });
        if (atsScore) {
          useATSScoreHistoryStore.getState().addScore(newResume.id, atsScore);
        }
      } else {
        setCurrentResume(filteredData);
      }
    } catch {
      setCurrentResume(filteredData);
    }

    clearParsedData();
    setAtsScore(null);

    const sectionCount = Object.values(sections).filter(Boolean).length;
    toast.success(`Resume imported (${sectionCount} section${sectionCount !== 1 ? 's' : ''})`, { duration: 4000 });
    haptics.success();
    navigate('/editor');
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate, atsScore, clearParsedData]);

  const handleReviewClose = useCallback(() => {
    setShowReview(false);
    clearParsedData();
    setAtsScore(null);
    setIsScoring(false);
  }, [clearParsedData]);

  const handleDismissError = useCallback(() => {
    clearError();
  }, [clearError]);

  const compactErrorCopy = error ? getUploadErrorCopy(error.type) : null;

  if (variant === 'toolbar' || variant === 'compact') {
    const isToolbar = variant === 'toolbar';
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { haptics.light(); fileInputRef.current?.click(); }}
            disabled={isProcessing}
            className={cn(
              'gap-1.5 touch-manipulation active:scale-95 shadow-none',
              isToolbar
                ? 'h-9 px-3.5 rounded-xl text-sm font-medium border-border/50 bg-card/40'
                : 'h-10',
            )}
            aria-label="Upload existing resume"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isToolbar ? 'Upload' : 'Upload Resume'}
          </Button>
          {isTouch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { haptics.light(); cameraInputRef.current?.click(); }}
              disabled={isProcessing}
              className={cn(
                'touch-manipulation active:scale-95',
                isToolbar ? 'h-9 w-9 rounded-xl' : 'h-10 w-10',
              )}
              aria-label="Scan resume with camera"
              title="Scan with camera"
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>

        <SharedDialogs
          isProcessing={isProcessing}
          parseStep={parseStep}
          fileName={fileName}
          ocrState={ocrState}
          confirmOCR={confirmOCR}
          cancelOCR={cancelOCR}
          error={error}
          onDismissError={handleDismissError}
          showReview={showReview}
          parsedData={parsedData}
          lowConfidenceFields={lowConfidenceFields}
          atsScore={atsScore}
          isScoring={isScoring}
          onReviewClose={handleReviewClose}
          onImportConfirm={handleImportConfirm}
          onNavigateUpload={() => navigate('/upload')}
        />
      </>
    );
  }

  const fileInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALL_ACCEPT_STRING}
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />
    </>
  );

  if (variant === 'workspace') {
    return (
      <>
        {fileInputs}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'dashboard-upload-workspace relative rounded-xl border transition-all duration-200',
            isDragging
              ? 'border-primary/50 bg-primary/8'
              : 'border-border/45 bg-muted/15 hover:border-primary/30 hover:bg-muted/25',
            isProcessing ? 'pointer-events-none' : 'cursor-pointer',
          )}
          role="button"
          tabIndex={isProcessing ? -1 : 0}
          aria-label="Upload resume — drag and drop or click to browse"
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!isProcessing && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                className="flex items-center gap-3 p-3 min-h-[52px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <UploadProgressSteps currentStep={parseStep} fileName={fileName ?? undefined} />
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                className="flex items-start gap-2.5 p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Couldn&apos;t read this file</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {compactErrorCopy?.compactDescription}
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-[11px] text-primary hover:underline touch-manipulation"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/upload');
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground touch-manipulation"
                    >
                      Full upload page
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissError();
                  }}
                  className="shrink-0 p-1 rounded-md hover:bg-muted/50 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex items-center gap-3 p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    isDragging ? 'bg-primary/25' : 'bg-primary/12',
                  )}
                >
                  {isDragging ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {isDragging ? 'Drop to import' : 'Upload existing resume'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {isTouch
                      ? 'Tap to pick · PDF, Word, or image'
                      : 'Drag & drop or click · max 10MB'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isTouch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => {
                        haptics.light();
                        cameraInputRef.current?.click();
                      }}
                      aria-label="Scan with camera"
                    >
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-lg text-xs font-medium shadow-none shrink-0"
                    onClick={() => {
                      haptics.light();
                      fileInputRef.current?.click();
                    }}
                    aria-label="Upload resume"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Upload
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <SharedDialogs
          isProcessing={isProcessing}
          parseStep={parseStep}
          fileName={fileName}
          ocrState={ocrState}
          confirmOCR={confirmOCR}
          cancelOCR={cancelOCR}
          error={error}
          onDismissError={handleDismissError}
          showReview={showReview}
          parsedData={parsedData}
          lowConfidenceFields={lowConfidenceFields}
          atsScore={atsScore}
          isScoring={isScoring}
          onReviewClose={handleReviewClose}
          onImportConfirm={handleImportConfirm}
          onNavigateUpload={() => navigate('/upload')}
        />
      </>
    );
  }

  return (
    <>
      {fileInputs}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/8 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-muted/30',
          isProcessing ? 'pointer-events-none' : 'cursor-pointer'
        )}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label="Upload resume — drag and drop or click to browse"
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isProcessing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              className="flex flex-col items-center justify-center p-6 min-h-[140px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UploadProgressSteps currentStep={parseStep} fileName={fileName ?? undefined} />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              className="flex items-start gap-3 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Couldn't read this file</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {compactErrorCopy?.compactDescription}
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="text-xs text-primary hover:underline touch-manipulation"
                  >
                    Try another file
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/upload'); }}
                    className="text-xs text-muted-foreground hover:text-foreground touch-manipulation"
                  >
                    Open full upload page
                  </button>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDismissError(); }}
                className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                  isDragging ? 'bg-primary/20' : 'bg-primary/10'
                )}>
                  {isDragging
                    ? <Check className="w-6 h-6 text-primary" />
                    : <FileText className="w-6 h-6 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isDragging ? 'Drop your resume here' : 'Upload existing resume'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isTouch
                      ? 'Tap to pick a file · PDF, Word, or image'
                      : 'Drag & drop or click · PDF, Word, or image · max 10MB'}
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 shrink-0 sm:w-auto sm:justify-end">
                {isTouch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); haptics.light(); cameraInputRef.current?.click(); }}
                    disabled={isProcessing}
                    className="h-10 w-10 touch-manipulation active:scale-95"
                    aria-label="Scan with camera"
                    title="Scan with camera"
                  >
                    <Camera className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); fileInputRef.current?.click(); }}
                  disabled={isProcessing}
                  className="h-10 w-full gap-1.5 touch-manipulation active:scale-95 sm:w-auto"
                  aria-label="Upload resume"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Resume
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SharedDialogs
        isProcessing={isProcessing}
        parseStep={parseStep}
        fileName={fileName}
        ocrState={ocrState}
        confirmOCR={confirmOCR}
        cancelOCR={cancelOCR}
        error={error}
        onDismissError={handleDismissError}
        showReview={showReview}
        parsedData={parsedData}
        lowConfidenceFields={lowConfidenceFields}
        atsScore={atsScore}
        isScoring={isScoring}
        onReviewClose={handleReviewClose}
        onImportConfirm={handleImportConfirm}
        onNavigateUpload={() => navigate('/upload')}
      />
    </>
  );
}

interface SharedDialogsProps {
  isProcessing: boolean;
  parseStep: ReturnType<typeof useResumeUpload>['parseStep'];
  fileName: string | null;
  ocrState: ReturnType<typeof useResumeUpload>['ocrState'];
  confirmOCR: () => Promise<void>;
  cancelOCR: () => void;
  error: ReturnType<typeof useResumeUpload>['error'];
  onDismissError: () => void;
  showReview: boolean;
  parsedData: ResumeData | null;
  lowConfidenceFields: string[];
  atsScore: ResumeHealthScore | null;
  isScoring: boolean;
  onReviewClose: () => void;
  onImportConfirm: (data: ResumeData, sections: SelectedSections, edits: ContactEdits) => void;
  onNavigateUpload: () => void;
}

function SharedDialogs({
  ocrState,
  confirmOCR,
  cancelOCR,
  showReview,
  parsedData,
  lowConfidenceFields,
  atsScore,
  isScoring,
  onReviewClose,
  onImportConfirm,
}: SharedDialogsProps) {
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);

  const handleOCRConfirm = useCallback(async () => {
    setIsOCRProcessing(true);
    try { await confirmOCR(); } finally { setIsOCRProcessing(false); }
  }, [confirmOCR]);

  return (
    <>
      <OCRPromptDialog
        open={ocrState.showPrompt}
        onConfirm={handleOCRConfirm}
        onCancel={cancelOCR}
        isProcessing={isOCRProcessing}
        progress={ocrState.progress ?? undefined}
        estimatedTime={ocrState.estimatedTime}
      />

      <ImportReviewSheet
        open={showReview}
        onClose={onReviewClose}
        onImport={onImportConfirm}
        parsedData={parsedData}
        atsScore={atsScore}
        isScoring={isScoring}
        lowConfidenceFields={lowConfidenceFields}
      />
    </>
  );
}
