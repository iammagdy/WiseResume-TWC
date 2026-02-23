import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue, lazy, Suspense, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { logAudit } from '@/lib/auditLogger';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Download, ChevronRight, ChevronLeft, Check, Cloud, CloudOff, ArrowLeft, Sparkles, MessageSquare, Lock, User, AlignLeft, Briefcase, GraduationCap, Wrench, Clock, Info, X, Plus, Trophy, Rocket, BookOpen, Heart, Palette, Users, Eye, Award, Globe, PanelLeftClose, PanelLeft, ChevronDown, BarChart3, Undo2, Redo2, Scissors, LayoutTemplate } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
// Tooltip removed – Radix Popper causes infinite setRef loop on this page
import { calcContactScore, calcSummaryScore, calcExperienceScore, calcEducationScore, calcSkillsScore, calcOverallScore, getSectionStatus, getNextIncompleteSection } from '@/lib/resumeCompletionRules';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StepperNav } from '@/components/editor/StepperNav';
import { SectionCard } from '@/components/editor/SectionCard';
import { Button } from '@/components/ui/button';
import { useResumeStore, useResumeStoreHydration } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations, useResume, dbToResumeData } from '@/hooks/useResumes';
import { toast } from 'sonner';
// Lazy-loaded section components (only the active tab is loaded)
const ContactSection = lazy(() => import('@/components/editor/ContactSection').then(m => ({ default: m.ContactSection })));
const SummarySection = lazy(() => import('@/components/editor/SummarySection').then(m => ({ default: m.SummarySection })));
const ExperienceSection = lazy(() => import('@/components/editor/ExperienceSection').then(m => ({ default: m.ExperienceSection })));
const EducationSection = lazy(() => import('@/components/editor/EducationSection').then(m => ({ default: m.EducationSection })));
const SkillsSection = lazy(() => import('@/components/editor/SkillsSection').then(m => ({ default: m.SkillsSection })));
const AwardsSection = lazy(() => import('@/components/editor/AwardsSection').then(m => ({ default: m.AwardsSection })));
const ProjectsSection = lazy(() => import('@/components/editor/ProjectsSection').then(m => ({ default: m.ProjectsSection })));
const PublicationsSection = lazy(() => import('@/components/editor/PublicationsSection').then(m => ({ default: m.PublicationsSection })));
const VolunteeringSection = lazy(() => import('@/components/editor/VolunteeringSection').then(m => ({ default: m.VolunteeringSection })));
const HobbiesSection = lazy(() => import('@/components/editor/HobbiesSection').then(m => ({ default: m.HobbiesSection })));
const ReferencesSection = lazy(() => import('@/components/editor/ReferencesSection').then(m => ({ default: m.ReferencesSection })));
const CertificationsSection = lazy(() => import('@/components/editor/CertificationsSection').then(m => ({ default: m.CertificationsSection })));
const LanguagesSection = lazy(() => import('@/components/editor/LanguagesSection').then(m => ({ default: m.LanguagesSection })));
// AIAssistantBar moved to AI Studio tab
import { SectionAIAction } from '@/components/editor/SectionAIAction';
import { ATSInlineSuggestions } from '@/components/editor/ATSInlineSuggestions';
import { AddSectionSheet } from '@/components/editor/AddSectionSheet';
import { useATSSuggestions } from '@/hooks/useATSSuggestions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { ProgressBar } from '@/components/editor/ProgressBar';

import { useShallow } from 'zustand/react/shallow';
const ApplyPromptDialog = lazy(() => import('@/components/applications/ApplyPromptDialog').then(m => ({ default: m.ApplyPromptDialog })));
const ATSScanSheet = lazy(() => import('@/components/editor/ATSScanSheet').then(m => ({ default: m.ATSScanSheet })));

