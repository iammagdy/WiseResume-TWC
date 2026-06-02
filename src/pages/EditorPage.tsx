import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import type { ImperativePanelGroupHandle } from 'react-resizable-panels';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { preloadLazy } from '@/lib/preloadLazy';
import { logAudit } from '@/lib/auditLogger';
import {
  readEditorSession,
  writeEditorSession,
  clearEditorSession,
  isValidEditorSheetId,
} from '@/lib/editorSession';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Sparkles, BarChart3, Scissors, ArrowLeft, Clock, AlertTriangle, Undo2, Redo2, FileDown, Palette, ChevronLeft, ChevronRight, Download, LayoutGrid, Star } from 'lucide-react';
import { useAIEnhancingStore } from '@/store/aiEnhancingStore';
import { useIsMobile, EDITOR_MOBILE_BREAKPOINT } from '@/hooks/use-mobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EditorNavRail } from '@/components/editor/EditorNavRail';
import { EditorSuggestionsPanel } from '@/components/editor/EditorSuggestionsPanel';
import '@/components/editor/editor-workspace.css';
import { LivePreviewPanel } from '@/components/editor/LivePreviewPanel';
import { EditorResumeStrengthBar } from '@/components/editor/EditorResumeStrengthBar';
import { StyleCustomizationPanel } from '@/components/editor/StyleCustomizationPanel';
import { useResumeStore, useResumeStoreHydration } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations, useResume } from '@/hooks/useResumes';
import { toast } from 'sonner';
const ATSScanSheet = lazyWithRetry(() => import('@/components/editor/ATSScanSheet').then(m => ({ default: m.ATSScanSheet })));
const ResumeSnapshotsSheet = lazyWithRetry(() => import('@/components/editor/ResumeSnapshotsSheet').then(m => ({ default: m.ResumeSnapshotsSheet })));
const KeywordHighlighterSheet = lazyWithRetry(() => import('@/components/editor/KeywordHighlighterSheet').then(m => ({ default: m.KeywordHighlighterSheet })));

