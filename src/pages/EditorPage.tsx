import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { logAudit } from '@/lib/auditLogger';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Check, Cloud, CloudOff, Sparkles, ChevronDown, BarChart3, Scissors, Save, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
// Tooltip removed – Radix Popper causes infinite setRef loop on this page
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StepperNav } from '@/components/editor/StepperNav';
import { SectionSidebar } from '@/components/editor/SectionSidebar';
import { useResumeStore, useResumeStoreHydration } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations, useResume } from '@/hooks/useResumes';
import { toast } from 'sonner';
const ApplyPromptDialog = lazyWithRetry(() => import('@/components/applications/ApplyPromptDialog').then(m => ({ default: m.ApplyPromptDialog })));
const ATSScanSheet = lazyWithRetry(() => import('@/components/editor/ATSScanSheet').then(m => ({ default: m.ATSScanSheet })));

// Lazy-loaded sheet components (only loaded when opened)
const JobAnalysisSheet = lazyWithRetry(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TemplateSelector = lazyWithRetry(() => import('@/components/editor/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const TailorSheet = lazyWithRetry(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazyWithRetry(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazyWithRetry(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazyWithRetry(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazyWithRetry(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazyWithRetry(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazyWithRetry(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
const VersionHistorySheet = lazyWithRetry(() => import('@/components/editor/VersionHistorySheet').then(m => ({ default: m.VersionHistorySheet })));
const ContentLibrarySheet = lazyWithRetry(() => import('@/components/editor/ContentLibrarySheet').then(m => ({ default: m.ContentLibrarySheet })));
const CustomizeSheet = lazyWithRetry(() => import('@/components/editor/CustomizeSheet').then(m => ({ default: m.CustomizeSheet })));
const ShareSheet = lazyWithRetry(() => import('@/components/editor/ShareSheet').then(m => ({ default: m.ShareSheet })));
const LivePreviewPanel = lazyWithRetry(() => import('@/components/editor/LivePreviewPanel').then(m => ({ default: m.LivePreviewPanel })));
const ATSParserPreview = lazyWithRetry(() => import('@/components/editor/ATSParserPreview'));
import { useShallow } from 'zustand/react/shallow';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ATSScoreBreakdown } from '@/components/dashboard/ATSScoreBreakdown';
import { KeyboardToolbar } from '@/components/editor/KeyboardToolbar';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ActionsPanel, type ActionsPanelGroup } from '@/components/ActionsPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Target, LayoutGrid, MessageSquare, Palette, Clock, Plus } from 'lucide-react';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { getBackRoute } from '@/lib/navigation';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { useBackButton } from '@/hooks/useBackButton';
import { useEditorHydration } from '@/hooks/useEditorHydration';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import { useEditorSectionScores } from '@/hooks/useEditorSectionScores';
import { useATSSuggestions } from '@/hooks/useATSSuggestions';
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorSectionContent, SectionNavButtons } from '@/components/editor/EditorSectionContent';
import { EditorScrollForm } from '@/components/editor/EditorScrollForm';
import { EditorSkeleton } from '@/components/layout/PageSkeletons';
import { useTierGate } from '@/hooks/useTierGate';
import { UpgradeDialog } from '@/components/plan/UpgradeDialog';
export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const storeHydrated = useResumeStoreHydration();
  const { hasSeenAIIntro, setHasSeenAIIntro } = useSettingsStore();
  const isBYOK = useSettingsStore((s) =>
    (s.aiProvider === 'gemini' && s.geminiKeyValidated) ||
    (s.aiProvider === 'ollama' && s.ollamaKeyValidated) ||
    (s.aiProvider === 'openai' && s.openaiKeyValidated) ||
    (s.aiProvider === 'anthropic' && s.anthropicKeyValidated) ||
    (s.aiProvider === 'groq' && s.groqKeyValidated) ||
    (s.aiProvider === 'mistral' && s.mistralKeyValidated) ||
    (s.aiProvider === 'xai' && s.xaiKeyValidated) ||
    (s.aiProvider === 'cohere' && s.cohereKeyValidated) ||
    (s.aiProvider === 'openrouter' && s.openrouterKeyValidated)
  );
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
  const { updateResume } = useResumeMutations();

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
        toast.error('Resume could not be loaded.');
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

  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showRecruiterSim, setShowRecruiterSim] = useState(false);
  const [showAIDetector, setShowAIDetector] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showOnePage, setShowOnePage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCareerPath, setShowCareerPath] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showContentLibrary, setShowContentLibrary] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  // experience level determines section order: 'student' puts education before experience
  const [educationFirst, setEducationFirst] = useState(false);
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [lastAppliedJobInfo, setLastAppliedJobInfo] = useState<{ title: string; company: string; resumeId?: string; jobUrl?: string } | null>(null);
  const [moreSubSection, setMoreSubSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 900) {
      const stored = localStorage.getItem('wr-live-preview');
      return stored === null ? true : stored === 'true';
    }
    return false;
  });
  const [showATSBadge, setShowATSBadge] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [toolsSubView, setToolsSubView] = useState<'list' | 'ats-scan'>('list');
  const [showATSScan, setShowATSScan] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);

  const handleQuickDownload = useCallback(async () => {
    if (!currentResume) return;
    haptics.medium();
    setIsQuickDownloading(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const pdfBlob = await generatePDF(currentResume, selectedTemplate, null, undefined, { showPageNumbers: true });
      const fileName = `${currentResume.contactInfo?.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
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
  const [mobileEditorTab, setMobileEditorTab] = useState<'editor' | 'preview' | 'ats'>('editor');
  const [desktopPreviewMode, setDesktopPreviewMode] = useState<'visual' | 'ats'>('visual');
  // Desktop scrollspy: track which section is currently visible
  const [activeSection, setActiveSection] = useState('contact');
  const isMobile = useIsMobile();
  // Auto-open Tailor sheet if navigated with ?openTailor=1 or ?tailor=true.
  // Track intent with a ref so the plan gate can be applied once planLoading settles.
  const autoOpenTailorRef = useRef(false);
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
      if (isPro || isBYOK) {
        setShowTailor(true);
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
  }, [planLoading, isPro, isBYOK, triggerGate]);

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

  const scrollToSection = useCallback((sectionId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-section-id="${sectionId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Called by desktop scrollspy/sidebar. Keeps activeTab in sync for preview highlight and ATS.
  const handleDesktopSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const optionalIds = ['awards', 'projects', 'certifications', 'publications', 'volunteering', 'languages', 'hobbies', 'references'];
    if (optionalIds.includes(sectionId)) {
      setActiveTab('more');
    } else {
      setActiveTab(sectionId);
    }
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

  // Smart tab change handler with auto-scroll
  const handleTabChange = useCallback((newTab: string) => {
    const optionalIds = ['awards', 'projects', 'certifications', 'publications', 'volunteering', 'languages', 'hobbies', 'references'];
    if (optionalIds.includes(newTab)) {
      setActiveTab('more');
      setMoreSubSection(newTab);
    } else {
      if (newTab !== 'more') {
        setMoreSubSection(null);
      }
      setActiveTab(newTab);
    }
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

  // Auto-scroll to first form field on mobile after initial load
  const hasAutoScrolled = useRef(false);
  useEffect(() => {
    if (!isMobile || !currentResume || hasAutoScrolled.current) return;
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
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
  useEditorShortcuts({
    onSave: saveToCloud,
    onExport: () => setShowExport(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    resumeId: currentResumeId,
  });

  // Unsaved changes warning (browser refresh/tab close)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const current = JSON.stringify(resumeRef.current);
      if (current !== lastSavedResumeRef.current && lastSavedResumeRef.current !== '') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // In-app navigation guard (custom, no useBlocker)
  const unsavedGuard = useUnsavedChangesGuard({
    resumeRef,
    lastSavedResumeRef,
    saveToCloud,
  });

  // Hardware back button guard for Capacitor
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
    if (currentResume) {
      const MORE_SECTION_META: Record<string, string> = {
        awards: 'Awards', projects: 'Projects', certifications: 'Certifications',
        publications: 'Publications', volunteering: 'Volunteering',
        languages: 'Languages', hobbies: 'Hobbies', references: 'References',
      };
      for (const [id, label] of Object.entries(MORE_SECTION_META)) {
        const data = currentResume[id as keyof typeof currentResume];
        if (Array.isArray(data) && data.length > 0) {
          base.push({ id, label });
        }
      }
    }
    base.push({ id: 'more', label: 'More' });
    return base;
  }, [currentResume, educationFirst]);

  // Count optional sections not yet added (available to add via More)
  const availableMoreCount = useMemo(() => {
    const MORE_OPTIONAL_IDS = ['awards', 'projects', 'certifications', 'publications', 'volunteering', 'languages', 'hobbies', 'references'];
    const addedIds = new Set(steps.map(s => s.id));
    return MORE_OPTIONAL_IDS.filter(id => !addedIds.has(id)).length;
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
    gate('pro', () => setShowTailor(true), {
      featureName: 'Smart Tailoring',
      description: 'Paste a job description and AI rewrites your resume to match it perfectly.',
      features: TAILOR_FEATURES,
      bypassCondition: isBYOK,
    }),
    [gate, isBYOK]
  );

  const handleBack = useCallback(() => {
    unsavedGuard.interceptNavigate(getBackRoute('/editor'));
  }, [unsavedGuard]);

  const handleChangeTemplate = useCallback(() => setShowTemplates(true), []);
  const handleTailor = useCallback(
    gate('pro', () => setShowTailor(true), {
      featureName: 'Smart Tailoring',
      description: 'Paste a job description and AI rewrites your resume to match it perfectly.',
      features: TAILOR_FEATURES,
      bypassCondition: isBYOK,
    }),
    [gate, isBYOK]
  );
  const handleAnalyze = useCallback(() => setShowJobSheet(true), []);
  const handleRecruiterSim = useCallback(() => setShowRecruiterSim(true), []);
  const handleAIDetector = useCallback(() => setShowAIDetector(true), []);
  const handleLinkedIn = useCallback(() => setShowLinkedIn(true), []);
  const handleOnePage = useCallback(() => setShowOnePage(true), []);
  const handleCareerPath = useCallback(() => setShowCareerPath(true), []);
  const handleGetIdeas = useCallback(() => setShowContentLibrary(true), []);
  const handleCustomize = useCallback(() => setShowCustomize(true), []);

  const handleMoreSectionSelect = useCallback((sectionId: string) => {
    setActiveTab('more');
    setMoreSubSection(sectionId);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Tool descriptions & icon colors for mobile tools sheet
  const toolMeta: Record<string, { description: string; iconColor: string }> = {
    'design': { description: 'Change template & colors', iconColor: 'text-pink-500' },
    'wise-ai': { description: 'Chat with AI assistant', iconColor: 'text-primary' },
    'versions': { description: 'Browse saved versions', iconColor: 'text-muted-foreground' },
    'tailor': { description: 'Match resume to a job post', iconColor: 'text-amber-500' },
    'ats-check': { description: 'Score against ATS systems', iconColor: 'text-emerald-500' },
    'ats-scan': { description: 'Quick keyword match scan', iconColor: 'text-cyan-500' },
  };

  // ATS Suggestions hook
  const { getSuggestions: getATSSuggestions, isAnalyzingSection, fetchDeepSuggestions, scanSummary, deepResults, clearDeepResult } = useATSSuggestions(currentResume, jobDescription);

  // Apply deep analysis result to the resume store
  const handleApplyDeep = useCallback((section: string, improved: unknown) => {
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
    clearDeepResult(section as any);
    toast.success('AI improvements applied!');
  }, [clearDeepResult]);

  // Mobile-only editor tools panel groups
  const editorToolGroups = useMemo((): ActionsPanelGroup[] => {
    const quickActions: ActionsPanelGroup = {
      id: 'quick-actions',
      title: 'Quick Actions',
      actions: [
        { id: 'template', label: 'Change Template', icon: LayoutGrid, onClick: handleChangeTemplate },
        { id: 'design', label: 'Design', icon: Palette, onClick: handleCustomize },
        { id: 'wise-ai', label: 'Wise AI', icon: MessageSquare, onClick: () => setShowChat(true) },
        ...(user && currentResumeId ? [{ id: 'versions', label: 'Versions', icon: Clock, onClick: () => setShowVersionHistory(true) }] : []),
      ],
    };
    const aiFeatures: ActionsPanelGroup = {
      id: 'ai-features',
      title: 'AI Features',
      actions: [
        { id: 'tailor', label: 'Tailor to Job', icon: Target, onClick: handleTailor },
        { id: 'ats-check', label: 'ATS Check', icon: BarChart3, onClick: () => setShowJobSheet(true) },
        { id: 'ats-scan', label: 'ATS Scan', icon: Sparkles, onClick: () => { setToolsSubView('ats-scan'); setShowToolsSheet(true); } },
      ],
    };
    return [quickActions, aiFeatures];
  }, [user, currentResumeId, handleCustomize, handleTailor]);

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
    onActiveSectionChange: handleDesktopSectionChange,
    scrollContainerRef,
  } as const;



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

  const handleCustomizeApply = useCallback((customization: import('@/types/resume').TemplateCustomization) => {
    if (!currentResume) return;
    const { setCurrentResume } = useResumeStore.getState();
    setCurrentResume({ ...currentResume, customization });
    toast.success('Customization applied ✓', { duration: 1500 });
  }, [currentResume]);

  const handleTailorApplied = useCallback((info: { title: string; company: string; resumeId?: string; jobUrl?: string }) => {
    setLastAppliedJobInfo(info);
    setShowApplyPrompt(true);
  }, []);

  // === GUARDS (all inline, no effects — deterministic) ===
  if (authLoading) return <EditorSkeleton />;
  if (!storeHydrated) return <EditorSkeleton />;
  if (!currentResumeId && !currentResume) return <Navigate to="/dashboard" replace />;
  if (!currentResume && isValidating) return <EditorSkeleton />;
  if (!currentResume && !resumeFromDb) return <EditorSkeleton />;
  if (!currentResume) return <EditorSkeleton />;
  // === Past this point, currentResume is guaranteed non-null ===

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
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
        onBack={handleBack}
        onTitleClick={() => navigate('/dashboard')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onVersionHistory={() => setShowVersionHistory(true)}
        onChangeTemplate={handleChangeTemplate}
        onCustomize={handleCustomize}
        onTogglePreview={() => setShowPreview(v => { const next = !v; localStorage.setItem('wr-live-preview', String(next)); return next; })}
        onOpenChat={() => setShowChat(true)}
        onTemplateBtnSeen={() => { if (!templateBtnSeen) { localStorage.setItem('template_btn_seen', 'true'); setTemplateBtnSeen(true); } setShowTemplates(true); }}
        onDownload={handleQuickDownload}
        isQuickDownloading={isQuickDownloading}
      />


      {/* Progress Bar with Save Status — compact on mobile, full on desktop */}
      <div className="shrink-0 px-4 py-1 sm:py-3 border-b border-border">
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ProgressBar resume={currentResume} compact />
          </div>
          {user && currentResumeId && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Cloud status icon */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {!isOnline ? (
                  <>
                    <CloudOff className="w-3 h-3 text-warning" />
                    <span className="text-warning">Offline</span>
                  </>
                ) : isSaving ? (
                  <Cloud className="w-3 h-3 animate-pulse" />
                ) : showSavedCheck ? (
                  <Check className="w-3 h-3 text-success" style={{ animation: 'save-check-pop 0.3s ease-out' }} />
                ) : hasUnsavedChanges ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block animate-pulse" />
                    <span className="text-warning text-[11px]">Unsaved</span>
                  </>
                ) : (
                  <Cloud className="w-3 h-3 opacity-40" />
                )}
              </div>
              {/* Manual Save button — appears when there are unsaved changes or pending offline items */}
              {(hasUnsavedChanges || pendingCountForResume > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { haptics.light(); saveToCloud(); }}
                  disabled={isSaving || !isOnline}
                  className="h-8 min-h-[36px] px-3 text-[11px] gap-1.5 rounded-lg border-warning/40 text-warning hover:bg-warning/10 hover:border-warning/60"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save
                </Button>
              )}
            </div>
          )}
          {user && !currentResumeId && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CloudOff className="w-3 h-3" />
            </div>
          )}
        </div>
        {/* Expandable completeness details — hidden on mobile to save vertical space */}
        <div className="hidden sm:block">
          <details className="mt-1 group">
            <summary
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors touch-manipulation active:scale-95 min-h-[36px] cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              aria-label="View completeness breakdown"
            >
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {steps.filter(s => s.id !== 'more' && sectionStatus[s.id]).length}/{steps.filter(s => s.id !== 'more').length} sections
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            {localHealthScore && (
              <div className="mt-2 border-t border-border pt-2">
                <ATSScoreBreakdown
                  healthScore={localHealthScore}
                  compact
                  defaultOpen
                  onImprove={handleImproveSection}
                />
              </div>
            )}
          </details>
        </div>
      </div>

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

      {/* Stepper Nav — shown on mobile only (< 900px); desktop uses the sidebar */}
      {isMobile && (
        <div className="shrink-0">
          <StepperNav
            steps={steps}
            activeStep={activeTab}
            completedSteps={sectionStatus}
            sectionScores={sectionScores}
            onStepClick={handleTabChange}
            justCompletedStep={justCompletedStep}
            onMoreSectionSelect={handleMoreSectionSelect}
            activeMoreSection={moreSubSection}
            availableMoreCount={availableMoreCount}
          />
        </div>
      )}

      {/* Editor + Preview layout */}
      {isMobile ? (
        <Tabs
          value={mobileEditorTab}
          onValueChange={(v) => setMobileEditorTab(v as 'editor' | 'preview' | 'ats')}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Mobile tab switcher — Edit / Preview / ATS */}
          <TabsList className="shrink-0 grid grid-cols-3 mx-4 mt-2 mb-1 h-9">
            <TabsTrigger value="editor" className="text-xs">Edit</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="ats" className="text-xs">ATS Score</TabsTrigger>
          </TabsList>
          <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
            <div
              className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-4 space-y-0"
              ref={scrollContainerRef}
            >
              <EditorSectionContent {...editorSectionProps} />
            </div>
            {/* Pinned nav — always visible above bottom tab bar */}
            <div className="shrink-0 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] border-t border-border bg-background">
              <SectionNavButtons steps={steps} activeTab={activeTab} handleTabChange={handleTabChange} navigate={navigate} />
            </div>
          </TabsContent>
          <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
            {mobileEditorTab === 'preview' && (
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense fallback={null}>
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
                    className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[48px] px-4"
                  >
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">AI Tools</span>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense fallback={null}>
                    <ATSParserPreview />
                  </Suspense>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : showPreview ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={55} minSize={35}>
            <div className="flex h-full min-h-0 overflow-hidden">
              {/* Section sidebar — desktop only inside split panel */}
              <SectionSidebar
                steps={steps}
                activeSection={activeSection}
                sectionScores={sectionScores}
                completedSteps={sectionStatus}
                onSectionClick={(id) => {
                  handleDesktopSectionChange(id);
                  scrollToSection(id);
                }}
              />
              <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
                <div
                  className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
                  ref={scrollContainerRef}
                >
                  <EditorScrollForm {...editorScrollFormProps} />
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="flex flex-col h-full min-h-0">
              {/* Visual / ATS toggle */}
              <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-background/80 backdrop-blur-sm">
                <button
                  onClick={() => setDesktopPreviewMode('visual')}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    desktopPreviewMode === 'visual' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  Visual
                </button>
                <button
                  onClick={() => setDesktopPreviewMode('ats')}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    desktopPreviewMode === 'ats' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  ATS View
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Suspense fallback={null}>
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
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Section sidebar — visible on desktop (≥900px) when preview is hidden */}
          {!isMobile && (
            <SectionSidebar
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
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div
              className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
              ref={scrollContainerRef}
            >
              <EditorScrollForm {...editorScrollFormProps} />
            </div>
          </div>
        </div>
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

      {/* AI Intro Tooltip for First-Time Users */}
      <AIIntroTooltip
        show={showAIIntro}
        onDismiss={handleDismissAIIntro}
      />

      {/* Sheets - lazy loaded, wrapped in ErrorBoundary */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {/* LivePreviewSheet removed — mobile now uses inline Tabs */}
          {showJobSheet && <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />}
          {showTemplates && <TemplateSelector open={showTemplates} onOpenChange={setShowTemplates} onTemplateApplied={() => setTimeout(() => saveToCloud(), 0)} />}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} onApplied={handleTailorApplied} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showChat && <AgenticChatSheet open={showChat} onOpenChange={setShowChat} />}
          {showCareerPath && <CareerPathSheet open={showCareerPath} onOpenChange={setShowCareerPath} />}
          {showVersionHistory && <VersionHistorySheet open={showVersionHistory} onOpenChange={setShowVersionHistory} resumeId={currentResumeId} />}
          {showContentLibrary && <ContentLibrarySheet open={showContentLibrary} onOpenChange={setShowContentLibrary} onInsert={handleContentInsert} />}
          {showCustomize && (() => {
            const rd = currentResume ? (() => {
              const name = currentResume.contactInfo?.fullName || '';
              const latestJob = currentResume.experience?.[0];
              const subtitle = latestJob ? `${latestJob.position} – ${latestJob.company}` : currentResume.contactInfo?.location || '';
              const skills = currentResume.skills?.slice(0, 3) || [];
              return name ? { name, subtitle, skills } : undefined;
            })() : undefined;
            return <CustomizeSheet open={showCustomize} onOpenChange={setShowCustomize} customization={currentResume?.customization} onApply={handleCustomizeApply} resumeData={rd} />;
          })()}
          {lastAppliedJobInfo && (
            <ApplyPromptDialog
              open={showApplyPrompt}
              onOpenChange={setShowApplyPrompt}
              jobTitle={lastAppliedJobInfo.title}
              company={lastAppliedJobInfo.company}
              resumeId={lastAppliedJobInfo.resumeId}
              jobUrl={lastAppliedJobInfo.jobUrl}
            />
          )}
          {showATSScan && <ATSScanSheet open={showATSScan} onOpenChange={setShowATSScan} summary={scanSummary} onJumpToSection={handleTabChange} />}
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
                      onClick={() => { haptics.light(); setShowToolsSheet(false); handleTailor(); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Target className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Tailor to Job</p>
                        <p className="text-xs text-muted-foreground">Match resume to a job post</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { haptics.light(); setShowToolsSheet(false); setShowJobSheet(true); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <BarChart3 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">ATS Check</p>
                        <p className="text-xs text-muted-foreground">Score against ATS systems</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { haptics.light(); setToolsSubView('ats-scan'); }}
                      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-transform touch-manipulation min-h-[56px] px-4"
                    >
                      <Sparkles className="w-5 h-5 text-cyan-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">ATS Scan</p>
                        <p className="text-xs text-muted-foreground">Quick keyword match scan</p>
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
          {showShareSheet && currentResume && (
            <ShareSheet
              open={showShareSheet}
              onOpenChange={setShowShareSheet}
              resume={currentResume}
              templateId={selectedTemplate}
              templateName={selectedTemplate}
              resumeRef={{ current: null } as React.RefObject<HTMLDivElement>}
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
  );
}