// Lazy-loaded sheet components (only loaded when opened)
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const TemplateSelector = lazy(() => import('@/components/editor/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazy(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazy(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
const VersionHistorySheet = lazy(() => import('@/components/editor/VersionHistorySheet').then(m => ({ default: m.VersionHistorySheet })));
const ContentLibrarySheet = lazy(() => import('@/components/editor/ContentLibrarySheet').then(m => ({ default: m.ContentLibrarySheet })));
const CustomizeSheet = lazy(() => import('@/components/editor/CustomizeSheet').then(m => ({ default: m.CustomizeSheet })));
const ProofreadSheet = lazy(() => import('@/components/editor/ProofreadSheet').then(m => ({ default: m.ProofreadSheet })));
const ShareSheet = lazy(() => import('@/components/editor/ShareSheet').then(m => ({ default: m.ShareSheet })));
const LivePreviewPanel = lazy(() => import('@/components/editor/LivePreviewPanel').then(m => ({ default: m.LivePreviewPanel })));
const LivePreviewSheet = lazy(() => import('@/components/editor/LivePreviewSheet').then(m => ({ default: m.LivePreviewSheet })));
const ATSParserPreview = lazy(() => import('@/components/editor/ATSParserPreview'));
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ATSScoreBreakdown, getScoreColorClass } from '@/components/dashboard/ATSScoreBreakdown';
import { useResumeScore, ResumeHealthScore, backgroundScore } from '@/hooks/useResumeScore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { KeyboardToolbar } from '@/components/editor/KeyboardToolbar';
import { OfflineIndicator } from '@/components/editor/OfflineIndicator';
import { EditorSkeleton } from '@/components/layout/PageSkeletons';
import { ContactSectionSkeleton, SummarySectionSkeleton, ExperienceSectionSkeleton, EducationSectionSkeleton, SkillsSectionSkeleton, ListSectionSkeleton } from '@/components/editor/SectionSkeletons';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ActionsPanel, type ActionsPanelGroup } from '@/components/ActionsPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Target, LayoutGrid } from 'lucide-react';
import { useProofread } from '@/hooks/useProofread';
import { ProofreadButton } from '@/components/editor/ProofreadButton';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { selectErrorCount, selectIssueCount } from '@/store/proofreadStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { getBackRoute } from '@/lib/navigation';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { useBackButton } from '@/hooks/useBackButton';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const storeHydrated = useResumeStoreHydration();
  const { hasSeenAIIntro, setHasSeenAIIntro } = useSettingsStore();
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

  // Single hydration effect: sync DB data into Zustand store + ownership check
  // Also detects stale resume (Fix 2): if server version is newer than local, auto-refresh or show conflict banner
  const setConflict = useOfflineSyncStore(s => s.setConflict);
  const localLoadedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resumeFromDb || !currentResumeId) return;

    // Ownership check
    if (user && resumeFromDb.user_id !== user.id) {
      setCurrentResumeId(null);
      toast.error('Access denied.');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Initial hydration: store is empty → just load from DB
    if (!currentResume) {
      useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
      useResumeStore.getState().setSelectedTemplate(
        (resumeFromDb.template_id || 'modern') as import('@/types/resume').TemplateId
      );
      // Record the server timestamp we loaded from so we can detect future conflicts
      localLoadedAtRef.current = resumeFromDb.updated_at ?? null;
      lastSavedResumeRef.current = JSON.stringify(dbToResumeData(resumeFromDb));
      logAudit('account', 'editor_session_started', {
        resumeId: currentResumeId,
        resumeTitle: resumeFromDb.title,
      });
      return;
    }

    // Fix 2: Stale-resume detection on subsequent React Query refetches (e.g. window focus / foreground return)
    const serverUpdatedAt = resumeFromDb.updated_at;
    const localLoadedAt = localLoadedAtRef.current;
    if (serverUpdatedAt && localLoadedAt && serverUpdatedAt > localLoadedAt) {
      // Server has a newer version than when this session loaded
      const isClean = lastSavedResumeRef.current === JSON.stringify(currentResume);
      if (isClean) {
        // No local edits since last save — auto-refresh silently
        useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
        useResumeStore.getState().setSelectedTemplate(
          (resumeFromDb.template_id || 'modern') as import('@/types/resume').TemplateId
        );
        localLoadedAtRef.current = serverUpdatedAt;
        lastSavedResumeRef.current = JSON.stringify(dbToResumeData(resumeFromDb));
        toast.info('Resume updated — refreshed to latest version.', { duration: 3000 });
      } else {
        // Dirty local state + newer server version → wire into the SyncConflictDialog flow
        setConflict(
          { resumeId: currentResumeId, updates: currentResume, timestamp: Date.now() },
          serverUpdatedAt
        );
      }
      // Update the baseline so we don't re-fire on the same server version
      localLoadedAtRef.current = serverUpdatedAt;
    }
  }, [resumeFromDb, currentResume, currentResumeId, user, setCurrentResumeId, navigate, setConflict]);

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
  const [showProofread, setShowProofread] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [lastAppliedJobInfo, setLastAppliedJobInfo] = useState<{ title: string; company: string; resumeId?: string; jobUrl?: string } | null>(null);
  const [moreSubSection, setMoreSubSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return localStorage.getItem('wr-live-preview') === 'true';
    }
    return false;
  });
  const [showATSBadge, setShowATSBadge] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
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
  const isMobile = useIsMobile();
  // Auto-open Tailor sheet if navigated with ?openTailor=1 or ?tailor=true
  useEffect(() => {
    if (searchParams.get('openTailor') === '1' || searchParams.get('tailor') === 'true') {
      setShowTailor(true);
      // Clean up all tailor-related params
      searchParams.delete('openTailor');
      searchParams.delete('tailor');
      searchParams.delete('jobTitle');
      searchParams.delete('company');
      searchParams.delete('jobCompany');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Track last saved version to detect changes
  const lastSavedResumeRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScoreTimeRef = useRef<number>(0);

  // Background ATS scoring uses standalone function (no hook state to avoid re-render loops)
  
  // Smart tab change handler with auto-scroll
  const handleTabChange = useCallback((newTab: string) => {
    const optionalIds = ['awards','projects','certifications','publications','volunteering','languages','hobbies','references'];
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

  // Use ref to decouple saveToCloud from currentResume dependency
  const resumeRef = useRef(currentResume);
  resumeRef.current = currentResume;

  // Auto-save for authenticated users (stable callback - no currentResume dep)
  const saveToCloud = useCallback(async () => {
    const resume = resumeRef.current;
    if (!user || !currentResumeId || !resume) return;
    
    const currentResumeJson = JSON.stringify(resume);
    if (currentResumeJson === lastSavedResumeRef.current) return;

    // Fix 3: Pre-save online conflict guard
    // Compare the server's updated_at (from React Query cache) against the timestamp
    // we recorded when this session first loaded the resume. If another device has
    // saved since we loaded, block the write and show the conflict dialog instead.
    const serverUpdatedAt = resumeFromDb?.updated_at;
    const sessionLoadedAt = localLoadedAtRef.current;
    if (serverUpdatedAt && sessionLoadedAt && serverUpdatedAt > sessionLoadedAt) {
      // Another device has saved a newer version since we loaded — show SyncConflictDialog
      setConflict(
        { resumeId: currentResumeId, updates: resume, timestamp: Date.now() },
        serverUpdatedAt
      );
      setIsSaving(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await updateResume.mutateAsync({
        resumeId: currentResumeId,
        updates: resume,
      });
      lastSavedResumeRef.current = currentResumeJson;
      setLastSavedAt(new Date());
      // Update our baseline timestamp so subsequent saves don't false-positive
      if (resumeFromDb?.updated_at) {
        localLoadedAtRef.current = resumeFromDb.updated_at;
      }

      // Throttled background ATS re-score (max once per 60s)
      if (currentResumeId && resume && Date.now() - lastScoreTimeRef.current > 60_000) {
        lastScoreTimeRef.current = Date.now();
        const rid = currentResumeId;
        const snap = resume;
        // Use content hash as cache key so identical content always hits cache
        const contentHash = btoa(unescape(encodeURIComponent(JSON.stringify(snap)))).slice(0, 64);
        const scheduleScore = () => backgroundScore(rid, snap, contentHash);
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(scheduleScore);
        } else {
          setTimeout(scheduleScore, 200);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const isNetworkError = !navigator.onLine ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError');
      const isAuthError = errorMessage.includes('401') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('jwt expired') ||
        errorMessage.toLowerCase().includes('invalid jwt');

      if (isNetworkError && currentResumeId) {
        addPendingChange(currentResumeId, resume);
        // Don't show error toast - OfflineIndicator handles it
      } else if (isAuthError) {
        // Session expired mid-edit — data is safe, redirect is imminent
        toast.warning('Session expired — your changes are saved locally. Please sign back in.', { duration: 5000 });
      } else {
        console.error('Auto-save failed:', error);
        // Flaky network: technically online but request failed — reassure user
        toast.warning('Auto-save failed — your changes are safe locally and will retry.', { duration: 4000 });
      }
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResumeId, updateResume, setIsSaving, setLastSavedAt, addPendingChange, resumeFromDb, setConflict]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!user || !currentResumeId || !currentResume) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud();
    }, 3000); // 3 second debounce
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentResume, user, currentResumeId, saveToCloud]);

  // Clean up save timeout on unmount (save-on-unmount removed to prevent setState infinite loop)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Draft save on keyboard close
  useEffect(() => {
    const handleKbClose = () => saveToCloud();
    window.addEventListener('keyboard-close', handleKbClose);
    return () => window.removeEventListener('keyboard-close', handleKbClose);
  }, [saveToCloud]);

  // Flush cloud save immediately when app goes to background (mobile multitasking resilience)
  useAppLifecycle({
    onBackground: useCallback(() => {
      // Cancel the pending 3s debounce so we don't double-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Fire-and-forget immediate save
      saveToCloud();
    }, [saveToCloud]),
  });

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

  // Derived: unsaved changes exist (between edits and save debounce)
  const hasUnsavedChanges = useMemo(() => {
    if (!currentResume || !lastSavedResumeRef.current) return false;
    if (isSaving || showSavedCheck) return false;
    return JSON.stringify(currentResume) !== lastSavedResumeRef.current;
  }, [currentResume, isSaving, showSavedCheck]);
  useEffect(() => {
    if (prevIsSaving.current && !isSaving) {
      setShowSavedCheck(true);
      const timer = setTimeout(() => setShowSavedCheck(false), 2000);
      return () => clearTimeout(timer);
    }
    prevIsSaving.current = isSaving;
  }, [isSaving]);


  // Memoize steps array – dynamically includes optional sections that have data
  const steps = useMemo(() => {
    const base = [
      { id: 'contact', label: 'Contact' },
      { id: 'summary', label: 'Summary' },
      { id: 'experience', label: 'Work' },
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
  }, [currentResume]);

  // Granular section scores — each memo only re-runs when its own slice changes,
  // so typing in Summary does NOT recompute contactScore/experienceScore/etc.
  const contactScore    = useMemo(() => currentResume ? calcContactScore(currentResume.contactInfo)   : 0, [currentResume?.contactInfo]);
  const summaryScore    = useMemo(() => currentResume ? calcSummaryScore(currentResume.summary)        : 0, [currentResume?.summary]);
  const experienceScore = useMemo(() => currentResume ? calcExperienceScore(currentResume.experience)  : 0, [currentResume?.experience]);
  const educationScore  = useMemo(() => currentResume ? calcEducationScore(currentResume.education)    : 0, [currentResume?.education]);
  const skillsScore     = useMemo(() => currentResume ? calcSkillsScore(currentResume.skills)          : 0, [currentResume?.skills]);
  const sectionScores   = useMemo(() => ({
    contact: contactScore, summary: summaryScore, experience: experienceScore, education: educationScore, skills: skillsScore,
  }), [contactScore, summaryScore, experienceScore, educationScore, skillsScore]);

  // Overall score for ATS badge (local, no API call)
  const overallScore = useMemo(() => {
    if (!currentResume) return 0;
    return calcOverallScore(currentResume);
  }, [currentResume]);

  // Track score changes for celebration toasts
  const prevScoreRef = useRef(overallScore);
  useEffect(() => {
    const prev = prevScoreRef.current;
    prevScoreRef.current = overallScore;
    if (overallScore - prev >= 5 && prev > 0) {
      toast.success(`Score improved to ${overallScore}%!`, { duration: 2000 });
    }
  }, [overallScore]);

  // Build a local health score object for the ATS breakdown widget
  const localHealthScore = useMemo((): ResumeHealthScore | null => {
    if (!currentResume) return null;
    return {
      overallScore,
      categories: {
        keywordOptimization: sectionScores.skills,
        contentQuality: sectionScores.experience,
        sectionStructure: Math.round((sectionScores.contact + sectionScores.education + sectionScores.skills + sectionScores.experience) / 4),
        parsability: sectionScores.education,
        contactCompleteness: sectionScores.contact,
        lengthDensity: Math.round((sectionScores.experience + sectionScores.education) / 2),
      },
      topStrength: '',
      topImprovement: overallScore < 70 ? 'Fill in more sections to improve your score' : '',
      scoredAt: new Date().toISOString(),
    };
  }, [overallScore, sectionScores, currentResume]);

  // Derive boolean completedSteps for StepperNav (includes optional sections)
  const sectionStatus = useMemo(() => {
    const status: Record<string, boolean> = {
      contact: sectionScores.contact >= 100,
      summary: sectionScores.summary >= 100,
      experience: sectionScores.experience >= 100,
      education: sectionScores.education >= 100,
      skills: sectionScores.skills >= 100,
    };
    if (currentResume) {
      const optionalIds = ['awards','projects','certifications','publications','volunteering','languages','hobbies','references'];
      for (const id of optionalIds) {
        const data = currentResume[id as keyof typeof currentResume];
        if (Array.isArray(data) && data.length > 0) {
          status[id] = true;
        }
      }
    }
    return status;
  }, [sectionScores, currentResume]);

  // Section completion celebrations
  const prevCompletedRef = useRef<Record<string, boolean>>({});
  
  const CELEBRATION_MESSAGES: Record<string, string> = useMemo(() => ({
    contact: 'Excellent! Contact section complete 🎉',
    summary: 'Summary nailed! 🎉',
    experience: 'Work experience locked in! 🎉',
    education: 'Education section complete! 🎉',
    skills: 'Skills section complete! Your resume is looking great! 🎉',
  }), []);

  const NEXT_STEP_MESSAGES: Record<string, string> = useMemo(() => ({
    contact: 'Next: Write your professional summary →',
    summary: 'Next: Add your work experience →',
    experience: 'Next: Add your education details →',
    education: 'Next: List your key skills →',
  }), []);

  const [justCompletedStep, setJustCompletedStep] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentResume) return;
    const prev = prevCompletedRef.current;
    const sectionIds = ['contact', 'summary', 'experience', 'education', 'skills'] as const;
    
    for (const id of sectionIds) {
      const nowComplete = sectionScores[id] >= 100;
      if (nowComplete && prev[id] === false) {
        // Celebration toast immediately
        toast.success(CELEBRATION_MESSAGES[id], { duration: 3000 });

        // Confetti animation on stepper icon
        setJustCompletedStep(id);
        confettiTimeoutRef.current = setTimeout(() => setJustCompletedStep(null), 1500);

        // Delayed next-step toast
        const nextMsg = NEXT_STEP_MESSAGES[id];
        if (nextMsg) {
          toastTimeoutRef.current = setTimeout(() => {
            toast(nextMsg, { duration: 4000, icon: '→' });
          }, 2000);
        }
      }
      prev[id] = nowComplete;
    }

  }, [sectionScores, CELEBRATION_MESSAGES, NEXT_STEP_MESSAGES, currentResume, user]);

  const handleImproveSection = useCallback(() => {
    setShowTailor(true);
  }, []);

  const handleBack = useCallback(() => {
    unsavedGuard.interceptNavigate(getBackRoute('/editor'));
  }, [unsavedGuard]);

  const handleChangeTemplate = useCallback(() => setShowTemplates(true), []);
  const handleTailor = useCallback(() => {
    setShowTailor(true);
  }, []);
  const handleAnalyze = useCallback(() => setShowJobSheet(true), []);
  const handleRecruiterSim = useCallback(() => setShowRecruiterSim(true), []);
  const handleAIDetector = useCallback(() => setShowAIDetector(true), []);
  const handleLinkedIn = useCallback(() => setShowLinkedIn(true), []);
  const handleOnePage = useCallback(() => setShowOnePage(true), []);
  const handleCareerPath = useCallback(() => setShowCareerPath(true), []);
  const handleGetIdeas = useCallback(() => setShowContentLibrary(true), []);
  const handleCustomize = useCallback(() => setShowCustomize(true), []);
  const handleProofread = useCallback(() => setShowProofread(true), []);

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
    'proofread': { description: 'Fix grammar & typos', iconColor: 'text-red-500' },
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
        { id: 'ats-scan', label: 'ATS Scan', icon: Sparkles, onClick: () => setShowATSScan(true) },
        { id: 'proofread', label: 'Proofread', icon: Scissors, onClick: handleProofread },
      ],
    };
    return [quickActions, aiFeatures];
  }, [user, currentResumeId, handleCustomize, handleTailor, handleProofread]);

  // Extract editor content into a render function for reuse in both layouts
  const renderEditorContent = useCallback(() => (
    <>
      {activeTab === 'contact' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={User} title="Contact Information" tip="Include a professional email and phone number" status={getSectionStatus(sectionScores.contact)} action={<SectionAIAction section="contact" />}>
            <Suspense fallback={<ContactSectionSkeleton />}><ContactSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'summary' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
            <Suspense fallback={<SummarySectionSkeleton />}><SummarySection /></Suspense>
            <ATSInlineSuggestions section="summary" suggestions={getATSSuggestions('summary')} isAnalyzing={isAnalyzingSection('summary')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['summary']} onApplyDeep={(improved) => handleApplyDeep('summary', improved)} onDiscardDeep={() => clearDeepResult('summary')} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'experience' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
            <Suspense fallback={<ExperienceSectionSkeleton />}><ExperienceSection /></Suspense>
            <ATSInlineSuggestions section="experience" suggestions={getATSSuggestions('experience')} isAnalyzing={isAnalyzingSection('experience')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['experience']} onApplyDeep={(improved) => handleApplyDeep('experience', improved)} onDiscardDeep={() => clearDeepResult('experience')} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'education' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
            <Suspense fallback={<EducationSectionSkeleton />}><EducationSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="education" suggestions={getATSSuggestions('education')} isAnalyzing={isAnalyzingSection('education')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['education']} onApplyDeep={(improved) => handleApplyDeep('education', improved)} onDiscardDeep={() => clearDeepResult('education')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'skills' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Wrench} title="Skills" tip="Add at least 5 relevant skills for ATS optimization" status={getSectionStatus(sectionScores.skills)} action={<SectionAIAction section="skills" />}>
            <Suspense fallback={<SkillsSectionSkeleton />}><SkillsSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="skills" suggestions={getATSSuggestions('skills')} isAnalyzing={isAnalyzingSection('skills')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['skills']} onApplyDeep={(improved) => handleApplyDeep('skills', improved)} onDiscardDeep={() => clearDeepResult('skills')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'more' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          {!moreSubSection ? (
            <SectionCard icon={Plus} title="More Sections" tip="Add optional sections to stand out">
              <AddSectionSheet onSelectSection={(s) => setMoreSubSection(s)} />
            </SectionCard>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setMoreSubSection(null)} className="text-sm text-primary flex items-center gap-1 active:scale-95 touch-manipulation min-h-[44px]">
                <ChevronLeft className="w-4 h-4" /> All Sections
              </button>
              <Suspense fallback={<ListSectionSkeleton />}>
                {(() => {
                  const MORE_SECTION_COMPONENTS: Record<string, { icon: typeof Trophy; title: string; hasAI: boolean; Component: React.LazyExoticComponent<React.ComponentType> }> = {
                    awards: { icon: Trophy, title: 'Awards & Achievements', hasAI: true, Component: AwardsSection },
                    projects: { icon: Rocket, title: 'Projects', hasAI: true, Component: ProjectsSection },
                    certifications: { icon: Award, title: 'Certifications', hasAI: true, Component: CertificationsSection },
                    publications: { icon: BookOpen, title: 'Publications', hasAI: true, Component: PublicationsSection },
                    volunteering: { icon: Heart, title: 'Volunteering', hasAI: true, Component: VolunteeringSection },
                    languages: { icon: Globe, title: 'Languages', hasAI: true, Component: LanguagesSection },
                    hobbies: { icon: Palette, title: 'Hobbies & Interests', hasAI: false, Component: HobbiesSection },
                    references: { icon: Users, title: 'References', hasAI: false, Component: ReferencesSection },
                  };
                  const config = MORE_SECTION_COMPONENTS[moreSubSection!];
                  if (!config) {
                    setMoreSubSection(null);
                    return null;
                  }
                  const { icon, title, hasAI, Component } = config;
                  return (
                    <SectionCard icon={icon} title={title} action={hasAI ? <SectionAIAction section={moreSubSection! as any} /> : undefined}>
                      <Component />
                    </SectionCard>
                  );
                })()}
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex flex-row items-center gap-2 sm:gap-3 pt-3 pb-4 overflow-hidden">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 min-h-[48px]"
          onClick={() => {
            haptics.light();
            const currentIndex = steps.findIndex(s => s.id === activeTab);
            if (currentIndex > 0) handleTabChange(steps[currentIndex - 1].id);
          }}
          disabled={activeTab === steps[0].id}
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>
        {activeTab === steps[steps.length - 1].id ? (
          <Button
            size="lg"
            className="flex-1 min-w-0 min-h-[48px] text-sm gradient-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
            onClick={() => {
              haptics.success();
              navigate('/preview');
            }}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Preview & Export
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 min-w-0 min-h-[48px]"
            onClick={() => {
              haptics.medium();
              const currentIndex = steps.findIndex(s => s.id === activeTab);
              if (currentIndex < steps.length - 1) handleTabChange(steps[currentIndex + 1].id);
            }}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
      {/* Spacer to fill remaining viewport height */}
      <div className="flex-1" />
    </>
  ), [activeTab, sectionScores, moreSubSection, steps, handleTabChange, navigate, jobDescription, getATSSuggestions, isAnalyzingSection, fetchDeepSuggestions, deepResults, handleApplyDeep, clearDeepResult]);

  // Proofread hook
  const { issues: proofreadIssues, score: proofreadScore, isChecking: isProofreadChecking, checkNow, fixIssue, ignoreIssue, fixAll } = useProofread(currentResume);
  const proofreadIssueCount = proofreadIssues.length;
  const proofreadErrorCount = proofreadIssues.filter(i => i.type === 'spelling' || i.type === 'grammar').length;
  const autoProofread = useSettingsStore((s) => s.autoProofread);

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
  // Auth guard handled by ProtectedRoute
  if (!storeHydrated) return <EditorSkeleton />;
  if (!currentResumeId && !currentResume) return <Navigate to="/dashboard" replace />;
  // Show skeleton while DB fetch is in flight — but as soon as resumeFromDb arrives,
  // the hydration effect will fire and populate currentResume in the same micro-task tick.
  // This reduces perceived wait by one full render cycle vs waiting for the effect.
  if (!currentResume && isValidating) return <EditorSkeleton />;
  if (!currentResume && !resumeFromDb) return <EditorSkeleton />;
  if (!currentResume) return <EditorSkeleton />;
  // === Past this point, currentResume is guaranteed non-null ===

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-card">
      {/* Header */}
      <header className="editor-header shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <button 
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                className="flex items-center gap-1 min-w-0 max-w-[40vw] sm:max-w-[55vw] cursor-pointer hover:text-primary/80 transition-colors active:scale-95 touch-manipulation"
                title={resumeFromDb?.title || currentResume?.contactInfo?.fullName || 'Edit Resume'}
                onClick={() => navigate('/dashboard')}
                aria-label="Switch resume"
              >
                <span className="text-h3 truncate">
                  {resumeFromDb?.title || currentResume?.contactInfo?.fullName || 'Edit Resume'}
                </span>
                {/* ChevronDown removed — tapping title navigates to dashboard */}
              </button>
              <OfflineIndicator isSyncing={isSyncing} />
              {/* Undo/Redo buttons */}
              <div className="hidden sm:flex items-center gap-0.5">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={cn(
                    'p-2 rounded-lg transition-all touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center',
                    canUndo ? 'hover:bg-muted text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
                  )}
                  aria-label={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
                  title={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={cn(
                    'p-2 rounded-lg transition-all touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center',
                    canRedo ? 'hover:bg-muted text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
                  )}
                  aria-label={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
                  title={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
              {user && currentResumeId && (
                <button
                  onClick={() => setShowVersionHistory(true)}
                  className="keyboard-hide p-2 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation hidden sm:inline-flex min-w-[44px] min-h-[44px] items-center justify-center"
                  aria-label="Version history"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
          </div>
          {/* Desktop buttons - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Template gallery shortcut */}
            <button
              onClick={() => { handleChangeTemplate(); haptics.light(); }}
              className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:bg-muted text-muted-foreground"
              aria-label="Open template gallery"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">Template</span>
            </button>
            {/* Design shortcut */}
            <button
              onClick={() => { handleCustomize(); haptics.light(); }}
              className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:bg-muted text-muted-foreground"
              aria-label="Open design customization"
            >
              <Palette className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">Design</span>
            </button>
            {/* Live Preview Toggle */}
            <button
              onClick={() => {
                setShowPreview(v => {
                  const next = !v;
                  localStorage.setItem('wr-live-preview', String(next));
                  return next;
                });
                haptics.light();
              }}
              className={cn(
                'keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95',
                showPreview ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
              )}
              aria-label={showPreview ? 'Hide live preview' : 'Show live preview'}
            >
              {showPreview ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              <span className="text-[9px] font-medium leading-none">{showPreview ? 'Hide' : 'Live'}</span>
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 -mr-2 bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.5)] hover:bg-primary/15 active:scale-95"
              aria-label="Open Wise AI Chat"
            >
              <span className="relative">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              </span>
              <span className="text-[9px] font-medium leading-none text-primary">Wise AI</span>
            </button>
          </div>
          {/* Mobile-only: consolidated tools trigger (Sheet-based for portal rendering) */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => { haptics.light(); if (!templateBtnSeen) { localStorage.setItem('template_btn_seen', 'true'); setTemplateBtnSeen(true); } setShowTemplates(true); }}
              className="relative rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-muted hover:bg-muted/80 touch-manipulation"
              aria-label="Change template"
            >
              {!templateBtnSeen && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-[ping_1.5s_ease-out_3]" />}
              <LayoutGrid className={`w-5 h-5 ${templateBtnSeen ? 'text-muted-foreground' : 'text-primary'}`} />
              <span className={`text-[9px] font-medium leading-none ${templateBtnSeen ? 'text-muted-foreground' : 'text-primary'}`}>Template</span>
            </button>
            <button
              onClick={() => { haptics.light(); setShowChat(true); }}
              className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation"
              aria-label="Open Wise AI Chat"
            >
              <span className="relative">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              </span>
              <span className="text-[9px] font-medium leading-none text-primary">Chat</span>
            </button>
          </div>
        </div>
      </header>


        {/* Progress Bar with Save Status — compact on mobile, full on desktop */}
        <div className="shrink-0 px-4 py-1 sm:py-3 border-b border-border">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <ProgressBar resume={currentResume} compact />
            </div>
            {user && currentResumeId && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                {!isOnline ? (
                  <>
                    <CloudOff className="w-3 h-3 text-warning" />
                    <span className="text-warning hidden xs:inline">Offline</span>
                  </>
                ) : isSaving ? (
                  <Cloud className="w-3 h-3 animate-pulse" />
                ) : showSavedCheck ? (
                  <Check className="w-3 h-3 text-success" style={{ animation: 'save-check-pop 0.3s ease-out' }} />
                ) : hasUnsavedChanges ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                ) : (
                  <Cloud className="w-3 h-3 opacity-40" />
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
                    onImprove={() => setShowTailor(true)}
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

        {/* Stepper Nav */}
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
        />
        </div>

        {/* Editor + Preview layout */}
        {isMobile ? (
          <Tabs
            value={mobileEditorTab}
            onValueChange={(v) => setMobileEditorTab(v as 'editor' | 'preview' | 'ats')}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
              <div
                className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-24 space-y-0"
                ref={scrollContainerRef}
              >
                <div className="flex flex-col min-h-full flex-1">
                  {renderEditorContent()}
                </div>
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
            <TabsContent value="ats" className="flex-1 min-h-0 overflow-hidden mt-0">
              {mobileEditorTab === 'ats' && (
                <Suspense fallback={null}>
                  <ATSParserPreview />
                </Suspense>
              )}
            </TabsContent>
          </Tabs>
        ) : showPreview ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={55} minSize={35}>
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                <div
                  className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
                  ref={scrollContainerRef}
                >
                  {renderEditorContent()}
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
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              <div
                className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-8 pb-safe space-y-0"
                ref={scrollContainerRef}
              >
                {renderEditorContent()}
              </div>
            </div>
          </div>
        )}


        {/* Proofread FAB */}
        <ProofreadButton
          issueCount={proofreadIssueCount}
          errorCount={proofreadErrorCount}
          isChecking={isProofreadChecking}
          onClick={handleProofread}
        />

      {/* Keyboard Toolbar - floats above keyboard */}
      <KeyboardToolbar />

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
          {showProofread && (
            <ProofreadSheet
              open={showProofread}
              onOpenChange={setShowProofread}
              issues={proofreadIssues}
              score={proofreadScore}
              isChecking={isProofreadChecking}
              onFix={fixIssue}
              onIgnore={ignoreIssue}
              onFixAll={fixAll}
              onCheckNow={checkNow}
              autoProofread={autoProofread}
            />
          )}
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

      {/* Add Section FAB (mobile only, hidden on "more" tab) */}
      {isMobile && activeTab !== 'more' && (
        <AddSectionFAB
          onSelectSection={(sectionId) => {
            handleMoreSectionSelect(sectionId);
          }}
        />
      )}

    </main>
  );
}

// ─── Add Section FAB ─────────────────────────────────────────────────────────
function AddSectionFAB({ onSelectSection }: { onSelectSection: (id: string) => void }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState(() => localStorage.getItem('wr-add-section-seen') === '1');
  const prefersReduced = useReducedMotion();

  const handleFabTap = () => {
    haptics.medium();
    if (!hasSeen) {
      localStorage.setItem('wr-add-section-seen', '1');
      setHasSeen(true);
    }
    setSheetOpen(true);
  };

  return (
    <>
      <motion.button
        onClick={handleFabTap}
        className="fixed z-40 md:hidden w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center touch-manipulation active:scale-95"
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom))',
          right: '1rem',
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
        }}
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        aria-label="Add section"
      >
        <motion.div
          animate={{ rotate: sheetOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        {/* First-visit pulse */}
        {!hasSeen && !sheetOpen && (
          <span className="absolute inset-0 rounded-full gradient-primary animate-[ping_1.5s_ease-out_4] pointer-events-none" />
        )}
      </motion.button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Section</SheetTitle>
          </SheetHeader>
          <div className="pt-2">
            <AddSectionSheet
              onSelectSection={(id) => {
                onSelectSection(id);
                setSheetOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
