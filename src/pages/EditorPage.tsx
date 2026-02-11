import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Download, ChevronRight, Check, Cloud, CloudOff, ArrowLeft, MessageCircle, User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
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
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { useShallow } from 'zustand/react/shallow';

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
  const [activeTab, setActiveTab] = useState('contact');
  const [showAIIntro, setShowAIIntro] = useState(false);

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

  // Auto-save for authenticated users
  const saveToCloud = useCallback(async () => {
    if (!user || !currentResumeId || !currentResume) return;
    
    const currentResumeJson = JSON.stringify(currentResume);
    if (currentResumeJson === lastSavedResumeRef.current) return;
    
    setIsSaving(true);
    try {
      await updateResume.mutateAsync({
        resumeId: currentResumeId,
        updates: currentResume,
      });
      lastSavedResumeRef.current = currentResumeJson;
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResumeId, currentResume, updateResume, setIsSaving, setLastSavedAt]);

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
    }, 2000); // 2 second debounce
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentResume, user, currentResumeId, saveToCloud]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Trigger immediate save on unmount
      if (user && currentResumeId && currentResume) {
        saveToCloud();
      }
    };
  }, [user, currentResumeId, currentResume, saveToCloud]);

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

  // Resume guard - redirect to appropriate page based on auth state
  if (!currentResume) {
    return <Navigate to={user ? '/dashboard' : '/'} replace />;
  }

  // Calculate section completion - memoized to prevent unstable object reference
  const sectionStatus = useMemo(() => ({
    contact: Boolean(currentResume.contactInfo.fullName && currentResume.contactInfo.email),
    summary: currentResume.summary.length > 30,
    experience: currentResume.experience.length > 0,
    education: currentResume.education.length > 0,
    skills: currentResume.skills.length > 0,
  }), [
    Boolean(currentResume.contactInfo.fullName && currentResume.contactInfo.email),
    currentResume.summary.length > 30,
    currentResume.experience.length > 0,
    currentResume.education.length > 0,
    currentResume.skills.length > 0
  ]);

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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
        <StepperNav
          steps={[
            { id: 'contact', label: 'Contact' },
            { id: 'summary', label: 'Summary' },
            { id: 'experience', label: 'Work' },
            { id: 'education', label: 'Education' },
            { id: 'skills', label: 'Skills' },
          ]}
          activeStep={activeTab}
          completedSteps={sectionStatus}
          onStepClick={handleTabChange}
        />

        {/* Editor Tabs (hidden tab list, content driven by stepper) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0"
            ref={scrollContainerRef}
          >
            {activeTab === 'contact' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={User} title="Contact Information" tip="Include a professional email and phone number" status={sectionStatus.contact ? 'complete' : 'empty'}>
                  <ContactSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'summary' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={sectionStatus.summary ? 'complete' : 'partial'}>
                  <SummarySection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'experience' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={sectionStatus.experience ? 'complete' : 'empty'}>
                  <ExperienceSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'education' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={sectionStatus.education ? 'complete' : 'empty'}>
                  <EducationSection />
                </SectionCard>
              </div>
            )}
            {activeTab === 'skills' && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                <SectionCard icon={Wrench} title="Skills" tip="Add at least 5 relevant skills for ATS optimization" status={sectionStatus.skills ? 'complete' : 'empty'}>
                  <SkillsSection />
                </SectionCard>
              </div>
            )}
          </div>
        </div>

        {/* Next Step Banner */}
        {sectionStatus.contact && sectionStatus.experience && (
          <NextStepBanner variant="preview" onAction={() => navigate('/preview')} />
        )}

        {/* Bottom Fixed Section - AI Studio Bar + Action Button */}
        <div className="shrink-0 glass border-t border-border z-30">
          {/* AI Studio Bar - now relative positioned */}
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
            className="pt-3"
          />

          {/* Preview & Export Button */}
          <div className="px-4 pb-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gradient-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
              onClick={() => navigate('/preview')}
            >
              <Download className="w-5 h-5 mr-2" />
              Preview & Export
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
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
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showChat && <AgenticChatSheet open={showChat} onOpenChange={setShowChat} />}
          {showCareerPath && <CareerPathSheet open={showCareerPath} onOpenChange={setShowCareerPath} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
