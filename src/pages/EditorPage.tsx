import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue, lazy, Suspense, CSSProperties } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Download, ChevronRight, ChevronLeft, Check, Cloud, CloudOff, ArrowLeft, Sparkles, MessageSquare, Lock, User, AlignLeft, Briefcase, GraduationCap, Wrench, Clock, Info, X, Plus, Trophy, Rocket, BookOpen, Heart, Palette, Users, Eye, Award, Globe, PanelLeftClose, PanelLeft, ChevronDown, ChevronUp, BarChart3, Undo2, Redo2, Scissors } from 'lucide-react';
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
import { NextStepBanner } from '@/components/editor/NextStepBanner';
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
const LivePreviewPanel = lazy(() => import('@/components/editor/LivePreviewPanel').then(m => ({ default: m.LivePreviewPanel })));
const LivePreviewSheet = lazy(() => import('@/components/editor/LivePreviewSheet').then(m => ({ default: m.LivePreviewSheet })));
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ATSScoreBreakdown, getScoreColorClass } from '@/components/dashboard/ATSScoreBreakdown';
import { useResumeScore, ResumeHealthScore, backgroundScore } from '@/hooks/useResumeScore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { KeyboardToolbar } from '@/components/editor/KeyboardToolbar';
import { OfflineIndicator } from '@/components/editor/OfflineIndicator';
import { EditorSkeleton, SectionSkeleton } from '@/components/layout/PageSkeletons';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ActionsPanel, type ActionsPanelGroup } from '@/components/ActionsPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Target } from 'lucide-react';
import { useProofread } from '@/hooks/useProofread';
import { ProofreadButton } from '@/components/editor/ProofreadButton';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { selectErrorCount, selectIssueCount } from '@/store/proofreadStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { useBackButton } from '@/hooks/useBackButton';
export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const storeHydrated = useResumeStoreHydration();
  const { hasSeenAIIntro, setHasSeenAIIntro } = useSettingsStore();

  // Use shallow selector to prevent unnecessary re-renders when unrelated store parts change
  const { 
    currentResume, 
    currentResumeId,
    matchScore, 
    jobDescription,
    selectedTemplate,
    isSaving,
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
    setIsSaving: state.setIsSaving,
    setLastSavedAt: state.setLastSavedAt,
    setCurrentResumeId: state.setCurrentResumeId,
  })));
  
  // Validate that the resume ID exists in the database
  const { data: resumeFromDb, isLoading: isValidating } = useResume(currentResumeId);
  const { updateResume } = useResumeMutations();

  // Single hydration effect: sync DB data into Zustand store + ownership check
  useEffect(() => {
    if (!resumeFromDb || !currentResumeId) return;

    // Ownership check
    if (user && resumeFromDb.user_id !== user.id) {
      setCurrentResumeId(null);
      toast.error('Access denied.');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Hydrate store if needed
    if (!currentResume) {
      useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
      useResumeStore.getState().setSelectedTemplate(
        (resumeFromDb.template_id || 'modern') as import('@/types/resume').TemplateId
      );
    }
  }, [resumeFromDb, currentResume, currentResumeId, user, setCurrentResumeId, navigate]);

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
  const [mobileEditorTab, setMobileEditorTab] = useState<'editor' | 'preview'>('editor');
  const isMobile = useIsMobile();
  // Auto-open Tailor sheet if navigated with ?openTailor=1
  useEffect(() => {
    if (searchParams.get('openTailor') === '1') {
      setShowTailor(true);
      searchParams.delete('openTailor');
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

  // Use ref to decouple saveToCloud from currentResume dependency
  const resumeRef = useRef(currentResume);
  resumeRef.current = currentResume;

  // Auto-save for authenticated users (stable callback - no currentResume dep)
  const saveToCloud = useCallback(async () => {
    const resume = resumeRef.current;
    if (!user || !currentResumeId || !resume) return;
    
    const currentResumeJson = JSON.stringify(resume);
    if (currentResumeJson === lastSavedResumeRef.current) return;
    
    setIsSaving(true);
    try {
      await updateResume.mutateAsync({
        resumeId: currentResumeId,
        updates: resume,
      });
      lastSavedResumeRef.current = currentResumeJson;
      setLastSavedAt(new Date());

      // Throttled background ATS re-score (max once per 60s)
      if (currentResumeId && resume && Date.now() - lastScoreTimeRef.current > 60_000) {
        lastScoreTimeRef.current = Date.now();
        const rid = currentResumeId;
        const snap = resume;
        const scheduleScore = () => backgroundScore(rid, snap, new Date().toISOString());
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

      if (isNetworkError && currentResumeId) {
        addPendingChange(currentResumeId, resume);
        // Don't show error toast - OfflineIndicator handles it
      } else {
        console.error('Auto-save failed:', error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResumeId, updateResume, setIsSaving, setLastSavedAt, addPendingChange]);

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

  // Granular section scores
  const sectionScores = useMemo(() => {
    if (!currentResume) return { contact: 0, summary: 0, experience: 0, education: 0, skills: 0 };
    return {
      contact: calcContactScore(currentResume.contactInfo),
      summary: calcSummaryScore(currentResume.summary),
      experience: calcExperienceScore(currentResume.experience),
      education: calcEducationScore(currentResume.education),
      skills: calcSkillsScore(currentResume.skills),
    };
  }, [currentResume]);

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
        completeness: sectionScores.contact,
        atsReadiness: sectionScores.skills,
        impactLanguage: sectionScores.experience,
        formatting: sectionScores.education,
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
    navigate('/dashboard');
  }, [navigate]);

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
            <Suspense fallback={<SectionSkeleton />}><ContactSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'summary' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
            <Suspense fallback={<SectionSkeleton />}><SummarySection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="summary" suggestions={getATSSuggestions('summary')} isAnalyzing={isAnalyzingSection('summary')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['summary']} onApplyDeep={(improved) => handleApplyDeep('summary', improved)} onDiscardDeep={() => clearDeepResult('summary')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'experience' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
            <Suspense fallback={<SectionSkeleton />}><ExperienceSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="experience" suggestions={getATSSuggestions('experience')} isAnalyzing={isAnalyzingSection('experience')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['experience']} onApplyDeep={(improved) => handleApplyDeep('experience', improved)} onDiscardDeep={() => clearDeepResult('experience')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'education' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
            <Suspense fallback={<SectionSkeleton />}><EducationSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="education" suggestions={getATSSuggestions('education')} isAnalyzing={isAnalyzingSection('education')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['education']} onApplyDeep={(improved) => handleApplyDeep('education', improved)} onDiscardDeep={() => clearDeepResult('education')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'skills' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Wrench} title="Skills" tip="Add at least 5 relevant skills for ATS optimization" status={getSectionStatus(sectionScores.skills)} action={<SectionAIAction section="skills" />}>
            <Suspense fallback={<SectionSkeleton />}><SkillsSection /></Suspense>
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
              <Suspense fallback={<SectionSkeleton />}>
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
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-6 pb-2 overflow-hidden">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 min-h-[56px] sm:h-12"
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
            className="flex-1 min-w-0 min-h-[56px] sm:h-12 text-sm gradient-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
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
            className="flex-1 min-w-0 min-h-[56px] sm:h-12"
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
  if (!currentResume) return <EditorSkeleton />;
  // === Past this point, currentResume is guaranteed non-null ===

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="editor-header shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={handleBack}
                className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-h3 truncate">
                {resumeFromDb?.title || currentResume?.contactInfo?.fullName || 'Edit Resume'}
              </h1>
              <OfflineIndicator isSyncing={isSyncing} />
              {/* Undo/Redo buttons */}
              <div className="hidden xs:flex items-center gap-0.5">
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
              className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 -mr-2 bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.6)] hover:bg-primary/15 active:scale-95 animate-[pulse-glow_2s_ease-in-out_infinite]"
              aria-label="Open Wise AI Chat"
            >
              <span className="relative">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
              </span>
              <span className="text-[9px] font-medium leading-none text-primary">Wise AI</span>
            </button>
          </div>
          {/* Mobile-only: consolidated tools trigger (Sheet-based for portal rendering) */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => { haptics.light(); setShowToolsSheet(true); }}
              className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation"
              aria-label="Editor tools"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-[9px] font-medium leading-none text-primary">Tools</span>
            </button>
            <Sheet open={showToolsSheet} onOpenChange={setShowToolsSheet}>
              <SheetContent side="bottom" className="pb-safe max-h-[80dvh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Editor Tools</SheetTitle>
                </SheetHeader>
                <div className="pt-4 space-y-1">
                  {editorToolGroups.map((group, groupIndex) => (
                    <div key={group.id}>
                      {groupIndex > 0 && <Separator className="my-1" />}
                      {group.title && (
                        <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {group.title}
                        </p>
                      )}
                      {group.actions.map((action) => {
                        const Icon = action.icon;
                        const meta = toolMeta[action.id];
                        const isDestructive = action.variant === 'destructive';
                        return (
                          <button
                            key={action.id}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all min-h-[48px] touch-manipulation active:scale-95 hover:bg-muted",
                              isDestructive && "text-destructive hover:bg-destructive/10"
                            )}
                            onClick={() => {
                              haptics.light();
                              setShowToolsSheet(false);
                              action.onClick();
                            }}
                          >
                            {Icon && (
                              <Icon className={cn("h-5 w-5 shrink-0", isDestructive ? "text-destructive" : meta?.iconColor || "text-muted-foreground")} />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-medium">{action.label}</span>
                              {meta?.description && (
                                <span className="text-xs text-muted-foreground truncate">{meta.description}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>


        {/* Progress Bar with Save Status */}
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <style>{`
            @keyframes spring-enter {
              0% { opacity: 0; transform: translateY(12px) scale(0.98); }
              60% { opacity: 1; transform: translateY(-2px) scale(1.005); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes save-check-pop {
              0% { transform: scale(0); }
              60% { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
          `}</style>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
            <ProgressBar resume={currentResume} />
            {user && currentResumeId && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground sm:ml-2" aria-live="polite" aria-atomic="true">
                {!isOnline ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-warning" />
                    <span className="text-warning">Offline</span>
                  </>
                ) : isSaving ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 animate-pulse" />
                    <span>Saving...</span>
                  </>
                ) : showSavedCheck ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" style={{ animation: 'save-check-pop 0.3s ease-out' }} />
                    <span>Saved</span>
                  </>
                ) : null}
              </div>
            )}
            {user && !currentResumeId && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground sm:ml-2">
                <CloudOff className="w-3.5 h-3.5" />
                <span>Local</span>
              </div>
            )}
          </div>
          {/* Compact ATS Score Badge */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { setShowATSBadge(v => !v); haptics.light(); }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors touch-manipulation active:scale-95 min-h-[44px]"
              aria-expanded={showATSBadge}
              aria-label="Toggle completeness breakdown"
            >
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Completeness:</span>
              <span className={cn('text-xs font-bold', getScoreColorClass(overallScore))}>{overallScore}/100</span>
              {showATSBadge ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </button>
            <p className="text-[11px] sm:text-xs text-muted-foreground min-w-0 truncate">
              {steps.filter(s => s.id !== 'more' && sectionStatus[s.id]).length} of {steps.filter(s => s.id !== 'more').length} sections completed
            </p>
          </div>
          {showATSBadge && localHealthScore && (
            <div className="mt-2 border-t border-border pt-2">
              <ATSScoreBreakdown
                healthScore={localHealthScore}
                compact
                defaultOpen
                onImprove={() => setShowTailor(true)}
              />
            </div>
          )}
        </div>

        {/* Tailored Resume Indicator Banner */}
        {resumeFromDb?.parent_resume_id && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-primary/10 border-b border-primary/20" style={{ minHeight: 36 }}>
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
            onValueChange={(v) => setMobileEditorTab(v as 'editor' | 'preview')}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <TabsList className="w-full shrink-0 sticky top-0 z-10 rounded-none">
              <TabsTrigger value="editor" className="flex-1">Editor</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden mt-0">
              <div
                className="editor-scroll-container h-full overflow-y-auto px-4 py-4 pb-safe space-y-0"
                ref={scrollContainerRef}
              >
                {renderEditorContent()}
              </div>
            </TabsContent>
            <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0">
              <Suspense fallback={null}>
                <LivePreviewPanel highlightSection={activeTab} />
              </Suspense>
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
              <Suspense fallback={null}>
                <LivePreviewPanel
                  onClose={() => { setShowPreview(false); localStorage.setItem('wr-live-preview', 'false'); }}
                  highlightSection={activeTab}
                />
              </Suspense>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              <div
                className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-4 pb-safe space-y-0"
                ref={scrollContainerRef}
              >
                {renderEditorContent()}
              </div>
            </div>
          </div>
        )}

        {/* Next Step Banner - only show when most sections complete */}
        {sectionStatus.contact && sectionStatus.experience && sectionStatus.summary && sectionStatus.skills && (
          <NextStepBanner variant="preview" onAction={() => navigate('/preview')} />
        )}

        {/* AI Studio Bar removed — now lives at /ai-studio tab */}

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
          {showTemplates && <TemplateSelector open={showTemplates} onOpenChange={setShowTemplates} />}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} onApplied={handleTailorApplied} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showChat && <AgenticChatSheet open={showChat} onOpenChange={setShowChat} />}
          {showCareerPath && <CareerPathSheet open={showCareerPath} onOpenChange={setShowCareerPath} />}
          {showVersionHistory && <VersionHistorySheet open={showVersionHistory} onOpenChange={setShowVersionHistory} resumeId={currentResumeId} />}
          {showContentLibrary && <ContentLibrarySheet open={showContentLibrary} onOpenChange={setShowContentLibrary} onInsert={handleContentInsert} />}
          {showCustomize && <CustomizeSheet open={showCustomize} onOpenChange={setShowCustomize} customization={currentResume?.customization} onApply={handleCustomizeApply} />}
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
