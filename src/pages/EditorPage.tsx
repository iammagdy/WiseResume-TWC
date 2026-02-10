import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ChevronRight, Check, Cloud, CloudOff, ArrowLeft, MessageCircle, User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { StepperNav } from '@/components/editor/StepperNav';
import { SectionCard } from '@/components/editor/SectionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  } = useResumeStore();
  
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
  
  // Smart tab scrolling refs
  const TAB_ORDER = useMemo(() => ['contact', 'summary', 'experience', 'education', 'skills'], []);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Smart tab change handler with auto-scroll
  const handleTabChange = useCallback((newTab: string) => {
    const prevIndex = TAB_ORDER.indexOf(activeTab);
    const newIndex = TAB_ORDER.indexOf(newTab);
    const isMovingRight = newIndex > prevIndex;
    
    // Scroll to show the NEXT tab in direction of movement
    const targetIndex = isMovingRight 
      ? Math.min(newIndex + 1, TAB_ORDER.length - 1)
      : Math.max(newIndex - 1, 0);
    
    // Scroll that tab into view with smooth animation
    setTimeout(() => {
      tabRefs.current[targetIndex]?.scrollIntoView({ 
        behavior: 'smooth', 
        inline: 'center',
        block: 'nearest'
      });
    }, 50);
    
    setActiveTab(newTab);
  }, [activeTab, TAB_ORDER]);

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
    if (currentResume && !hasSeenAIIntro) {
      // Small delay to let the editor render first
      const timer = setTimeout(() => {
        setShowAIIntro(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentResume, hasSeenAIIntro]);

  const handleDismissAIIntro = () => {
    setShowAIIntro(false);
    setHasSeenAIIntro(true);
  };

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
  }, []);

  // Resume guard - redirect to appropriate page based on auth state
  if (!currentResume) {
    navigate(user ? '/dashboard' : '/');
    return null;
  }

  // Calculate section completion
  const sectionStatus = {
    contact: Boolean(currentResume.contactInfo.fullName && currentResume.contactInfo.email),
    summary: currentResume.summary.length > 30,
    experience: currentResume.experience.length > 0,
    education: currentResume.education.length > 0,
    skills: currentResume.skills.length > 0,
  };

  const handleImproveSection = () => {
    // For now, open tailor sheet - could be enhanced to improve specific section
    setShowTailor(true);
  };

  const handleBack = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

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

        {/* Editor Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 mt-3 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max inline-flex h-auto p-1 gap-1 mx-4">
              <TabsTrigger
                ref={(el) => (tabRefs.current[0] = el)} 
                value="contact" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                <User className="w-4 h-4" />
                Contact
                {sectionStatus.contact && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[1] = el)} 
                value="summary" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                <AlignLeft className="w-4 h-4" />
                Summary
                {sectionStatus.summary && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[2] = el)} 
                value="experience" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                Work
                {sectionStatus.experience && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[3] = el)} 
                value="education" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                Education
                {sectionStatus.education && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[4] = el)} 
                value="skills" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                <Wrench className="w-4 h-4" />
                Skills
                {sectionStatus.skills && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
            </TabsList>
          </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-4">
            <TabsContent value="contact" className="mt-0" forceMount hidden={activeTab !== 'contact'}>
              <ContactSection />
            </TabsContent>
            <TabsContent value="summary" className="mt-0" forceMount hidden={activeTab !== 'summary'}>
              <SummarySection />
            </TabsContent>
            <TabsContent value="experience" className="mt-0" forceMount hidden={activeTab !== 'experience'}>
              <ExperienceSection />
            </TabsContent>
            <TabsContent value="education" className="mt-0" forceMount hidden={activeTab !== 'education'}>
              <EducationSection />
            </TabsContent>
            <TabsContent value="skills" className="mt-0" forceMount hidden={activeTab !== 'skills'}>
              <SkillsSection />
            </TabsContent>
          </div>
        </Tabs>

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
            onChangeTemplate={() => setShowTemplates(true)}
            onTailor={() => setShowTailor(true)}
            onAnalyze={() => setShowJobSheet(true)}
            onImprove={handleImproveSection}
            onRecruiterSim={() => setShowRecruiterSim(true)}
            onAIDetector={() => setShowAIDetector(true)}
            onLinkedIn={() => setShowLinkedIn(true)}
            onOnePage={() => setShowOnePage(true)}
            onCareerPath={() => setShowCareerPath(true)}
            className="pt-3"
          />

          {/* Preview & Export Button */}
          <motion.div
            className="px-4 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gradient-primary"
              onClick={() => navigate('/preview')}
              style={{
                boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
              }}
            >
              <Download className="w-5 h-5 mr-2" />
              Preview & Export
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>

      {/* AI Intro Tooltip for First-Time Users */}
      <AIIntroTooltip
        show={showAIIntro}
        onDismiss={handleDismissAIIntro}
      />

      {/* Sheets - lazy loaded */}
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
    </div>
  );
}
