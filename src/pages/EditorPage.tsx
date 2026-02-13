import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, CSSProperties } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));
import { Download, ChevronRight, ChevronLeft, Check, Cloud, CloudOff, ArrowLeft, Sparkles, Lock, User, AlignLeft, Briefcase, GraduationCap, Wrench, Clock, Info, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { calcContactScore, calcSummaryScore, calcExperienceScore, calcEducationScore, calcSkillsScore, calcOverallScore, getSectionStatus, getNextIncompleteSection } from '@/lib/resumeCompletionRules';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StepperNav } from '@/components/editor/StepperNav';
import { SectionCard } from '@/components/editor/SectionCard';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations, useResume } from '@/hooks/useResumes';
import { toast } from 'sonner';
import { ContactSection } from '@/components/editor/ContactSection';
import { SummarySection } from '@/components/editor/SummarySection';
import { ExperienceSection } from '@/components/editor/ExperienceSection';
import { EducationSection } from '@/components/editor/EducationSection';
import { SkillsSection } from '@/components/editor/SkillsSection';
import { AIAssistantBar } from '@/components/editor/AIAssistantBar';
import { SectionAIAction } from '@/components/editor/SectionAIAction';
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { useShallow } from 'zustand/react/shallow';
const ApplyPromptDialog = lazy(() => import('@/components/applications/ApplyPromptDialog').then(m => ({ default: m.ApplyPromptDialog })));

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
import { KeyboardToolbar } from '@/components/editor/KeyboardToolbar';
import { OfflineIndicator } from '@/components/editor/OfflineIndicator';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import haptics from '@/lib/haptics';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
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
  const { data: resumeFromDb, isLoading: isValidating, error: resumeError } = useResume(currentResumeId);
  const { updateResume } = useResumeMutations();
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
  const [activeTab, setActiveTab] = useState('contact');
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [lastAppliedJobInfo, setLastAppliedJobInfo] = useState<{ title: string; company: string; resumeId?: string; jobUrl?: string } | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [signInPromptContext, setSignInPromptContext] = useState<{ title: string; description: string } | null>(null);
  const signInPromptShownRef = useRef(false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(() => sessionStorage.getItem('wr-editor-guest-dismissed') === 'true');

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
  
  // Smart tab change handler with auto-scroll
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    // Scroll content to top smoothly when switching tabs
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Detect and handle stale resume IDs
  useEffect(() => {
    if (currentResumeId && !isValidating && !resumeFromDb && resumeError) {
      console.warn('Stale resume ID detected, clearing...', currentResumeId);
      setCurrentResumeId(null);
      toast.error('Resume not found. Please select a resume from the dashboard.');
      navigate('/dashboard');
    }
  }, [currentResumeId, isValidating, resumeFromDb, resumeError, setCurrentResumeId, navigate]);

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
    } catch (error: any) {
      const isNetworkError = !navigator.onLine ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError');

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

  // Warn guests about unsaved data loss (H6)
  useEffect(() => {
    if (user || !currentResume) return;

    const hasContent = currentResume.contactInfo?.fullName || currentResume.summary || currentResume.experience?.length > 0;
    if (!hasContent) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentResume]);

  // Memoize steps array to prevent StepperNav re-renders
  const steps = useMemo(() => [
    { id: 'contact', label: 'Contact' },
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Work' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
  ], []);

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

  // Derive boolean completedSteps for StepperNav
  const sectionStatus = useMemo(() => ({
    contact: sectionScores.contact >= 100,
    summary: sectionScores.summary >= 100,
    experience: sectionScores.experience >= 100,
    education: sectionScores.education >= 100,
    skills: sectionScores.skills >= 100,
  }), [sectionScores]);

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

    // Strategic sign-in prompt for guests after completing 2 sections
    if (!user && !signInPromptShownRef.current && sessionStorage.getItem('wr-signin-prompt-shown') !== '1') {
      const completedCount = sectionIds.filter(id => sectionScores[id] >= 100).length;
      if (completedCount >= 2) {
        signInPromptShownRef.current = true;
        sessionStorage.setItem('wr-signin-prompt-shown', '1');
        setSignInPromptContext({
          title: "You're making great progress! 🎉",
          description: 'Sign in to save your work and continue on any device.',
        });
        setShowSignInPrompt(true);
      }
    }
  }, [sectionScores, CELEBRATION_MESSAGES, NEXT_STEP_MESSAGES, currentResume, user]);

  // Resume guard - redirect to appropriate page based on auth state
  if (!currentResume) {
    return <Navigate to={user ? '/dashboard' : '/'} replace />;
  }

  const handleImproveSection = useCallback(() => {
    // For now, open tailor sheet - could be enhanced to improve specific section
    setShowTailor(true);
  }, []);

  const handleBack = useCallback(() => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const handleChangeTemplate = useCallback(() => setShowTemplates(true), []);
  const handleTailor = useCallback(() => {
    if (!user) {
      setSignInPromptContext({
        title: 'Unlock AI-Tailored Resumes',
        description: 'Sign in to tailor your resume for specific job postings.',
      });
      setShowSignInPrompt(true);
      return;
    }
    setShowTailor(true);
  }, [user]);
  const handleAnalyze = useCallback(() => setShowJobSheet(true), []);
  const handleRecruiterSim = useCallback(() => setShowRecruiterSim(true), []);
  const handleAIDetector = useCallback(() => setShowAIDetector(true), []);
  const handleLinkedIn = useCallback(() => setShowLinkedIn(true), []);
  const handleOnePage = useCallback(() => setShowOnePage(true), []);
  const handleCareerPath = useCallback(() => setShowCareerPath(true), []);
  const handleTailorApplied = useCallback((info: { title: string; company: string; resumeId?: string; jobUrl?: string }) => {
    setLastAppliedJobInfo(info);
    setShowApplyPrompt(true);
  }, []);
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
      {/* Header */}
      <header className="editor-header shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-h3 truncate">Edit Resume</h1>
            <OfflineIndicator isSyncing={isSyncing} />
            {user && currentResumeId && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="keyboard-hide p-2 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation"
                aria-label="Version history"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (user) {
                      setShowChat(true);
                    } else {
                      setSignInPromptContext({ title: 'Unlock Wise AI', description: 'Sign in to access AI-powered resume editing.' });
                      setShowSignInPrompt(true);
                    }
                  }}
                  className={`keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[52px] min-h-[52px] flex items-center justify-center -mr-2 ${
                    user
                      ? 'bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.6)] hover:bg-primary/15 active:scale-95 animate-[pulse-glow_2s_ease-in-out_infinite]'
                      : 'opacity-50 cursor-pointer hover:opacity-70 active:scale-95'
                  }`}
                  aria-label="Open Wise AI"
                >
                  <Sparkles className={`w-5 h-5 ${user ? 'text-primary' : 'text-muted-foreground'}`} />
                  {user && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  {!user && (
                    <Lock className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-muted-foreground bg-background rounded-full p-[1px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {user ? 'Click for AI assistance' : 'Sign in to unlock Wise AI'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

        {/* Guest Info Banner */}
        {!user && !guestBannerDismissed && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-sm text-foreground truncate">
                  Working as guest — <span className="text-muted-foreground">Sign in to save permanently</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" className="h-7 text-xs px-3" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <button
                  onClick={() => {
                    setGuestBannerDismissed(true);
                    sessionStorage.setItem('wr-editor-guest-dismissed', 'true');
                  }}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-1">
            <ProgressBar resume={currentResume} />
            {user && currentResumeId && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                {isSaving ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 animate-pulse" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" style={{ animation: 'save-check-pop 0.3s ease-out' }} />
                    <span>Saved</span>
                  </>
                )}
              </div>
            )}
            {user && !currentResumeId && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <CloudOff className="w-3.5 h-3.5" />
                <span>Local</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {Object.values(sectionStatus).filter(Boolean).length} of {Object.keys(sectionStatus).length} sections completed
          </p>
        </div>

        {/* Stepper Nav */}
        <div className="shrink-0">
        <StepperNav
          steps={steps}
          activeStep={activeTab}
          completedSteps={sectionStatus}
          sectionScores={sectionScores}
          onStepClick={handleTabChange}
          justCompletedStep={justCompletedStep}
        />
        </div>

        {/* Editor Tabs (hidden tab list, content driven by stepper) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="editor-scroll-container flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
            ref={scrollContainerRef}
          >
            {activeTab === 'contact' && (
              <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
                <SectionCard icon={User} title="Contact Information" tip="Include a professional email and phone number" status={getSectionStatus(sectionScores.contact)} action={<SectionAIAction section="contact" />}>
                  <ContactSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'summary' && (
              <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
                <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
                  <SummarySection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'experience' && (
              <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
                <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
                  <ExperienceSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'education' && (
              <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
                <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
                  <EducationSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'skills' && (
              <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
                <SectionCard icon={Wrench} title="Skills" tip="Add at least 5 relevant skills for ATS optimization" status={getSectionStatus(sectionScores.skills)} action={<SectionAIAction section="skills" />}>
                  <SkillsSection />
                </SectionCard>
              </div>
            )}

            {/* Section Navigation */}
            <div className="flex items-center gap-3 pt-6 pb-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-12"
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
                  className="flex-1 h-12 gradient-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
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
                  className="flex-1 h-12"
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
          </div>
        </div>

        {/* Next Step Banner - only show when most sections complete */}
        {sectionStatus.contact && sectionStatus.experience && sectionStatus.summary && sectionStatus.skills && (
          <NextStepBanner variant="preview" onAction={() => navigate('/preview')} />
        )}

        {/* Bottom Fixed Section - AI Studio Bar */}
        <div className="sticky bottom-0 z-30 glass border-t border-border shrink-0">
          {/* AI Studio Bar */}
          <AIAssistantBar
            matchScore={matchScore}
            jobDescription={jobDescription}
            currentTemplate={selectedTemplate}
            onChangeTemplate={handleChangeTemplate}
            onTailor={handleTailor}
            onAnalyze={handleAnalyze}
            onImprove={handleImproveSection}
            onRecruiterSim={handleRecruiterSim}
            onAIDetector={handleAIDetector}
            onLinkedIn={handleLinkedIn}
            onOnePage={handleOnePage}
            onCareerPath={handleCareerPath}
            className="pt-3 pb-3"
          />
        </div>

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
          {showSignInPrompt && signInPromptContext && (
            <SignInPromptDialog
              open={showSignInPrompt}
              onOpenChange={setShowSignInPrompt}
              title={signInPromptContext.title}
              description={signInPromptContext.description}
              benefits={[
                'Access your resume anywhere',
                'Tailor to unlimited jobs',
                'Generate AI cover letters',
                'Track your applications',
              ]}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
