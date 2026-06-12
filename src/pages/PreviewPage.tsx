import { useState, useRef, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { TemplateSkeleton } from '@/components/layout/PageSkeletons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, Check, FileText, Mic, FolderDown, Palette, FileDown } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { PreviewScaledWrapper } from '@/components/editor/PreviewScaledWrapper';
import { migrateTemplateId } from '@/lib/templateMigration';
import { dbToResumeData, useResume } from '@/hooks/useResumes';

import { templateComponentMap } from '@/lib/templateComponentMap';

// Lazy-loaded sheets
const ExportOptionsSheet = lazy(() => import('@/components/editor/ExportOptionsSheet').then((m) => ({ default: m.ExportOptionsSheet })));
const ResumePhotoSheet = lazy(() => import('@/components/editor/ResumePhotoSheet').then((m) => ({ default: m.ResumePhotoSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/SmartFitWizardSheet').then((m) => ({ default: m.SmartFitWizardSheet })));
const ShareSheet = lazy(() => import('@/components/editor/ShareSheet').then((m) => ({ default: m.ShareSheet })));
import { PdfGenerationError } from '@/lib/pdfUtils';
import { PDFServerUnavailableError } from '@/lib/nativePdfGenerator';
import { getTemplateConfig } from '@/lib/templateConfig';
import { getPageDimensionsForFormat, resolveExportPageCount } from '@/lib/pdfUtils';
import { PageCountBadge } from '@/components/editor/export/PageCountBadge';
import { PageCutHint, usePageCutHintPulse } from '@/components/editor/export/PageCutHint';
import { resolvePageBreakTemplate } from '@/lib/resolvePageBreakTemplate';
import { PageBreakSetupDialog } from '@/components/editor/export/PageBreakSetupDialog';
import { downloadFile } from '@/lib/downloadUtils';
import { useExportProgress } from '@/hooks/useExportProgress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { templates } from '@/lib/templateData';
import { TemplateId, ExportType } from '@/types/resume';
import { useRateApp } from '@/hooks/useRateApp';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { storage, ID } from '@/lib/appwrite';
import { BUCKETS } from '@/lib/appwrite-collections';
import { avatarFilePermissions, getAvatarViewUrl } from '@/lib/avatarStorage';



export default function PreviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const {
    currentResume,
    selectedTemplate,
    setSelectedTemplate,
    setCurrentResume,
    setCurrentResumeId,
    generatedCoverLetter,
    coverLetterJobContext,
    updateResume
  } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showOnePageWizard, setShowOnePageWizard] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [pageBreakOpen, setPageBreakOpen] = useState(false);
  const [pageBreakTemplateEl, setPageBreakTemplateEl] = useState<HTMLElement | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const resumeRef = useRef<HTMLDivElement>(null);
  const pageCountBadgeRef = useRef<HTMLSpanElement>(null);
  const showPageCutHintPulse = usePageCutHintPulse();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const { exportProgress, onProgress, reset: resetProgress } = useExportProgress();
  const guestPreviewHintShown = useRef(false);
  const downloadTriggered = useRef(false);
  // Capture the auto-export action once at mount from the URL before setSearchParams can clear it.
  // If we read it from searchParams inside the effect, calling setSearchParams causes a dep-change
  // re-render that cancels the export timer via effect cleanup (the root cause of the export bug).
  const autoExportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAutoExportAction = useRef<string | null>(
    (() => {
      const a = searchParams.get('action');
      return ['download', 'ats-pdf', 'docx'].includes(a ?? '') ? a : null;
    })()
  );
  const [autoExportFallback, setAutoExportFallback] = useState<string | null>(null);
  const resumeIdFromUrl = searchParams.get('id');

  const needsResumeBootstrap =
    !!resumeIdFromUrl && (!currentResume || currentResume.id !== resumeIdFromUrl);
  const {
    data: bootstrapResumeDoc,
    isLoading: isBootstrapResumeLoading,
    isFetching: isBootstrapResumeFetching,
  } = useResume(needsResumeBootstrap ? resumeIdFromUrl : null);

  const isBootstrapPending =
    !!resumeIdFromUrl &&
    (!currentResume || currentResume.id !== resumeIdFromUrl) &&
    (isBootstrapResumeLoading || isBootstrapResumeFetching || !!bootstrapResumeDoc);
  const hasBootstrapResolved =
    !needsResumeBootstrap || !!bootstrapResumeDoc || (!isBootstrapResumeLoading && !isBootstrapResumeFetching);

  const isPreviewReady =
    !!currentResume && (!resumeIdFromUrl || currentResume.id === resumeIdFromUrl);

  // Get template configuration for the selected template
  const templateConfig = useMemo(() => getTemplateConfig(selectedTemplate), [selectedTemplate]);

  const pageFormat = currentResume?.customization?.pageFormat ?? 'letter';
  const previewDims = useMemo(() => getPageDimensionsForFormat(pageFormat, selectedTemplate), [pageFormat, selectedTemplate]);
  const customBreakPositions = currentResume?.customization?.customBreakPositions;

  useEffect(() => {
    if (!resumeIdFromUrl || !bootstrapResumeDoc) return;
    const loadedResume = dbToResumeData(bootstrapResumeDoc);
    setCurrentResume(loadedResume);
    setCurrentResumeId(loadedResume.id ?? resumeIdFromUrl);
    setSelectedTemplate(
      migrateTemplateId(
        (bootstrapResumeDoc.template || loadedResume.templateId || selectedTemplate) as string,
      ) as TemplateId,
    );
  }, [
    bootstrapResumeDoc,
    resumeIdFromUrl,
    selectedTemplate,
    setCurrentResume,
    setCurrentResumeId,
    setSelectedTemplate,
  ]);

  useEffect(() => {
    const el = resumeRef.current;
    if (!el || !currentResume) return;
    const { pageWidth, pageHeight } = previewDims;
    const update = () => {
      setPageCount(resolveExportPageCount(el, pageWidth, pageHeight, customBreakPositions));
    };
    const timer = window.setTimeout(update, 150);
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => {
      window.clearTimeout(timer);
      obs.disconnect();
    };
  }, [currentResume, previewDims, customBreakPositions, selectedTemplate]);

  // Rate app hook
  const { incrementPositiveActions, shouldPromptForRating, openFeedback, dismissRating } = useRateApp();

  // Check if we should show photo prompt when switching to a photo-supporting template
  useEffect(() => {
    if (!currentResume) return;

    const config = getTemplateConfig(selectedTemplate);
    if (config.supportsPhoto && !currentResume.contactInfo.photoUrl) {
      const dismissed = localStorage.getItem(`photo-prompt-${currentResume.id}`);
      if (!dismissed) {
        setShowPhotoSheet(true);
      }
    }
  }, [selectedTemplate, currentResume?.id]);

  // Guest preview hint toast
  useEffect(() => {
    if (user || guestPreviewHintShown.current || sessionStorage.getItem('wr-preview-signin-hint') === '1') return;
    guestPreviewHintShown.current = true;
    const timer = setTimeout(() => {
      sessionStorage.setItem('wr-preview-signin-hint', '1');
      toast('Sign in to save and download in multiple formats', {
        action: { label: 'Sign Up', onClick: () => window.location.href = '/auth?mode=signup' },
        duration: 5000
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  // Auto-download: when arriving with ?action=download|ats-pdf|docx from a fresh tab.
  //
  // Root-cause fix: previously, setSearchParams was called immediately (before the 800ms
  // timer), changing searchParams, which triggered the effect cleanup (clearTimeout),
  // cancelling the export timer before it could fire.
  //
  // Fix: action is read once at mount via initialAutoExportAction ref (not from searchParams
  // on each effect run). The timer is stored in autoExportTimerRef — NOT returned as effect
  // cleanup — so React cannot cancel it when deps change. setSearchParams runs inside the
  // timer callback, after the export is triggered. The timer is cancelled only on unmount.
  useEffect(() => {
    const action = initialAutoExportAction.current;
    if (!action || downloadTriggered.current) return;
    if (!isPreviewReady || isBootstrapPending) return;

    downloadTriggered.current = true;
    initialAutoExportAction.current = null;

    autoExportTimerRef.current = setTimeout(() => {
      autoExportTimerRef.current = null;
      // Clean URL only after export is triggered to avoid the dep-change → cleanup → cancel cycle
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('action');
        return next;
      }, { replace: true });

      if (!currentResume) { setAutoExportFallback(action); return; }
      // DOCX export does not need the rendered template element
      if (action === 'docx') { handleExport('docx', true); return; }
      // PDF exports need the template DOM node; show fallback CTA if not available
      if (!resumeRef.current) { setAutoExportFallback(action); return; }
      if (action === 'ats-pdf') handleExport('ats-pdf', false);
      else handleExport('resume', true);
    }, 800);
    // No cleanup returned — timer lives in autoExportTimerRef and is cancelled on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewReady, isBootstrapPending, currentResume, setSearchParams]);
  // handleExport excluded: recreated each render but correctly captured in the timer closure
  // at the moment it fires. searchParams excluded: action is read once via initialAutoExportAction.

  // Cancel the auto-export timer if the component unmounts before it fires
  useEffect(() => {
    return () => {
      if (autoExportTimerRef.current !== null) {
        clearTimeout(autoExportTimerRef.current);
      }
    };
  }, []);

  // Resume guard — show a brief skeleton while the Zustand store hydrates on rapid
  // navigation, then redirect if the resume is still absent after settling.
  useEffect(() => {
    if (currentResume) return;
    if (isBootstrapPending) return;
    if (resumeIdFromUrl && !hasBootstrapResolved) return;
    const timer = setTimeout(() => {
      navigate(user ? '/dashboard' : '/');
    }, 150);
    return () => clearTimeout(timer);
  }, [currentResume, hasBootstrapResolved, isBootstrapPending, navigate, resumeIdFromUrl, user]);

  if (!currentResume) {
    return <TemplateSkeleton />;
  }

  // Photo sheet handlers
  const handleUseProfilePhoto = () => {
    if (profile?.avatarUrl) {
      updateResume({
        contactInfo: { ...currentResume.contactInfo, photoUrl: profile.avatarUrl }
      });
      toast.success('Profile photo added to resume');
    }
  };

  const handleUploadPhoto = async (blob: Blob) => {
    try {
      if (user) {
        const file = new File([blob], `resume-photo-${Date.now()}.png`, { type: 'image/png' });
        const fileId = ID.unique();
        await storage.createFile(BUCKETS.avatars, fileId, file, avatarFilePermissions(user.id));
        updateResume({ contactInfo: { ...currentResume.contactInfo, photoUrl: getAvatarViewUrl(fileId) } });
      } else {
        const url = URL.createObjectURL(blob);
        updateResume({ contactInfo: { ...currentResume.contactInfo, photoUrl: url } });
      }
      toast.success('Photo added to resume');
    } catch {
      toast.error('Failed to upload photo');
    }
  };

  const handleKeepInitials = (dontAskAgain: boolean) => {
    if (dontAskAgain && currentResume?.id) {
      localStorage.setItem(`photo-prompt-${currentResume.id}`, 'true');
    }
  };

  const handleExport = async (type: ExportType, showPageNumbers: boolean, showBranding: boolean = true, customFileName?: string) => {
    setIsGenerating(true);
    resetProgress();

    const MAX_RETRIES = 2;
    let attempt = 0;

    const tryExport = async (): Promise<void> => {
      try {
        const sanitized = customFileName
          ? customFileName.replace(/[/\\:*?"<>|]/g, '').trim().slice(0, 100)
          : '';
        const baseName = (sanitized.length >= 3 ? sanitized : null) || currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Document';
        const pdfOptions = { showPageNumbers, pageNumberFormat: 'full' as const, showBranding };

        // DOCX export path
        if (type === 'docx') {
          onProgress('preparing', 10);
          onProgress('finalizing', 50);
          const { generateAndDownloadDOCX } = await import('@/lib/docxGenerator');
          const success = await generateAndDownloadDOCX(currentResume);
          onProgress('downloading', 100);
          if (success) {
            toast.success('Word document downloaded!');
            setShowExportSheet(false);
            incrementPositiveActions();
          }
          return;
        }

        // LaTeX export
        if (type === 'latex') {
          const { generateLatex } = await import('@/lib/latexGenerator');
          const tex = generateLatex(currentResume);
          const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
          const fileName = `${baseName}_Resume.tex`;
          const result = await downloadFile({ blob, fileName });
          if (result.success) toast.success('LaTeX source downloaded!');
          setShowExportSheet(false);
          return;
        }

        // JSON backup export
        if (type === 'json') {
          const json = JSON.stringify(currentResume, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const fileName = `${baseName}_Backup.json`;
          const result = await downloadFile({ blob, fileName });
          if (result.success) toast.success('JSON backup downloaded!');
          setShowExportSheet(false);
          return;
        }

        // 4K Image export
        if (type === 'image') {
          onProgress('preparing', 10);
          const { captureWithRetry, convertSvgsToImages, tagSvgDimensions } = await import('@/lib/html2canvasRetry');
          const el = resumeRef.current;
          if (!el) { toast.error('Resume template not found'); return; }
          onProgress('finalizing', 40);
          const cleanupTags = tagSvgDimensions(el);
          const scale = 3840 / el.offsetWidth;
          const canvas = await captureWithRetry(el, { scale, backgroundColor: '#ffffff', onclone: (doc: Document) => convertSvgsToImages(doc) });
          cleanupTags();
          const { appendImageWatermark } = await import('@/lib/exportWatermark');
          const watermarkedCanvas = appendImageWatermark(canvas);
          onProgress('downloading', 80);
          const blob = await new Promise<Blob>((resolve, reject) => {
            watermarkedCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create image blob')), 'image/png');
          });
          const fileName = `${baseName}_Resume_4K.png`;
          const result = await downloadFile({ blob, fileName, mimeType: 'image/png' });
          if (result.success) toast.success('4K image downloaded!');
          onProgress('downloading', 100);
          setShowExportSheet(false);
          incrementPositiveActions();
          return;
        }

        // Text-based exports (no PDF generation needed)
        if (type === 'plain-text') {
          const { generatePlainText } = await import('@/lib/shareUtils');
          const text = generatePlainText(currentResume);
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const fileName = `${baseName}_Resume.txt`;
          const result = await downloadFile({ blob, fileName });
          if (result.success) toast.success('Plain text downloaded!');
          setShowExportSheet(false);
          return;
        }

        if (type === 'linkedin') {
          const { generateLinkedInFormat } = await import('@/lib/shareUtils');
          const sections = generateLinkedInFormat(currentResume);
          const fullText = `=== ABOUT ===\n${sections.about}\n\n=== EXPERIENCE ===\n${sections.experience}\n\n=== EDUCATION ===\n${sections.education}\n\n=== SKILLS ===\n${sections.skills}`;
          await navigator.clipboard.writeText(fullText);
          toast.success('LinkedIn format copied to clipboard!');
          setShowExportSheet(false);
          return;
        }

        if (type === 'share-link') {
          const { shareAsLink } = await import('@/lib/shareUtils');
          if (currentResume.id) {
            await shareAsLink(currentResume.id);
          } else {
            toast.error('Save your resume first to generate a share link');
          }
          setShowExportSheet(false);
          return;
        }

        const pageFormat = (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
        let pdfBlob: Blob;
        let fileName: string;

        switch (type) {
          case 'cover-letter': {
            if (!generatedCoverLetter) {toast.error('Generate a cover letter first');return;}
            const { generateCoverLetterNativePDF } = await import('@/lib/nativePdfGenerator');
            pdfBlob = await generateCoverLetterNativePDF(generatedCoverLetter, currentResume.contactInfo, { pageFormat, ...pdfOptions, onProgress });
            fileName = `${baseName}_Cover_Letter.pdf`;
            break;
          }

          case 'ats-pdf': {
            const { generateNativePDF: nativePdf } = await import('@/lib/nativePdfGenerator');
            const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
            if (!templateEl) { toast.error('Resume preview not visible'); return; }
            pdfBlob = await nativePdf(templateEl, { pageFormat, atsMode: true, showPageNumbers: false, showBranding: true, onProgress });
            fileName = `${baseName}_Resume_ATS.pdf`;
            break;
          }

          case 'combined': {
            if (!generatedCoverLetter) {toast.error('Generate a cover letter first');return;}
            const { generateNativePDF: nativePdf, generateCoverLetterNativePDF, mergePDFBlobs } = await import('@/lib/nativePdfGenerator');
            const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
            if (!templateEl) { toast.error('Resume preview not visible'); return; }
            onProgress('capturing', 20);
            const coverBlob = await generateCoverLetterNativePDF(generatedCoverLetter, currentResume.contactInfo, { pageFormat, showPageNumbers: false, showBranding: true });
            onProgress('capturing', 40);
            const customBreakPositions = currentResume.customization?.customBreakPositions;
            const resumeBlob = await nativePdf(templateEl, {
              pageFormat,
              showPageNumbers: false,
              showBranding: true,
              onProgress,
              ...(customBreakPositions?.length ? { customBreakPositions } : {}),
            });
            onProgress('finalizing', 90);
            pdfBlob = await mergePDFBlobs(coverBlob, resumeBlob);
            fileName = `${baseName}_Application_Package.pdf`;
            break;
          }

          case 'one-page': {
            const { generateNativePDF: nativePdf } = await import('@/lib/nativePdfGenerator');
            const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
            if (!templateEl) { toast.error('Resume preview not visible'); return; }
            pdfBlob = await nativePdf(templateEl, { pageFormat, onePage: true, showPageNumbers, showBranding, onProgress });
            fileName = `${baseName}_Resume_OnePage.pdf`;
            break;
          }

          case 'resume':
          default: {
            const { generateNativePDF: nativePdf } = await import('@/lib/nativePdfGenerator');
            const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
            if (!templateEl) { toast.error('Resume preview not visible'); return; }
            const customBreakPositions = currentResume.customization?.customBreakPositions;
            pdfBlob = await nativePdf(templateEl, {
              pageFormat,
              showPageNumbers,
              showBranding,
              onProgress,
              ...(customBreakPositions?.length ? { customBreakPositions } : {}),
            });
            fileName = `${baseName}_Resume.pdf`;
            break;
          }
        }

        onProgress('downloading', 95);
        const result = await downloadFile({ blob: pdfBlob, fileName, mimeType: 'application/pdf' });

        if (result.cancelled) {
          toast.info('Download cancelled. Tap download again to save your PDF.');
          return;
        }

        if (result.success) {
          const successMessages: Record<string, string> = {
            'resume': 'Resume downloaded!',
            'cover-letter': 'Cover letter downloaded!',
            'combined': 'Application package downloaded!',
            'one-page': 'One-page resume downloaded!',
            'docx': 'Word document downloaded!',
            'ats-pdf': 'ATS-optimized PDF downloaded!',
            'linkedin': 'LinkedIn format copied!',
            'plain-text': 'Plain text downloaded!',
            'share-link': 'Share link generated!',
            'json': 'JSON backup downloaded!',
            'image': '4K image downloaded!',
          };
          toast.success(successMessages[type]);
          if (result.method === 'data-url' || result.method === 'open') {
            toast.info('If the file did not save, use the share icon to "Save to Files"', { duration: 6000 });
          }
        }

        onProgress('downloading', 100);
        setShowExportSheet(false);
        incrementPositiveActions();

        setTimeout(() => {
          if (shouldPromptForRating()) {
            toast('Enjoying WiseResume?', {
              description: 'Send quick feedback to help us improve.',
              duration: 8000,
              action: { label: 'Feedback', onClick: openFeedback },
              cancel: { label: 'Later', onClick: dismissRating }
            });
          }
        }, 1500);

      } catch (error) {
        // PDF renderer not configured — fall back to browser print-to-PDF,
        // the same way EditorPage.tsx handles this (see EditorPage line ~384).
        if (error instanceof PDFServerUnavailableError) {
          toast.error('PDF export is not available right now. Please try again later or use DOCX export.');
          return;
        }

        attempt++;
        const isPdfError = error instanceof PdfGenerationError;
        const errMsg = error instanceof Error ? error.message : '';
        const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('jwt expired');

        if (is401) {
          toast.error('Session expired — please sign in again to generate this export.');
          return;
        }

        const errorMessage = isPdfError && error.code === 'EMPTY_CANVAS' ?
        'Empty canvas captured. Ensure the resume preview is visible.' :
        isPdfError && error.code === 'MISSING_ELEMENT' ?
        'Resume template not found. Please go back and try again.' :
        isPdfError && error.code === 'TRUNCATED_CANVAS' ?
        'Resume content was partially captured. Scroll the preview into view and try again.' :
        'Failed to generate PDF.';

        if (attempt < MAX_RETRIES && isPdfError && error.code !== 'MISSING_ELEMENT') {
          toast.error(`${errorMessage} Retrying... (${attempt}/${MAX_RETRIES})`, { duration: 3000 });
          await new Promise((r) => setTimeout(r, 500));
          return tryExport();
        }

        toast.error(errorMessage, {
          action: attempt >= MAX_RETRIES ? { label: 'Retry', onClick: () => handleExport(type, showPageNumbers, showBranding) } : undefined
        });
      }
    };

    try {
      await tryExport();
    } finally {
      setIsGenerating(false);
      setTimeout(() => resetProgress(), 600);
    }
  };

  const handleQuickDownload = async () => {
    const { pdfDefaults } = useSettingsStore.getState();
    await handleExport('resume', pdfDefaults.showPageNumbers ?? true, pdfDefaults.showBranding ?? true);
  };

  const handleSaveToFiles = async () => {
    setIsGenerating(true);
    try {
      const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
      const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
      if (!templateEl) { toast.error('Resume preview not visible'); return; }
      const pageFormat = (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
      const customBreakPositions = currentResume.customization?.customBreakPositions;
      const pdfBlob = await generateNativePDF(templateEl, {
        pageFormat,
        showPageNumbers: true,
        showBranding: true,
        ...(customBreakPositions?.length ? { customBreakPositions } : {}),
      });
      const fileName = `${currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        toast.info('Choose "Save to Files" from the menu', { duration: 5000 });
        await navigator.share({ files: [file], title: fileName });
        toast.success('Resume saved!');
      } else {
        toast.error('Save to Files is not supported on this device');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.info('Cancelled. Tap again to save.');
      } else if (err instanceof PDFServerUnavailableError) {
        toast.error('PDF export is not available right now. Please try again later or use DOCX export.');
      } else {
        toast.error('Failed to save. Try downloading instead.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
        const templateEl = resumeRef.current ?? (document.querySelector('[data-resume-template]') as HTMLElement | null);
        if (!templateEl) { toast.error('Resume preview not visible'); return; }
        const pageFormat = (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
        const customBreakPositions = currentResume.customization?.customBreakPositions;
        const pdfBlob = await generateNativePDF(templateEl, {
          pageFormat,
          showPageNumbers: true,
          showBranding: true,
          ...(customBreakPositions?.length ? { customBreakPositions } : {}),
        });
        const file = new File([pdfBlob], 'Resume.pdf', { type: 'application/pdf' });
        await navigator.share({ title: 'My Resume', files: [file] });
      } catch {
        toast.error('Failed to share. Try downloading instead.');
      }
    } else {
      toast.info('Share not supported. Downloading instead.');
      handleQuickDownload();
    }
  };

  const safeTemplateId = templateComponentMap[selectedTemplate] ? selectedTemplate : migrateTemplateId(selectedTemplate);
  const TemplateComponent = templateComponentMap[safeTemplateId] ?? templateComponentMap['modern'];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2 pt-safe">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-page-title truncate">Preview</h1>
        </div>
      </header>

        {/* Template Compact Switcher */}
        <div className="border-b border-border shrink-0 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {templates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowTemplateSheet(true)}
            >
              <Palette className="w-3.5 h-3.5" />
              Change
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span ref={pageCountBadgeRef} className="inline-flex">
              <PageCountBadge
                pageCount={pageCount}
                showPulse={showPageCutHintPulse}
                onClick={() => {
                  setPageBreakTemplateEl(resolvePageBreakTemplate(resumeRef));
                  setPageBreakOpen(true);
                }}
              />
            </span>
            <PageCutHint anchorRef={pageCountBadgeRef} />
            <div className="flex items-center gap-1.5 text-xs">
              <Check className="w-3.5 h-3.5 text-success" />
              <span className="text-success font-medium">ATS-Ready</span>
            </div>
          </div>
        </div>

        {/* AI Tailor Hint Banner — hidden on mobile to keep preview immediately visible */}
        <div className="hidden sm:block">
          <NextStepBanner variant="tailor" onAction={() => navigate('/editor?openTailor=1')} />
        </div>

        {/* Auto-export fallback: shown when the browser blocks a programmatic download in a
            fresh tab (e.g. resumeRef not yet attached). User clicks to trigger the same export. */}
        {autoExportFallback && (
          <div className="shrink-0 px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Your file is ready to download.</span>
            <Button
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => {
                const a = autoExportFallback;
                setAutoExportFallback(null);
                if (a === 'ats-pdf') handleExport('ats-pdf', false);
                else if (a === 'docx') handleExport('docx', true);
                else handleExport('resume', true);
              }}
            >
              {autoExportFallback === 'ats-pdf' ? 'Download ATS PDF' :
               autoExportFallback === 'docx' ? 'Download DOCX' : 'Download PDF'}
            </Button>
          </div>
        )}

        {/* Preview area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto p-1 sm:p-4 bg-muted/30">
          <PreviewScaledWrapper
            resumeRef={resumeRef}
            scrollContainerRef={scrollContainerRef}
            isGenerating={isGenerating}
            previewScale={previewScale}
            setPreviewScale={setPreviewScale}
            pageWidth={previewDims.pageWidth}
            pageHeight={previewDims.pageHeight}
          >
            <Suspense fallback={<TemplateSkeleton />}>
              {/*
                The page-level `if (!currentResume) return <TemplateSkeleton />`
                guard above already covers the "store not hydrated yet" case.
                Do NOT add a `currentResume.sections != null` check here —
                ResumeData has no `sections` field (data lives in `experience`,
                `education`, `skills`, etc.), so any such guard is permanently
                false and traps the preview on the skeleton, breaking PDF
                download via the auto-export effect.
              */}
              <TemplateComponent
                resume={currentResume}
                accentColor={currentResume.customization?.accentColor}
              />
            </Suspense>
          </PreviewScaledWrapper>
        </div>

        {/* Bottom actions */}
        <motion.div
        className="shrink-0 px-3 py-2 sm:p-4 bg-background/95 backdrop-blur-sm border-t border-border space-y-1.5 sm:space-y-2 pl-[10px] pr-[10px] pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] pt-1 mb-0 mt-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}>

          <div className="gap-2 flex flex-row pl-[5px] pt-[2px] pb-[2px] pr-[5px] mb-0 mt-0 ml-px mr-px">
            <Button
            size="default"
            className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-semibold gradient-primary touch-manipulation shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
            onClick={() => setShowExportSheet(true)}
            disabled={isGenerating}>
              <FileDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Export Options
            </Button>
            <Button
            size="default"
            variant="outline"
            className="h-10 sm:h-12 px-3 sm:px-4 touch-manipulation gap-1.5"
            onClick={handleQuickDownload}
            disabled={isGenerating}
            title="Quick PDF download">
              {isGenerating ? (
                <MiniSpinner size={16} />
              ) : (
                <>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs font-medium hidden sm:inline">PDF</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Button
            variant="outline"
            size="sm"
            className="w-auto px-2.5 h-11 sm:h-11 touch-manipulation"
            onClick={() => navigate('/editor')}>

              <span className="text-xs sm:text-sm">Edit</span>
            </Button>
            {isIOS &&
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={handleSaveToFiles}
            disabled={isGenerating}>

                <FolderDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                <span className="text-xs sm:text-sm">Save</span>
              </Button>
          }
            <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={() => navigate('/interview')}>

              <Mic className="sm:w-4 sm:h-4 mr-1 sm:mr-1.5 w-[20px] h-[20px]" />
              <span className="text-xs sm:text-sm">Interview</span>
            </Button>
            <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={() => setShowShareSheet(true)}>

              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="text-xs sm:text-sm">Share</span>
            </Button>
          </div>
        </motion.div>

      {/* Sheets - lazy loaded */}
      <Suspense fallback={null}>
        {showExportSheet &&
        <ExportOptionsSheet
          open={showExportSheet}
          onOpenChange={setShowExportSheet}
          hasCoverLetter={!!generatedCoverLetter}
          coverLetterContext={coverLetterJobContext}
          onExport={handleExport}
          isExporting={isGenerating}
          templateElement={resumeRef.current}
          exportProgress={exportProgress}
          resumeName={currentResume?.contactInfo?.fullName || 'Resume'}
          templateName={templates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate}
          templateAtsScore={templates.find((t) => t.id === selectedTemplate)?.atsScore as 'high' | 'medium' | 'low' | undefined}
          resumeData={currentResume}
          selectedTemplate={selectedTemplate} />

        }
        {showOnePageWizard &&
        <OnePageWizardSheet
          open={showOnePageWizard}
          onOpenChange={setShowOnePageWizard}
        />

        }
        {showPhotoSheet &&
        <ResumePhotoSheet
          open={showPhotoSheet}
          onOpenChange={setShowPhotoSheet}
          profilePhotoUrl={profile?.avatarUrl || null}
          resumeId={currentResume?.id}
          onUseProfilePhoto={handleUseProfilePhoto}
          onUploadPhoto={handleUploadPhoto}
          onKeepInitials={handleKeepInitials} />

        }
        {showShareSheet && currentResume &&
        <ShareSheet
          open={showShareSheet}
          onOpenChange={setShowShareSheet}
          resume={currentResume}
          templateId={selectedTemplate}
          templateName={templates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate}
          resumeRef={resumeRef} />

        }
        <TemplateSelector
          open={showTemplateSheet}
          onOpenChange={setShowTemplateSheet}
        />
        <PageBreakSetupDialog
          open={pageBreakOpen}
          onOpenChange={(open) => {
            if (open) {
              setPageBreakTemplateEl(resolvePageBreakTemplate(resumeRef));
            }
            setPageBreakOpen(open);
          }}
          templateElement={pageBreakTemplateEl}
          resumeData={currentResume}
        />
      </Suspense>
    </div>);

}
