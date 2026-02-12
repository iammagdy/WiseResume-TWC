import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Download, ChevronRight, ChevronLeft, Check, Cloud, CloudOff, ArrowLeft, MessageCircle, User, AlignLeft, Briefcase, GraduationCap, Wrench, Clock } from 'lucide-react';
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
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResumeId, updateResume, setIsSaving, setLastSavedAt]);

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
  
  const TOAST_MESSAGES: Record<string, string> = useMemo(() => ({
    contact: 'Contact section complete! Next: Add your professional summary to stand out.',
    summary: 'Professional summary complete! Next: Add your work experience.',
    experience: 'Work experience complete! Next: Add your education details.',
    education: 'Education section complete! Next: List your key skills.',
    skills: 'Skills section complete! Your resume is looking great!',
  }), []);

  useEffect(() => {
    if (!currentResume) return;
    const prev = prevCompletedRef.current;
    const sectionIds = ['contact', 'summary', 'experience', 'education', 'skills'] as const;
    
    for (const id of sectionIds) {
      const nowComplete = sectionScores[id] >= 100;
      if (nowComplete && prev[id] === false) {
        toast.success(TOAST_MESSAGES[id], { duration: 4000 });
      }
      prev[id] = nowComplete;
    }
  }, [sectionScores, TOAST_MESSAGES, currentResume]);

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
  const handleTailor = useCallback(() => setShowTailor(true), []);
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
      <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-display font-semibold truncate">Edit Resume</h1>
            {user && currentResumeId && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation"
                aria-label="Version history"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="p-3 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center relative"
            aria-label="Open Wise AI"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </button>
        </div>
      </header>
        {/* Progress Bar with Save Status */}
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
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
                    <Cloud className="w-3.5 h-3.5 text-success" />
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
        </div>

        {/* Stepper Nav */}
        <div className="shrink-0">
        <StepperNav
          steps={steps}
          activeStep={activeTab}
          completedSteps={sectionStatus}
          sectionScores={sectionScores}
          onStepClick={handleTabChange}
        />
        </div>

        {/* Editor Tabs (hidden tab list, content driven by stepper) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
            ref={scrollContainerRef}
          >
            {activeTab === 'contact' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={User} title="Contact Information" tip="Include a professional email and phone number" status={getSectionStatus(sectionScores.contact)} action={<SectionAIAction section="contact" />}>
                  <ContactSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'summary' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
                  <SummarySection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'experience' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
                  <ExperienceSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'education' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
                  <EducationSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'skills' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
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
                  onClick={() => navigate('/preview')}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Preview & Export
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="flex-1 h-12"
                  onClick={() => {
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
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