// Lazy-loaded sheet components (only loaded when opened)
const JobAnalysisSheet = lazyWithRetry(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TemplateSelector = lazyWithRetry(() => import('@/components/editor/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const TailorSheet = lazyWithRetry(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazyWithRetry(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazyWithRetry(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazyWithRetry(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
// Smart Fit (default targetPages=1) replaces the old One-Page Wizard at this entry point.
const OnePageWizardSheet = lazyWithRetry(() => import('@/components/editor/ai/SmartFitWizardSheet').then(m => ({ default: m.SmartFitWizardSheet })));
const AgenticChatSheet = lazyWithRetry(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazyWithRetry(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
const VersionHistorySheet = lazyWithRetry(() => import('@/components/editor/VersionHistorySheet').then(m => ({ default: m.VersionHistorySheet })));
const ContentLibrarySheet = lazyWithRetry(() => import('@/components/editor/ContentLibrarySheet').then(m => ({ default: m.ContentLibrarySheet })));
// CustomizeSheet removed — StyleCustomizationPanel is now the sole customize entry point
const ShareSheet = lazyWithRetry(() => import('@/components/editor/ShareSheet').then(m => ({ default: m.ShareSheet })));
const ExportOptionsSheet = lazyWithRetry(() => import('@/components/editor/ExportOptionsSheet').then(m => ({ default: m.ExportOptionsSheet })));
const ATSParserPreview = lazyWithRetry(() => import('@/components/editor/ATSParserPreview'));
import { useShallow } from 'zustand/react/shallow';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { KeyboardToolbar } from '@/components/editor/KeyboardToolbar';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Target } from 'lucide-react';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useExportProgress } from '@/hooks/useExportProgress';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { ExportType, SectionId } from '@/types/resume';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { migrateTemplateId } from '@/lib/templateMigration';
import { getBackRoute } from '@/lib/navigation';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { useBackButton } from '@/hooks/useBackButton';
import { useEditorHydration } from '@/hooks/useEditorHydration';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import { useEditorSectionScores } from '@/hooks/useEditorSectionScores';
import { useEditorSheets } from '@/hooks/useEditorSheets';
import { useATSSuggestions } from '@/hooks/useATSSuggestions';
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProfileImportSheet, type ProfileData } from '@/components/settings/ProfileImportSheet';
import { EditorSectionContent, SectionNavButtons } from '@/components/editor/EditorSectionContent';
import { EditorScrollForm } from '@/components/editor/EditorScrollForm';
import { EditorSkeleton } from '@/components/layout/PageSkeletons';
import { useTierGate } from '@/hooks/useTierGate';
import { UpgradeDialog } from '@/components/plan/UpgradeDialog';
import { useChatTriggerStore } from '@/store/chatTriggerStore';
export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const storeHydrated = useResumeStoreHydration();
  const { hasSeenAIIntro, setHasSeenAIIntro, defaultResumeId } = useSettingsStore();
  const { gate, triggerGate, dialogOpen: tierGateOpen, dialogState: tierGateState, closeDialog: closeTierGate, isPro, isLoading: planLoading } = useTierGate();
  const [templateBtnSeen, setTemplateBtnSeen] = useState(() => localStorage.getItem('template_btn_seen') === 'true');

  // Use shallow selector to prevent unnecessary re-renders when unrelated store parts change
  const {
    currentResume,
    currentResumeId,
    matchScore,
    jobDescription,
    selectedTemplate,
    isSaving,
    lastSavedAt,
    setIsSaving,
    setLastSavedAt,
    setCurrentResumeId,
  } = useResumeStore(useShallow(state => ({
    currentResume: state.currentResume,
    currentResumeId: state.currentResumeId,
    matchScore: state.matchScore,
    jobDescription: state.jobDescription,
    selectedTemplate: state.selectedTemplate,
    isSaving: state.isSaving,
    lastSavedAt: state.lastSavedAt,
    setIsSaving: state.setIsSaving,
    setLastSavedAt: state.setLastSavedAt,
    setCurrentResumeId: state.setCurrentResumeId,
  })));

  // Validate that the resume ID exists in the database
  const { data: resumeFromDb, isLoading: isValidating } = useResume(currentResumeId);
  const { updateResume, createResume } = useResumeMutations();

  // Audit: track session duration
  const sessionStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (!currentResumeId || !currentResume) return;
    sessionStartRef.current = Date.now();
    return () => {
      if (sessionStartRef.current) {
        const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
        logAudit('account', 'editor_session_ended', {
          resumeId: currentResumeId,
          durationSeconds,
        });
      }
    };
  }, [currentResumeId]);

  // Track last saved version to detect changes (declared here so both hooks share it)
  const lastSavedResumeRef = useRef<string>('');
  const isSavingRef = useRef(false);
  // Track AI loading state to coordinate with autosave
  const isAILoadingRef = useRef(false);

  // Read ?id= or ?resumeId= from the URL and seed the store on first mount.
  // This lets users deep-link directly to /editor?id=<uuid> without a prior
  // dashboard visit that would normally call setCurrentResumeId.
  useEffect(() => {
    const urlId = searchParams.get('id') ?? searchParams.get('resumeId');
    if (urlId && urlId !== currentResumeId) {
      setCurrentResumeId(urlId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook 1: DB→Zustand hydration, ownership check, stale-resume detection
  const { localLoadedAtRef } = useEditorHydration({
    resumeFromDb,
    currentResumeId,
    user,
    setCurrentResumeId,
    navigate,
    lastSavedResumeRef,
    isSavingRef,
  });

  // Safety timeout: if no resume after 8s, bail out (independent of storeHydrated)
  useEffect(() => {
    if (currentResume) return;
    const timer = setTimeout(() => {
      if (!useResumeStore.getState().currentResume) {
        useResumeStore.getState().setCurrentResumeId(null);
        toast.error('Could not load resume — please try again.', { duration: 4000 });
        navigate('/dashboard', { replace: true });
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [currentResume, navigate]);

  const { isSyncing } = useOfflineSync();
  const addPendingChange = useOfflineSyncStore(s => s.addPendingChange);
  const pendingCountForResume = useOfflineSyncStore(
    s => s.pendingChanges.filter(c => c.resumeId === currentResumeId).length
  );

  const sheets = useEditorSheets();
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('contact');
  // experience level determines section order: 'student' puts education before experience
  const [educationFirst, setEducationFirst] = useState(false);
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [moreSubSection, setMoreSubSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= EDITOR_MOBILE_BREAKPOINT) {
      const stored = localStorage.getItem('wr-live-preview');
      return stored === null ? true : stored === 'true';
    }
    return false;
  });
  const [showATSBadge, setShowATSBadge] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [toolsSubView, setToolsSubView] = useState<'list' | 'ats-scan'>('list');
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Chat trigger store — ExperienceSection (and other deep components) write here to open chat
  const { pendingPrompt, clearPendingPrompt } = useChatTriggerStore();
  useEffect(() => {
    if (!pendingPrompt) return;
    setChatInitialMessage(pendingPrompt);
    sheets.open('chat');
    clearPendingPrompt();
  }, [pendingPrompt, clearPendingPrompt, sheets.open]);

  const handleQuickDownload = useCallback(async () => {
    if (!currentResume) return;
    haptics.medium();
    setIsQuickDownloading(true);
    try {
      const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const templateEl = document.querySelector('[data-resume-template]') as HTMLElement | null;
      if (!templateEl) throw new Error('Resume template not visible');
      const customBreakPositions = currentResume.customization?.customBreakPositions;
      const pdfBlob = await generateNativePDF(templateEl, {
        pageFormat: (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4',
        showPageNumbers: true,
        showBranding: true,
        ...(customBreakPositions?.length ? { customBreakPositions } : {}),
      });
      const fileName = `${sanitizeFileName(currentResume.contactInfo?.fullName ?? '')}_Resume.pdf`;
      await downloadFile({ blob: pdfBlob, fileName, mimeType: 'application/pdf' });
      haptics.success();
      toast.success('PDF downloaded');
    } catch {
      haptics.error();
      toast.error('Download failed');
    } finally {
      setIsQuickDownloading(false);
    }
  }, [currentResume, selectedTemplate]);

  const { exportProgress, onProgress, reset: resetExportProgress } = useExportProgress();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (type: ExportType, showPageNumbers: boolean, showBranding = true, customFileName?: string) => {
    if (!currentResume) return;
    setIsExporting(true);
    resetExportProgress();
    haptics.medium();

    const MAX_RETRIES = 2;
    let attempt = 0;

    const tryExport = async (): Promise<void> => {
      try {
        const baseName = customFileName?.trim()
          ? sanitizeFileName(customFileName)
          : sanitizeFileName(currentResume.contactInfo?.fullName ?? '');
        const pdfOptions = { showPageNumbers, pageNumberFormat: 'full' as const, showBranding };
        const { downloadFile } = await import('@/lib/downloadUtils');

        if (type === 'docx') {
          onProgress('preparing', 10); onProgress('finalizing', 50);
          const { generateAndDownloadDOCX } = await import('@/lib/docxGenerator');
          const success = await generateAndDownloadDOCX(currentResume);
          onProgress('downloading', 100);
          if (success) { toast.success('Word document downloaded!'); setShowExport(false); }
          return;
        }

        if (type === 'latex') {
          const { generateLatex } = await import('@/lib/latexGenerator');
          const tex = generateLatex(currentResume);
          const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
          const result = await downloadFile({ blob, fileName: `${baseName}_Resume.tex` });
          if (result.success) toast.success('LaTeX source downloaded!');
          setShowExport(false); return;
        }

        if (type === 'json') {
          const blob = new Blob([JSON.stringify(currentResume, null, 2)], { type: 'application/json' });
          const result = await downloadFile({ blob, fileName: `${baseName}_Backup.json` });
          if (result.success) toast.success('JSON backup downloaded!');
          setShowExport(false); return;
        }

        if (type === 'plain-text') {
          const { generatePlainText } = await import('@/lib/shareUtils');
          const blob = new Blob([generatePlainText(currentResume)], { type: 'text/plain;charset=utf-8' });
          const result = await downloadFile({ blob, fileName: `${baseName}_Resume.txt` });
          if (result.success) toast.success('Plain text downloaded!');
          setShowExport(false); return;
        }

        if (type === 'linkedin') {
          const { generateLinkedInFormat } = await import('@/lib/shareUtils');
          const sections = generateLinkedInFormat(currentResume);
          const text = `=== ABOUT ===\n${sections.about}\n\n=== EXPERIENCE ===\n${sections.experience}\n\n=== EDUCATION ===\n${sections.education}\n\n=== SKILLS ===\n${sections.skills}`;
          await navigator.clipboard.writeText(text);
          toast.success('LinkedIn format copied to clipboard!');
          setShowExport(false); return;
        }

        if (type === 'share-link') {
          const { shareAsLink } = await import('@/lib/shareUtils');
          if (currentResume.id) { await shareAsLink(currentResume.id); }
          else { toast.error('Save your resume first to generate a share link'); }
          setShowExport(false); return;
        }

        if (type === 'image') {
          onProgress('preparing', 10);
          const { captureWithRetry, convertSvgsToImages, tagSvgDimensions } = await import('@/lib/html2canvasRetry');
          const el = document.querySelector('[data-resume-template]') as HTMLElement;
          if (!el) { toast.error('Resume preview not visible. Open Live Preview and try again.'); return; }
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
          const result = await downloadFile({ blob, fileName: `${baseName}_Resume_4K.png`, mimeType: 'image/png' });
          if (result.success) toast.success('4K image downloaded!');
          onProgress('downloading', 100); setShowExport(false); return;
        }

        const pageFormat = (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
        let pdfBlob: Blob; let fileName: string;
        const templateEl = document.querySelector('[data-resume-template]') as HTMLElement | null;
        const templateId = migrateTemplateId(selectedTemplate);
        const exportResumePdf = async (
          opts: Parameters<(typeof import('@/lib/nativePdfGenerator'))['generateNativePDF']>[1],
        ) => {
          const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
          if (templateEl) return generateNativePDF(templateEl, opts);
          const { exportResumePdfFromData } = await import('@/lib/exportResumePdf');
          return exportResumePdfFromData(currentResume, templateId, opts);
        };

        if (type === 'ats-pdf') {
          pdfBlob = await exportResumePdf({ pageFormat, atsMode: true, showPageNumbers: false, showBranding: true, onProgress });
          fileName = `${baseName}_Resume_ATS.pdf`;
        } else if (type === 'cover-letter') {
          const { generateCoverLetterNativePDF } = await import('@/lib/nativePdfGenerator');
          const { generatedCoverLetter } = useResumeStore.getState();
          if (!generatedCoverLetter) { toast.error('Generate a cover letter first'); return; }
          pdfBlob = await generateCoverLetterNativePDF(generatedCoverLetter, currentResume.contactInfo, { pageFormat, ...pdfOptions, onProgress });
          fileName = `${baseName}_Cover_Letter.pdf`;
        } else {
          const { generateCoverLetterNativePDF, mergePDFBlobs } = await import('@/lib/nativePdfGenerator');

          if (type === 'one-page') {
            pdfBlob = await exportResumePdf({ pageFormat, onePage: true, showPageNumbers, showBranding, onProgress });
            fileName = `${baseName}_Resume_OnePage.pdf`;
          } else if (type === 'combined') {
            const { generatedCoverLetter } = useResumeStore.getState();
            if (!generatedCoverLetter) { toast.error('Generate a cover letter first'); return; }
            onProgress('capturing', 20);
            const coverBlob = await generateCoverLetterNativePDF(generatedCoverLetter, currentResume.contactInfo, { pageFormat, showPageNumbers: false, showBranding: true });
            onProgress('capturing', 40);
            const customBreakPositions = currentResume.customization?.customBreakPositions;
            const resumeBlob = await exportResumePdf({
              pageFormat,
              showPageNumbers: false,
              showBranding: true,
              onProgress,
              ...(customBreakPositions?.length ? { customBreakPositions } : {}),
            });
            onProgress('finalizing', 90);
            pdfBlob = await mergePDFBlobs(coverBlob, resumeBlob);
            fileName = `${baseName}_Application_Package.pdf`;
          } else {
            const customBreakPositions = currentResume.customization?.customBreakPositions;
            pdfBlob = await exportResumePdf({
              pageFormat,
              showPageNumbers,
              showBranding,
              onProgress,
              ...(customBreakPositions?.length ? { customBreakPositions } : {}),
            });
            fileName = `${baseName}_Resume.pdf`;
          }
        }

        onProgress('downloading', 95);
        const result = await downloadFile({ blob: pdfBlob, fileName });
        if (result.cancelled) { toast.info('Download cancelled. Tap download again to save your PDF.'); return; }
        if (result.success) {
          const msgs: Record<string, string> = { 'resume': 'Resume downloaded!', 'cover-letter': 'Cover letter downloaded!', 'combined': 'Application package downloaded!', 'one-page': 'One-page resume downloaded!', 'ats-pdf': 'ATS-optimized PDF downloaded!' };
          toast.success(msgs[type] || 'Downloaded!');
          if (result.method === 'data-url' || result.method === 'open') toast.info('If the file did not save, use the share icon to "Save to Files"', { duration: 6000 });
        }
        onProgress('downloading', 100);
        setShowExport(false);
      } catch (error) {
        if ((error as { code?: string })?.code === 'PDF_SERVER_UNAVAILABLE') {
          toast.error('PDF export is not available right now. Please try again later or use DOCX export.');
          return;
        }
        attempt++;
        const errMsg = error instanceof Error ? error.message : '';
        const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('jwt expired');
        if (is401) { toast.error('Session expired — please sign in again.'); return; }
        if (attempt < MAX_RETRIES) {
          toast.error('Export failed. Retrying...', { duration: 3000 });
          await new Promise(r => setTimeout(r, 500));
          return tryExport();
        }
        toast.error('Export failed. Please try again.');
        haptics.error();
      }
    };

    try { await tryExport(); }
    finally { setIsExporting(false); setTimeout(() => resetExportProgress(), 600); }
  }, [currentResume, selectedTemplate, onProgress, resetExportProgress]);
  const [mobileEditorTab, setMobileEditorTab] = useState<'editor' | 'preview' | 'ats'>('editor');
  const [desktopPreviewMode, setDesktopPreviewMode] = useState<'visual' | 'ats'>('visual');
  // Desktop scrollspy: track which section is currently visible
  const [activeSection, setActiveSection] = useState('contact');
  const isMobile = useIsMobile(EDITOR_MOBILE_BREAKPOINT);
  // Track any in-flight AI enhance operations so we can block section switches
  const aiEnhancingCount = useAIEnhancingStore((s) => s.count);
  // Auto-open Tailor sheet if navigated with ?openTailor=1 or ?tailor=true.
  // Track intent with a ref so the plan gate can be applied once planLoading settles.
  const autoOpenTailorRef = useRef(false);
  const pendingPanelRef = useRef<string | null>(null);
  useEffect(() => {
    const panel = searchParams.get('panel');
    if (panel) {
      pendingPanelRef.current = panel;
      const next = new URLSearchParams(searchParams);
      next.delete('panel');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    if (searchParams.get('openTailor') === '1' || searchParams.get('tailor') === 'true') {
      autoOpenTailorRef.current = true;
      searchParams.delete('openTailor');
      searchParams.delete('tailor');
      searchParams.delete('jobTitle');
      searchParams.delete('company');
      searchParams.delete('jobCompany');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Once plan is resolved, action the queued auto-open with a plan gate check.
  useEffect(() => {
    if (!planLoading && autoOpenTailorRef.current) {
      autoOpenTailorRef.current = false;
      if (isPro) {
        sheets.open('tailor');
      } else {
        triggerGate({
          requiredPlan: 'pro',
          featureName: 'Smart Tailoring',
          description: 'Paste a job description and AI rewrites your resume to match it perfectly.',
          features: [
            'AI rewrites your resume for any job description',
            'Keyword match score to beat ATS filters',
            'Section-by-section improvement suggestions',
            'Preserve your voice while maximising relevance',
          ],
        });
      }
    }
  }, [planLoading, isPro, triggerGate]);

  // Handle guided intake params: ?experienceLevel= reorders sections; ?intakeJobTitle= queues summary stub
  useEffect(() => {
    const level = searchParams.get('experienceLevel');
    const intakeJobTitle = searchParams.get('intakeJobTitle');
    if (level) {
      // Students: education before experience in stepper
      setEducationFirst(level === 'student');
      // Navigate to summary and queue AI generation so the stub is produced automatically
      setActiveTab('summary');
      // If a job title was provided, seed it as job description context for AI tailoring
      if (intakeJobTitle) {
        useResumeStore.getState().setJobDescription(intakeJobTitle);
      }
      // Signal SummarySection to auto-trigger AI generation on mount
      useResumeStore.getState().setPendingSummaryGeneration(true);
      // Clean params
      searchParams.delete('experienceLevel');
      searchParams.delete('intakeJobTitle');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Derive section order from persisted customization.experienceLevel when editor opens
  useEffect(() => {
    if (!resumeFromDb) return;
    // Only apply if no URL param already set it (URL param takes precedence on fresh create)
    const customization = resumeFromDb.customization as Record<string, unknown> | null | undefined;
    const persistedLevel = customization?.experienceLevel;
    if (persistedLevel && !searchParams.get('experienceLevel')) {
      setEducationFirst(persistedLevel === 'student');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFromDb?.id]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const expandSectionRef = useRef<((id: string) => void) | null>(null);
  const editorPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  // react-resizable-panels can leave the preview pane at 0px on first mount inside
  // a flex layout; a layout pass after paint restores the default 55/45 split.
  useLayoutEffect(() => {
    if (authLoading || !storeHydrated || isMobile || !showPreview || !currentResume) return;
    let outer = 0;
    let inner = 0;
    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        editorPanelGroupRef.current?.setLayout([55, 45]);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [authLoading, storeHydrated, isMobile, showPreview, currentResume?.id, selectedTemplate]);

  // ───────────────── Editor session restore (per-resume) ─────────────────
  // Persists activeTab + per-tab scroll offset + open AI sheet to
  // sessionStorage so a hard refresh lands the user back where they were.
  // Honors `?fresh=1` as an escape hatch that wipes the saved session.
  const sessionRestoredRef = useRef<string | null>(null);
  const lastScrollKeyRef = useRef<string>('contact');
  // Hoisted up so the session-restore effect can suppress the mobile
  // auto-scroll-to-first-input when we restored a non-zero scroll position.
  const hasAutoScrolled = useRef(false);
  const freshLoad = searchParams.get('fresh') === '1';

  useEffect(() => {
    if (!freshLoad) return;
    if (currentResumeId) clearEditorSession(currentResumeId);
    searchParams.delete('fresh');
    setSearchParams(searchParams, { replace: true });
  }, [freshLoad, currentResumeId, searchParams, setSearchParams]);

  // The per-tab scroll key so 'more' splits per sub-section.
  const scrollKey = useMemo(
    () => (activeTab === 'more' && moreSubSection ? `more:${moreSubSection}` : activeTab),
    [activeTab, moreSubSection],
  );
  useEffect(() => {
    lastScrollKeyRef.current = scrollKey;
  }, [scrollKey]);


  // Restore once per resume id, after the resume has been hydrated and the
  // section nodes exist in the DOM. Skipped when ?fresh=1 cleared the session.
  useEffect(() => {
    if (!currentResumeId || !currentResume) return;
    if (sessionRestoredRef.current === currentResumeId) return;
    if (freshLoad) return;
    const saved = readEditorSession(currentResumeId);
    sessionRestoredRef.current = currentResumeId;
    if (!saved) return;
    if (saved.activeTab && saved.activeTab !== activeTab) {
      setActiveTab(saved.activeTab);
      setActiveSection(saved.activeTab);
    }
    if (saved.activeTab === 'more' && saved.moreSubSection) {
      setMoreSubSection(saved.moreSubSection);
    }
    if (saved.openSheet && isValidEditorSheetId(saved.openSheet)) {
      sheets.open(saved.openSheet);
    }
    // Restore scroll on the next paint, after the lazy section has mounted.
    const targetKey = saved.activeTab === 'more' && saved.moreSubSection
      ? `more:${saved.moreSubSection}`
      : saved.activeTab;
    const targetTop = saved.scrollByTab?.[targetKey] ?? 0;
    if (targetTop > 0) {
      let attempts = 0;
      const tryScroll = () => {
        const el = scrollContainerRef.current;
        if (el && el.scrollHeight > targetTop) {
          el.scrollTo({ top: targetTop, behavior: 'auto' });
          // Mobile auto-scroll-to-first-input would otherwise clobber this.
          hasAutoScrolled.current = true;
          return;
        }
        if (attempts++ < 20) requestAnimationFrame(tryScroll);
      };
      requestAnimationFrame(tryScroll);
    } else {
      // Even with no saved scroll we still want to suppress the mobile
      // first-input auto-scroll if the user was past contact/summary.
      if (saved.activeTab && saved.activeTab !== 'contact') {
        hasAutoScrolled.current = true;
      }
    }
  }, [currentResumeId, currentResume, freshLoad, sheets.open, activeTab]);

  // Persist activeTab / moreSubSection / open sheet whenever they change.
  useEffect(() => {
    if (!currentResumeId) return;
    if (sessionRestoredRef.current !== currentResumeId) return;
    writeEditorSession(currentResumeId, {
      activeTab,
      moreSubSection,
      openSheet: sheets.current,
    });
  }, [currentResumeId, activeTab, moreSubSection, sheets.current]);

  // Throttled scroll listener — capture scrollTop per active tab/sub-section.
  useEffect(() => {
    if (!currentResumeId) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    let pending = false;
    const handler = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        const top = el.scrollTop;
        if (sessionRestoredRef.current !== currentResumeId) return;
        writeEditorSession(currentResumeId, {
          scrollByTab: { [lastScrollKeyRef.current]: top },
        });
      }, 250);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [currentResumeId, scrollKey]);

  const scrollToSection = useCallback((sectionId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    expandSectionRef.current?.(sectionId);
    // Double rAF: first frame lets React flush the open-state update + CollapsibleContent render,
    // second frame lets the browser perform layout so scrollIntoView lands correctly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = container.querySelector(`[data-section-id="${sectionId}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []);

  // Called by desktop scrollspy/sidebar. Keeps activeTab in sync for preview highlight and ATS.
  // All sections are now direct top-level tabs (projects/hobbies/references included).
  const handleDesktopSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setActiveTab(sectionId);
  }, []);

  // Hook 2: debounced cloud save, conflict guard, offline queue, ATS re-score, lifecycle flush
  const resumeRef = useRef(currentResume);
  resumeRef.current = currentResume;
  const { saveToCloud } = useEditorAutosave({
    user,
    currentResumeId,
    resumeRef,
    lastSavedResumeRef,
    setIsSaving,
    setLastSavedAt,
    updateResume,
    resumeFromDb,
    localLoadedAtRef,
    isSavingRef,
    addPendingChange,
    isAILoadingRef,
  });

  // Background ATS scoring uses standalone function (no hook state to avoid re-render loops)

  // Smart tab change handler with auto-scroll.
  // Promoted sections (certifications, languages, awards, publications, volunteering) are
  // top-level tabs. Projects, hobbies, references still route through activeTab='more'.
  const handleTabChange = useCallback((newTab: string) => {
    // Block section switching while any AI enhance operation is in-flight to
    // prevent unmounting the section mid-enhance and losing the dialog state.
    if (useAIEnhancingStore.getState().count > 0) {
      toast.info('AI is still working — please wait before switching sections.', { duration: 2000, id: 'ai-section-lock' });
      return;
    }
    // All sections are now direct top-level tabs; clear moreSubSection on every change.
    setMoreSubSection(null);
    setActiveTab(newTab);
    haptics.light();
    // Scroll content to top smoothly when switching tabs
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // (query-completion redirect removed — handled by inline guards + safety timeout)

  // Show AI intro for first-time users after resume loads
  useEffect(() => {
    if (currentResumeId && !hasSeenAIIntro) {
      // Small delay to let the editor render first
      const timer = setTimeout(() => {
        setShowAIIntro(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentResumeId, hasSeenAIIntro]);

  const handleDismissAIIntro = useCallback(() => {
    setShowAIIntro(false);
    setHasSeenAIIntro(true);
  }, [setHasSeenAIIntro]);

  // Auto-scroll to first form field on mobile after initial load.
  // (`hasAutoScrolled` is declared earlier so session restore can suppress this.)
  useEffect(() => {
    if (!isMobile || !currentResume || hasAutoScrolled.current) return;
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      // Skip if the user already focused a field (e.g. tapped before this fires).
      if (container.contains(document.activeElement) && document.activeElement !== container) return;
      const firstInput = container.querySelector('input, textarea');
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasAutoScrolled.current = true;
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isMobile, currentResume]);



  // Network status for enhanced save indicator
  const { isOnline } = useNetworkStatus();

  // Undo/Redo system
  const { canUndo, canRedo, undoDescription, redoDescription, undo, redo } = useUndoRedo(currentResume);



  const handleUndo = useCallback(() => {
    const snapshot = undo();
    if (snapshot) {
      useResumeStore.getState().setCurrentResume(snapshot);
      toast(`Undo: ${undoDescription}`, { duration: 1500 });
    }
  }, [undo, undoDescription]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) {
      useResumeStore.getState().setCurrentResume(snapshot);
      toast(`Redo: ${redoDescription}`, { duration: 1500 });
    }
  }, [redo, redoDescription]);

  // Keyboard shortcuts
  const [showExport, setShowExport] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  useEffect(() => {
    const panel = pendingPanelRef.current;
    if (!panel || !currentResume) return;
    pendingPanelRef.current = null;
    if (panel === 'customize') {
      setShowStylePanel(true);
    } else if (panel === 'content-library') {
      sheets.open('contentLibrary');
    }
  }, [currentResume, sheets]);
  useEditorShortcuts({
    onSave: saveToCloud,
    onExport: () => setShowExport(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    resumeId: currentResumeId,
  });

  // Unsaved-changes warning, refresh-aware.
  // We still want the browser's native prompt when the user is genuinely
  // leaving the editor (closing the tab, navigating to an external URL),
  // because in those cases editor session restore won't help — they're
  // gone. We *don't* want it on a refresh, because:
  //   1. autosave + the offline write queue + Zustand persistence make
  //      a refresh non-destructive,
  //   2. the editor session restore (above) puts the user back exactly
  //      where they were, and
  //   3. the prompt blocks Phase 9's silent stale-chunk recovery.
  // We detect refresh intent via F5 / Ctrl+R / Cmd+R keypresses and
  // suppress the prompt for a short window after one fires. The browser
  // refresh button is not detectable from JS, but the keyboard shortcut
  // is by far the dominant refresh path, and the post-refresh restore
  // means the worst case for an undetected refresh is the same prompt
  // users have always seen.
  const refreshIntentRef = useRef(0);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isF5 = e.key === 'F5';
      const isReloadShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R');
      if (isF5 || isReloadShortcut) {
        refreshIntentRef.current = Date.now();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // If a refresh keypress happened in the last 2 s, treat as refresh.
      if (Date.now() - refreshIntentRef.current < 2000) return;
      const current = JSON.stringify(resumeRef.current);
      if (current !== lastSavedResumeRef.current && lastSavedResumeRef.current !== '') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  // In-app navigation guard (custom, no useBlocker)
  const unsavedGuard = useUnsavedChangesGuard({
    resumeRef,
    lastSavedResumeRef,
    saveToCloud,
  });

  // Hardware back button guard (web no-op; native handled by Expo app)
  useBackButton(
    useCallback(() => {
      if (unsavedGuard.isDirty()) {
        unsavedGuard.interceptNavigate('/dashboard');
        return true;
      }
      return false;
    }, [unsavedGuard])
  );

  // Auto-hide "Saved" indicator after 2s
  const [showSavedCheck, setShowSavedCheck] = useState(false);
  const prevIsSaving = useRef(false);

  // Dirty flag: set when currentResume changes after initial load, cleared on save
  // This avoids expensive JSON.stringify on every keystroke for the UI indicator
  const isDirtyRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (!currentResume) return;
    if (!initialLoadDoneRef.current) {
      // Skip the first load (hydration from DB)
      initialLoadDoneRef.current = true;
      return;
    }
    isDirtyRef.current = true;
  }, [currentResume]);
  // Clear dirty flag when save completes
  useEffect(() => {
    if (prevIsSaving.current && !isSaving) {
      isDirtyRef.current = false;
    }
  }, [isSaving]);

  // Derived: unsaved changes exist (between edits and save debounce)
  const hasUnsavedChanges = useMemo(() => {
    if (!currentResume || !lastSavedResumeRef.current) return false;
    if (isSaving || showSavedCheck) return false;
    return isDirtyRef.current;
  }, [currentResume, isSaving, showSavedCheck]);
  useEffect(() => {
    if (prevIsSaving.current && !isSaving) {
      setShowSavedCheck(true);
      const timer = setTimeout(() => setShowSavedCheck(false), 2000);

      // One-time autosave reassurance toast for new users
      const AUTOSAVE_TOAST_KEY = 'wr-autosave-seen';
      try {
        if (!localStorage.getItem(AUTOSAVE_TOAST_KEY)) {
          localStorage.setItem(AUTOSAVE_TOAST_KEY, '1');
          toast('Your resume saves automatically — no need to press anything', {
            duration: 4000,
            icon: '☁️',
          });
        }
      } catch { /* noop */ }

      return () => clearTimeout(timer);
    }
    prevIsSaving.current = isSaving;
  }, [isSaving]);


  // Memoize steps array – dynamically includes optional sections that have data
  // Education comes before Experience for students; otherwise standard order
  const steps = useMemo(() => {
    const base = educationFirst
      ? [
          { id: 'contact', label: 'Contact' },
          { id: 'summary', label: 'Summary' },
          { id: 'education', label: 'Education' },
          { id: 'experience', label: 'Experience' },
          { id: 'skills', label: 'Skills' },
        ]
      : [
          { id: 'contact', label: 'Contact' },
          { id: 'summary', label: 'Summary' },
          { id: 'experience', label: 'Experience' },
          { id: 'education', label: 'Education' },
          { id: 'skills', label: 'Skills' },
        ];

    // Optional sections — only appear in the sidebar when the user has added data
    const OPTIONAL_SECTIONS: { id: string; label: string; hasData: (r: typeof currentResume) => boolean }[] = [
      { id: 'certifications', label: 'Certifications', hasData: r => (r?.certifications?.length ?? 0) > 0 },
      { id: 'languages',      label: 'Languages',      hasData: r => (r?.languages?.length ?? 0) > 0 },
      { id: 'awards',         label: 'Awards',         hasData: r => (r?.awards?.length ?? 0) > 0 },
      { id: 'publications',   label: 'Publications',   hasData: r => (r?.publications?.length ?? 0) > 0 },
      { id: 'volunteering',   label: 'Volunteering',   hasData: r => (r?.volunteering?.length ?? 0) > 0 },
      { id: 'projects',       label: 'Projects',       hasData: r => (r?.projects?.length ?? 0) > 0 },
      { id: 'hobbies',        label: 'Hobbies',        hasData: r => (r?.hobbies?.length ?? 0) > 0 },
      { id: 'references',     label: 'References',     hasData: r => (r?.references?.length ?? 0) > 0 },
    ];

    for (const sec of OPTIONAL_SECTIONS) {
      if (sec.hasData(currentResume)) {
        base.push({ id: sec.id, label: sec.label });
      }
    }

    base.push({ id: 'more', label: 'More' });
    return base;
  }, [educationFirst, currentResume]);

  // availableMoreCount = how many optional sections have not yet been added (no data yet).
  // Used to show a badge/count on the "More" button in the sidebar.
  const availableMoreCount = useMemo(() => {
    const ALL_OPTIONAL_IDS = ['certifications', 'languages', 'awards', 'publications', 'volunteering', 'projects', 'hobbies', 'references'];
    const addedIds = new Set(steps.map(s => s.id));
    return ALL_OPTIONAL_IDS.filter(id => !addedIds.has(id)).length;
  }, [steps]);

  // Hook 3: section scores, completion status, celebration toasts, and confetti
  const { sectionScores, overallScore, localHealthScore, sectionStatus, justCompletedStep } = useEditorSectionScores(currentResume);

  const TAILOR_FEATURES = [
    'AI rewrites your resume for any job description',
    'Keyword match score to beat ATS filters',
    'Section-by-section improvement suggestions',
    'Preserve your voice while maximising relevance',
  ];

  const handleImproveSection = useCallback(
    gate('pro', () => sheets.open('tailor'), {
      featureName: 'Smart Tailoring',
      description: 'Paste a job description and AI rewrites your resume to match it perfectly.',
      features: TAILOR_FEATURES,
    }),
    [gate, sheets.open]
  );

  const handleBack = useCallback(() => {
    unsavedGuard.interceptNavigate(getBackRoute('/editor'));
  }, [unsavedGuard]);

  const handleChangeTemplate = useCallback(() => sheets.open('templates'), [sheets.open]);
  const handleTailor = useCallback(
    gate('pro', () => sheets.open('tailor'), {
      featureName: 'Smart Tailoring',
      description: 'Paste a job description and AI rewrites your resume to match it perfectly.',
      features: TAILOR_FEATURES,
    }),
    [gate, sheets.open]
  );
  const handleAnalyze = useCallback(() => sheets.open('jobAnalysis'), [sheets.open]);
  const handleRecruiterSim = useCallback(() => sheets.open('recruiterSim'), [sheets.open]);
  const handleAIDetector = useCallback(() => sheets.open('aiDetector'), [sheets.open]);
  const handleLinkedIn = useCallback(() => sheets.open('linkedIn'), [sheets.open]);
  const handleOnePage = useCallback(() => sheets.open('onePage'), [sheets.open]);
  const handleCareerPath = useCallback(() => sheets.open('careerPath'), [sheets.open]);
  const handleGetIdeas = useCallback(() => sheets.open('contentLibrary'), [sheets.open]);
  const handleCustomize = useCallback(() => setShowStylePanel(true), []);

  const handleMoreSectionSelect = useCallback((sectionId: string) => {
    if (useAIEnhancingStore.getState().count > 0) {
      toast.info('AI is still working — please wait before switching sections.', { duration: 2000, id: 'ai-section-lock' });
      return;
    }
    // All named sections are now direct top-level tabs.
    setMoreSubSection(null);
    setActiveTab(sectionId);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ATS Suggestions hook
  const { getSuggestions: getATSSuggestions, isAnalyzingSection, fetchDeepSuggestions, scanSummary, deepResults, clearDeepResult } = useATSSuggestions(currentResume, jobDescription);

  // Apply deep analysis result to the resume store
  const handleApplyDeep = useCallback((section: SectionId, improved: unknown) => {
    const store = useResumeStore.getState();
    const applyMap: Record<string, () => void> = {
      summary: () => { if (typeof improved === 'string') store.updateResume({ summary: improved }); },
      experience: () => { if (Array.isArray(improved)) store.updateResume({ experience: improved }); },
      education: () => { if (Array.isArray(improved)) store.updateResume({ education: improved }); },
      skills: () => { if (Array.isArray(improved)) store.updateResume({ skills: improved }); },
      certifications: () => { if (Array.isArray(improved)) store.updateResume({ certifications: improved }); },
      projects: () => { if (Array.isArray(improved)) store.updateResume({ projects: improved }); },
      awards: () => { if (Array.isArray(improved)) store.updateResume({ awards: improved }); },
      publications: () => { if (Array.isArray(improved)) store.updateResume({ publications: improved }); },
      volunteering: () => { if (Array.isArray(improved)) store.updateResume({ volunteering: improved }); },
      languages: () => { if (Array.isArray(improved)) store.updateResume({ languages: improved }); },
    };
    applyMap[section]?.();
    clearDeepResult(section);
    toast.success('AI improvements applied!');
  }, [clearDeepResult]);

  // EditorSectionContent props — used in mobile tab layout
  const editorSectionProps = {
    activeTab,
    sectionScores,
    moreSubSection,
    setMoreSubSection,
    steps,
    handleTabChange,
    jobDescription,
    getATSSuggestions,
    isAnalyzingSection,
    fetchDeepSuggestions,
    deepResults,
    handleApplyDeep,
    clearDeepResult,
    onRequestJobDescription: handleTailor,
  } as const;

  // EditorScrollForm props — used in desktop scrollable layout
  const editorScrollFormProps = {
    steps,
    sectionScores,
    moreSubSection,
    setMoreSubSection,
    jobDescription,
    getATSSuggestions,
    isAnalyzingSection,
    fetchDeepSuggestions,
    deepResults,
    handleApplyDeep,
    clearDeepResult,
    onRequestJobDescription: handleTailor,
    onActiveSectionChange: handleDesktopSectionChange,
    scrollContainerRef,
    expandSectionRef,
  } as const;

  const activeSectionSuggestions = getATSSuggestions(activeSection);
  const showSuggestionsPanel =
    !isMobile &&
    activeSection !== 'contact' &&
    activeSection !== 'more' &&
    (activeSectionSuggestions.length > 0 ||
      isAnalyzingSection(activeSection) ||
      !!deepResults[activeSection as SectionId]);

  useEffect(() => {
    setSuggestionsOpen(false);
  }, [activeSection]);

  const renderEditorFormWorkspace = () => (
    <div className="flex h-full min-h-0 overflow-hidden">
      {!isMobile && (
        <EditorNavRail
          steps={steps}
          activeSection={activeSection}
          sectionScores={sectionScores}
          completedSteps={sectionStatus}
          onSectionClick={(id) => {
            handleDesktopSectionChange(id);
            scrollToSection(id);
          }}
        />
      )}
      <div className="editor-workspace-center flex-1 min-w-0">
        <div className="editor-workspace-center__grid flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className="editor-scroll-container flex-1" ref={scrollContainerRef}>
              <EditorScrollForm key={currentResumeId ?? 'no-resume'} {...editorScrollFormProps} />
            </div>
          </div>
        </div>
        {showSuggestionsPanel && (
          <EditorSuggestionsPanel
            sectionId={activeSection}
            open={suggestionsOpen}
            onOpenChange={setSuggestionsOpen}
            getATSSuggestions={getATSSuggestions}
            isAnalyzingSection={isAnalyzingSection}
            fetchDeepSuggestions={fetchDeepSuggestions}
            deepResult={deepResults[activeSection as SectionId]}
            onApplyDeep={(improved) => handleApplyDeep(activeSection as SectionId, improved)}
            onDiscardDeep={() => clearDeepResult(activeSection as SectionId)}
            hasJobDescription={!!jobDescription?.trim()}
            onRequestJobDescription={handleTailor}
          />
        )}
      </div>
    </div>
  );

  const handleProfileImport = useCallback((data: Partial<ProfileData>) => {
    if (!currentResume) return;
    const { setCurrentResume } = useResumeStore.getState();
    const updates: Record<string, unknown> = {};
    if (data.summary) updates.summary = data.summary;
    if (Array.isArray(data.experience) && data.experience.length > 0) {
      const mapped = data.experience.map((exp) => ({
        id: crypto.randomUUID(),
        company: exp.company,
        position: exp.title,
        startDate: exp.startDate ?? '',
        endDate: exp.endDate ?? '',
        current: exp.current ?? false,
        description: exp.description ?? '',
        achievements: [],
      }));
      updates.experience = [...(currentResume.experience ?? []), ...mapped];
    }
    if (Array.isArray(data.education) && data.education.length > 0) {
      const mapped = data.education.map((edu) => ({
        id: crypto.randomUUID(),
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field ?? '',
        startDate: edu.startYear ?? '',
        endDate: edu.endYear ?? '',
        description: edu.description ?? '',
      }));
      updates.education = [...(currentResume.education ?? []), ...mapped];
    }
    if (Array.isArray(data.skills) && data.skills.length > 0) {
      const existing = new Set((currentResume.skills ?? []).map((s) => s.toLowerCase()));
      const newSkills = data.skills.filter((s) => !existing.has(s.toLowerCase()));
      if (newSkills.length > 0) updates.skills = [...(currentResume.skills ?? []), ...newSkills];
    }
    if (Array.isArray(data.languages) && data.languages.length > 0) {
      updates.languages = [...(currentResume.languages ?? []), ...data.languages];
    }
    setCurrentResume({ ...currentResume, ...updates } as typeof currentResume);
    sheets.close();
  }, [currentResume, sheets.close]);

  const handleContentInsert = useCallback((text: string) => {
    if (!currentResume) return;
    const { setCurrentResume } = useResumeStore.getState();
    if (activeTab === 'summary') {
      setCurrentResume({ ...currentResume, summary: currentResume.summary ? `${currentResume.summary}\n${text}` : text });
    } else if (activeTab === 'skills') {
      const skill = text.replace(/[{}]/g, '').trim();
      if (!currentResume.skills.includes(skill)) {
        setCurrentResume({ ...currentResume, skills: [...currentResume.skills, skill] });
      }
    } else {
      navigator.clipboard?.writeText(text);
      toast('Copied to clipboard', { duration: 1500 });
    }
  }, [currentResume, activeTab]);

  // handleCustomizeApply removed — StyleCustomizationPanel patches via updateResume directly

  // === GUARDS (all inline, no effects — deterministic) ===
  if (authLoading) return <EditorSkeleton />;
  if (!storeHydrated) return <EditorSkeleton />;
  if (!currentResumeId && !currentResume) return <Navigate to="/dashboard" replace />;
  if (!currentResume && isValidating) return <EditorSkeleton />;
  if (!currentResume && !resumeFromDb) return <EditorSkeleton />;
  if (!currentResume) return <EditorSkeleton />;
  // === Past this point, currentResume is guaranteed non-null ===

  return (
    <TooltipProvider delayDuration={300} disableHoverableContent>
    <main className="editor-workspace-root flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background">
      {/* Header */}
      <EditorHeader
        resumeTitle={resumeFromDb?.title || currentResume?.contactInfo?.fullName}
        isSyncing={isSyncing}
        canUndo={canUndo}
        canRedo={canRedo}
        undoDescription={undoDescription}
        redoDescription={redoDescription}
        isAuthenticated={!!user}
        currentResumeId={currentResumeId}
        showPreview={showPreview}
        templateBtnSeen={templateBtnSeen}
        overallScore={overallScore}
        steps={steps}
        sectionStatus={sectionStatus}
        localHealthScore={localHealthScore}
        isSaving={isSaving}
        showSavedCheck={showSavedCheck}
        hasUnsavedChanges={hasUnsavedChanges}
        isOnline={isOnline}
        pendingCountForResume={pendingCountForResume}
        onSave={() => { haptics.light(); saveToCloud(); }}
        onImproveSection={handleImproveSection}
        onBack={handleBack}
        onTitleClick={() => navigate('/dashboard')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onVersionHistory={() => sheets.open('versionHistory')}
        onChangeTemplate={handleChangeTemplate}
        onCustomize={handleCustomize}
        onTogglePreview={() => setShowPreview(v => { const next = !v; localStorage.setItem('wr-live-preview', String(next)); return next; })}
        onOpenChat={() => sheets.open('chat')}
        onTemplateBtnSeen={() => { if (!templateBtnSeen) { localStorage.setItem('template_btn_seen', 'true'); setTemplateBtnSeen(true); } sheets.open('templates'); }}
        onDownload={() => setShowExport(true)}
        isQuickDownloading={isQuickDownloading}
        onImportProfile={() => sheets.open('profileImport')}
        embeddedInWorkspace
        onOpenTips={() => {
          setToolsSubView('list');
          setShowToolsSheet(true);
        }}
      />

      {/* Tailored Resume Indicator Banner */}
      {resumeFromDb?.parent_resume_id && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-1 bg-primary/10 border-b border-primary/20" style={{ minHeight: 36 }}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wide shrink-0">
              <Scissors className="w-3 h-3" />
              Tailored
            </span>
            <span className="text-xs text-foreground/80 truncate">
              {resumeFromDb.target_job_title || 'Job'}
              {resumeFromDb.target_company ? ` @ ${resumeFromDb.target_company}` : ''}
            </span>
          </div>
          <button
            onClick={() => { navigate(`/editor?id=${resumeFromDb.parent_resume_id}`); haptics.light(); }}
            className="text-[11px] font-medium text-primary hover:underline shrink-0 active:scale-95 transition-transform touch-manipulation min-h-[44px] flex items-center"
          >
            View Original
          </button>
        </div>
      )}

      {/* Default Resume Banner — warn user they're editing their pinned default */}
      {currentResumeId && defaultResumeId === currentResumeId && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-1 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-700" style={{ minHeight: 36 }}>
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
          <span className="text-xs text-amber-800 dark:text-amber-300 flex-1 truncate">
            This is your <strong>default resume</strong> — edits apply directly. Use <em>Tailor</em> to create a safe copy for a specific job.
          </span>
        </div>
      )}

      {/* Trial Resume Banner — active trial (non-blocking) */}
      {resumeFromDb?.is_trial && resumeFromDb.trial_expires_at && new Date(resumeFromDb.trial_expires_at) > new Date() && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-1 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800" style={{ minHeight: 36 }}>
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-800 dark:text-amber-300 flex-1 truncate">
            Trial resume — expires in {Math.max(1, Math.ceil((new Date(resumeFromDb.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60)))}h. Saving your first edit will end the trial period.
          </span>
          <button
            onClick={() => navigate('/subscription')}
            aria-label="Upgrade your plan to keep this resume forever"
            className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0 active:scale-95 transition-transform touch-manipulation min-h-[44px] flex items-center"
          >
            Upgrade to keep forever →
          </button>
        </div>
      )}

      {/* Trial Resume Banner — expired trial (read-only lock) */}
      {resumeFromDb?.is_trial && resumeFromDb.trial_expires_at && new Date(resumeFromDb.trial_expires_at) <= new Date() && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/30" style={{ minHeight: 40 }}>
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="text-xs text-destructive flex-1">
            Your free trial has ended. This resume is <strong>read-only</strong> — upgrade to Pro to keep making changes.
          </span>
          <button
            onClick={() => navigate('/subscription')}
            aria-label="Upgrade to Pro to continue editing"
            className="text-[11px] font-semibold text-destructive hover:underline shrink-0 active:scale-95 transition-transform touch-manipulation min-h-[44px] flex items-center"
          >
            Upgrade →
          </button>
        </div>
      )}

      <AIIntroTooltip show={showAIIntro} onDismiss={handleDismissAIIntro} />

      {/* Editor + Preview layout */}
      {isMobile ? (
        <Tabs
          value={mobileEditorTab}
          onValueChange={(v) => {
            const next = v as 'editor' | 'preview' | 'ats';
            if (useAIEnhancingStore.getState().count > 0 && next !== 'editor') return;
            setMobileEditorTab(next);
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Combined single-row nav: view mode toggle + section pills */}
          <div className="shrink-0 flex items-center border-b border-border bg-card/95 backdrop-blur-sm">
            {/* Compact Edit / Preview / ATS pills */}
            <div
              className="flex shrink-0 gap-1 px-2 py-1.5"
              role="tablist"
              aria-label="Editor view"
            >
              {(['editor', 'preview', 'ats'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mobileEditorTab === tab}
                  disabled={aiEnhancingCount > 0 && tab !== 'editor'}
                  onClick={() => {
                    if (aiEnhancingCount > 0 && tab !== 'editor') {
                      toast.info('AI is still working — please wait.', { duration: 2000, id: 'ai-section-lock' });
                      return;
                    }
                    setMobileEditorTab(tab);
                    haptics.light();
                  }}
                  className={cn(
                    'px-3 min-h-[44px] rounded-full text-xs font-semibold border transition-colors whitespace-nowrap touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    mobileEditorTab === tab
                      ? 'bg-primary border-primary text-primary-foreground shadow-soft-sm'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                    aiEnhancingCount > 0 && tab !== 'editor' && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {tab === 'editor' ? 'Edit' : tab === 'preview' ? 'Preview' : (
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />ATS</span>
                  )}
                </button>
              ))}
            </div>
            {/* Current-section navigator: ‹ Name › — only in edit mode */}
            {mobileEditorTab === 'editor' && (
              <>
                <div className="w-px h-5 bg-border shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-0.5 px-1">
                  <button
                    onClick={() => {
                      const idx = steps.findIndex(s => s.id === activeTab);
                      if (idx > 0) { handleTabChange(steps[idx - 1].id); haptics.light(); }
                    }}
                    disabled={steps.findIndex(s => s.id === activeTab) === 0}
                    aria-label="Previous section"
                    className={cn(
                      'p-1.5 rounded-lg transition-all touch-manipulation active:scale-95 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center',
                      steps.findIndex(s => s.id === activeTab) === 0
                        ? 'text-muted-foreground/25 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-medium text-foreground truncate select-none">
                    {steps.find(s => s.id === activeTab)?.label ?? 'Section'}
                  </span>
                  <button
                    onClick={() => {
                      const idx = steps.findIndex(s => s.id === activeTab);
                      if (idx < steps.length - 1) { handleTabChange(steps[idx + 1].id); haptics.light(); }
                    }}
                    disabled={steps.findIndex(s => s.id === activeTab) === steps.length - 1}
                    aria-label="Next section"
                    className={cn(
                      'p-1.5 rounded-lg transition-all touch-manipulation active:scale-95 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center',
                      steps.findIndex(s => s.id === activeTab) === steps.length - 1
                        ? 'text-muted-foreground/25 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
            <div
              className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-4 space-y-0"
              ref={scrollContainerRef}
            >
              <Breadcrumb
                items={['Home', resumeFromDb?.title || currentResume?.contactInfo?.fullName || 'Resume']}
                links={['/dashboard']}
                className="pb-2"
              />
              <EditorSectionContent {...editorSectionProps} />
            </div>
            {/* Pinned nav — undo/redo + prev/next in a single row */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))]">
                <button
                  onClick={() => { haptics.light(); handleUndo(); }}
                  disabled={!canUndo}
                  aria-label={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
                  className={cn(
                    'p-2 rounded-lg transition-all touch-manipulation active:scale-95 w-9 h-9 flex items-center justify-center shrink-0',
                    canUndo ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/25 cursor-not-allowed'
                  )}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { haptics.light(); handleRedo(); }}
                  disabled={!canRedo}
                  aria-label={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
                  className={cn(
                    'p-2 rounded-lg transition-all touch-manipulation active:scale-95 w-9 h-9 flex items-center justify-center shrink-0',
                    canRedo ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/25 cursor-not-allowed'
                  )}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-border shrink-0" />
                <SectionNavButtons steps={steps} activeTab={activeTab} handleTabChange={handleTabChange} navigate={navigate} noPadding />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
            {mobileEditorTab === 'preview' && (
              <>
                <div className="shrink-0 border-b border-border bg-card/95 px-3 py-2.5">
                  <EditorResumeStrengthBar overallScore={overallScore} />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full bg-muted/30">
                      <MiniSpinner size={24} className="text-primary" />
                      <p className="text-sm text-muted-foreground">Loading preview…</p>
                    </div>
                  }>
                    <LivePreviewPanel highlightSection={activeTab} />
                  </Suspense>
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="ats" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
            {mobileEditorTab === 'ats' && (
              <>
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <button
                    onClick={() => { haptics.light(); setToolsSubView('list'); setShowToolsSheet(true); }}
                    className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card shadow-soft-sm hover:bg-muted hover:border-primary/25 active:scale-[0.98] transition-all touch-manipulation min-h-[48px] px-4"
                  >
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">AI Tools</span>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full bg-muted/30">
                      <MiniSpinner size={24} className="text-primary" />
                      <p className="text-sm text-muted-foreground">Loading ATS view…</p>
                    </div>
                  }>
                    <ATSParserPreview />
                  </Suspense>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : showPreview ? (
        <ResizablePanelGroup
          ref={editorPanelGroupRef}
          direction="horizontal"
          className="flex-1 min-h-0"
          autoSaveId="wr-editor-split-v1"
        >
          <ResizablePanel id="editor-form" order={1} defaultSize={52} minSize={32}>
            {renderEditorFormWorkspace()}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="editor-preview" order={2} defaultSize={48} minSize={28}>
            <div className="flex flex-col h-full min-h-0">
              {/* Visual / ATS toggle */}
              <div
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card/95 backdrop-blur-sm"
                role="tablist"
                aria-label="Preview mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopPreviewMode === 'visual'}
                  onClick={() => setDesktopPreviewMode('visual')}
                  className={cn(
                    'px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-colors touch-manipulation',
                    desktopPreviewMode === 'visual'
                      ? 'bg-primary text-primary-foreground shadow-soft-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  Visual
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopPreviewMode === 'ats'}
                  onClick={() => setDesktopPreviewMode('ats')}
                  className={cn(
                    'px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-colors touch-manipulation',
                    desktopPreviewMode === 'ats'
                      ? 'bg-primary text-primary-foreground shadow-soft-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  ATS View
                </button>
              </div>
              <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2.5">
                <EditorResumeStrengthBar overallScore={overallScore} />
              </div>
              <div className="flex-1 min-h-0">
                <Suspense fallback={
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/30">
                    <MiniSpinner size={24} className="text-primary" />
                    <p className="text-sm text-muted-foreground">Loading preview…</p>
                  </div>
                }>
                  {desktopPreviewMode === 'visual' ? (
                    <LivePreviewPanel
                      onClose={() => { setShowPreview(false); localStorage.setItem('wr-live-preview', 'false'); }}
                      highlightSection={activeTab}
                    />
                  ) : (
                    <ATSParserPreview
                      onClose={() => { setShowPreview(false); localStorage.setItem('wr-live-preview', 'false'); }}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        renderEditorFormWorkspace()
      )}

      {/* Keyboard Toolbar - floats above keyboard */}
      <KeyboardToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        undoDescription={undoDescription}
        redoDescription={redoDescription}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Sheets - lazy loaded, wrapped in ErrorBoundary */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {/* LivePreviewSheet removed — mobile now uses inline Tabs */}
          {sheets.is('jobAnalysis') && <JobAnalysisSheet open onOpenChange={(open) => open ? sheets.open('jobAnalysis') : sheets.close()} />}
          {sheets.is('templates') && <TemplateSelector open onOpenChange={(open) => open ? sheets.open('templates') : sheets.close()} onTemplateApplied={() => setTimeout(() => saveToCloud(), 0)} />}
          {sheets.is('tailor') && <TailorSheet open onOpenChange={(open) => open ? sheets.open('tailor') : sheets.close()} />}
          {sheets.is('recruiterSim') && <RecruiterSimSheet open onOpenChange={(open) => open ? sheets.open('recruiterSim') : sheets.close()} />}
          {sheets.is('aiDetector') && <AIDetectorSheet open onOpenChange={(open) => open ? sheets.open('aiDetector') : sheets.close()} />}
          {sheets.is('linkedIn') && <LinkedInOptimizerSheet open onOpenChange={(open) => open ? sheets.open('linkedIn') : sheets.close()} />}
          {sheets.is('onePage') && <OnePageWizardSheet open onOpenChange={(open) => open ? sheets.open('onePage') : sheets.close()} />}
          {sheets.is('chat') && (
            <AgenticChatSheet
              open
              onOpenChange={(open) => {
                if (!open) { sheets.close(); setChatInitialMessage(undefined); }
              }}
              initialMessage={chatInitialMessage}
            />
          )}
          {sheets.is('careerPath') && <CareerPathSheet open onOpenChange={(open) => open ? sheets.open('careerPath') : sheets.close()} />}
          {sheets.is('versionHistory') && <VersionHistorySheet open onOpenChange={(open) => open ? sheets.open('versionHistory') : sheets.close()} resumeId={currentResumeId} />}
          {sheets.is('profileImport') && (
            <ProfileImportSheet
              open
              onOpenChange={(open) => open ? sheets.open('profileImport') : sheets.close()}
              onImport={handleProfileImport}
              existingExperience={currentResume?.experience}
              existingSkills={currentResume?.skills}
            />
          )}
          {sheets.is('contentLibrary') && <ContentLibrarySheet open onOpenChange={(open) => open ? sheets.open('contentLibrary') : sheets.close()} onInsert={handleContentInsert} />}
          <StyleCustomizationPanel open={showStylePanel} onOpenChange={setShowStylePanel} />
          {sheets.is('atsScan') && <ATSScanSheet open onOpenChange={(open) => open ? sheets.open('atsScan') : sheets.close()} summary={scanSummary} onJumpToSection={handleTabChange} />}
          {sheets.is('snapshots') && (
            <ResumeSnapshotsSheet
              open
              onOpenChange={(open) => open ? sheets.open('snapshots') : sheets.close()}
              currentResume={currentResume}
              currentResumeId={currentResumeId}
              currentAtsScore={matchScore?.overallScore ?? undefined}
              onRestoreAsNew={async (resume) => {
                const created = await createResume.mutateAsync({
                  resume,
                  title: `${resume.contactInfo?.fullName || 'Resume'} (Restored)`,
                });
                useResumeStore.getState().setCurrentResumeId(created.id);
                navigate(`/editor?resumeId=${created.id}`);
              }}
            />
          )}
          {sheets.is('keywordHighlighter') && (
            <KeywordHighlighterSheet
              open
              onOpenChange={(open) => open ? sheets.open('keywordHighlighter') : sheets.close()}
              currentResume={currentResume}
            />
          )}
          {/* Tier gate upgrade dialog — shown when a Pro-gated tool is clicked without Pro plan */}
          {tierGateState && (
            <UpgradeDialog
              open={tierGateOpen}
              onClose={closeTierGate}
              requiredPlan={tierGateState.requiredPlan}
              featureName={tierGateState.featureName}
              description={tierGateState.description}
              features={tierGateState.features}
            />
          )}
          {/* Mobile tools sheet with sub-view navigation */}
          <Sheet open={showToolsSheet} onOpenChange={(open) => { setShowToolsSheet(open); if (!open) setToolsSubView('list'); }}>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] flex flex-col px-0 pb-safe">
              {toolsSubView === 'list' ? (
                <>
                  <SheetHeader className="px-4 pb-2 shrink-0">
                    <SheetTitle className="text-base">AI Tools</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/TemplateSelector'))}
                      onClick={() => { haptics.light(); setShowToolsSheet(false); handleChangeTemplate(); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <LayoutGrid className="w-5 h-5 text-violet-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Change Template</p>
                        <p className="text-xs text-muted-foreground">Browse and apply a new resume style</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { haptics.light(); setShowToolsSheet(false); setShowExport(true); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                      data-track="editor-tools-export"
                    >
                      <Download className="w-5 h-5 text-green-600 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Download / Export</p>
                        <p className="text-xs text-muted-foreground">Save as PDF, Word, image, or share link</p>
                      </div>
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/TailorSheet'))}
                      onClick={() => { haptics.light(); setShowToolsSheet(false); handleTailor(); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                      data-track="editor-tools-tailor"
                    >
                      <Target className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Tailor to Job</p>
                        <p className="text-xs text-muted-foreground">Match resume to a job post</p>
                      </div>
                    </button>
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/JobAnalysisSheet'))}
                      onClick={() => { haptics.light(); setShowToolsSheet(false); sheets.open('jobAnalysis'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <BarChart3 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Job Match Analysis</p>
                        <p className="text-xs text-muted-foreground">Keyword & content match vs your job description</p>
                      </div>
                    </button>
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/ATSScanSheet'))}
                      onClick={() => { haptics.light(); setToolsSubView('ats-scan'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Sparkles className="w-5 h-5 text-cyan-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">ATS Scan</p>
                        <p className="text-xs text-muted-foreground">Quick keyword match scan</p>
                      </div>
                    </button>
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/ResumeSnapshotsSheet').then(m => ({ default: m.ResumeSnapshotsSheet })))}
                      onClick={() => { haptics.light(); setShowToolsSheet(false); sheets.open('snapshots'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Scissors className="w-5 h-5 text-violet-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Version Snapshots</p>
                        <p className="text-xs text-muted-foreground">Save & restore versions</p>
                      </div>
                    </button>
                    <button
                      onPointerEnter={preloadLazy(() => import('@/components/editor/KeywordHighlighterSheet').then(m => ({ default: m.KeywordHighlighterSheet })))}
                      onClick={() => { haptics.light(); setShowToolsSheet(false); sheets.open('keywordHighlighter'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <BarChart3 className="w-5 h-5 text-teal-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Keyword Matcher</p>
                        <p className="text-xs text-muted-foreground">Match job description keywords</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { haptics.light(); setShowToolsSheet(false); handleCustomize(); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Palette className="w-5 h-5 text-pink-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Customize Design</p>
                        <p className="text-xs text-muted-foreground">Change colors, fonts & layout</p>
                      </div>
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={() => { haptics.light(); setShowToolsSheet(false); sheets.open('versionHistory'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Clock className="w-5 h-5 text-slate-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Version History</p>
                        <p className="text-xs text-muted-foreground">View and restore past versions</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { haptics.light(); setShowToolsSheet(false); sheets.open('profileImport'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <FileDown className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Import Profile</p>
                        <p className="text-xs text-muted-foreground">Import data from LinkedIn or PDF</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                    <button
                      onClick={() => { haptics.light(); setToolsSubView('list'); }}
                      className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label="Back to tools list"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-base font-semibold">ATS Scan</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 px-4 py-4">
                    {scanSummary ? (
                      <div className="space-y-5 pb-2">
                        <div className="text-center space-y-2">
                          <p className={cn('text-4xl font-bold', scanSummary.matchPercentage >= 70 ? 'text-success' : scanSummary.matchPercentage >= 40 ? 'text-warning' : 'text-destructive')}>
                            {scanSummary.matchPercentage}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {scanSummary.matchedKeywords} of {scanSummary.totalKeywords} keywords matched
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug max-w-[280px] mx-auto pt-1">
                            Measures keyword overlap with your job description — not template layout parsability or external ATS-tool scores.
                          </p>
                        </div>
                        {scanSummary.perSection.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Missing Keywords by Section</h4>
                            {scanSummary.perSection.map(({ section, label, missing }: { section: string; label: string; missing: number }) => (
                              <button
                                key={section}
                                onClick={() => { haptics.light(); handleTabChange(section); setShowToolsSheet(false); setToolsSubView('list'); }}
                                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 bg-muted active:scale-[0.98] touch-manipulation min-h-[44px]"
                              >
                                <span className="text-sm font-medium flex-1 text-left">{label}</span>
                                <span className="text-xs text-muted-foreground">{missing} missing</span>
                                <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                              </button>
                            ))}
                          </div>
                        )}
                        {scanSummary.perSection.length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-sm text-success font-medium">All key terms are covered.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">Run ATS Scan to see keyword results.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
          {sheets.is('shareSheet') && currentResume && (
            <ShareSheet
              open
              onOpenChange={(open) => open ? sheets.open('shareSheet') : sheets.close()}
              resume={currentResume}
              templateId={selectedTemplate}
              templateName={selectedTemplate}
              resumeRef={{ current: null } as React.RefObject<HTMLDivElement>}
            />
          )}
          {showExport && currentResume && (
            <ExportOptionsSheet
              open={showExport}
              onOpenChange={setShowExport}
              hasCoverLetter={!!useResumeStore.getState().generatedCoverLetter}
              onExport={handleExport}
              onCreateCoverLetter={() => { setShowExport(false); gate('pro', () => sheets.open('tailor'), { featureName: 'Cover Letter Generator' })(); }}
              onCreateGeneralCoverLetter={() => { setShowExport(false); navigate('/cover-letter/new'); }}
              isExporting={isExporting}
              exportProgress={exportProgress}
              resumeName={currentResume.contactInfo?.fullName || ''}
              templateName={selectedTemplate}
              resumeData={currentResume}
              templateElement={document.querySelector('[data-resume-template]') as HTMLElement | null}
            />
          )}
        </Suspense>
      </ErrorBoundary>

      {/* Unsaved changes navigation guard dialog */}
      <UnsavedChangesDialog
        open={unsavedGuard.isBlocked}
        isSaving={unsavedGuard.isSavingBeforeLeave}
        onSaveAndLeave={unsavedGuard.saveAndProceed}
        onDiscard={unsavedGuard.proceed}
        onCancel={unsavedGuard.cancel}
      />
    </main>
    </TooltipProvider>
  );
}


