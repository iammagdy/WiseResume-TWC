import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ChevronRight, Check, Cloud, CloudOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations } from '@/hooks/useResumes';
import { ContactSection } from '@/components/editor/ContactSection';
import { SummarySection } from '@/components/editor/SummarySection';
import { ExperienceSection } from '@/components/editor/ExperienceSection';
import { EducationSection } from '@/components/editor/EducationSection';
import { SkillsSection } from '@/components/editor/SkillsSection';
import { JobAnalysisSheet } from '@/components/editor/JobAnalysisSheet';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { TailorSheet } from '@/components/editor/TailorSheet';
import { AIAssistantBar } from '@/components/editor/AIAssistantBar';
import { AIIntroTooltip } from '@/components/editor/AIIntroTooltip';
import { ProgressBar } from '@/components/editor/ProgressBar';

export default function EditorPage() {
  const navigate = useNavigate();
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
  } = useResumeStore();
  const { updateResume } = useResumeMutations();
  
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showAIIntro, setShowAIIntro] = useState(false);
  
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

  if (!currentResume) {
    navigate('/');
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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
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
        </div>
      </header>
        {/* Progress Bar with Save Status */}
        <div className="px-4 py-3 border-b border-border">
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <div className="mt-3 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max inline-flex h-auto p-1 gap-1 mx-4">
              <TabsTrigger 
                ref={(el) => (tabRefs.current[0] = el)} 
                value="contact" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                Contact
                {sectionStatus.contact && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[1] = el)} 
                value="summary" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                Summary
                {sectionStatus.summary && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[2] = el)} 
                value="experience" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                Work
                {sectionStatus.experience && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[3] = el)} 
                value="education" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                Education
                {sectionStatus.education && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger 
                ref={(el) => (tabRefs.current[4] = el)} 
                value="skills" 
                className="text-sm py-2.5 px-4 min-h-[44px] flex-shrink-0 gap-1.5"
              >
                Skills
                {sectionStatus.skills && <Check className="w-3.5 h-3.5 text-success" />}
              </TabsTrigger>
            </TabsList>
          </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-48">
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

        {/* AI Studio Bar - Replaces FAB */}
        <AIAssistantBar
          matchScore={matchScore}
          jobDescription={jobDescription}
          currentTemplate={selectedTemplate}
          onChangeTemplate={() => setShowTemplates(true)}
          onTailor={() => setShowTailor(true)}
          onAnalyze={() => setShowJobSheet(true)}
          onImprove={handleImproveSection}
        />

        {/* Bottom Action Bar - positioned above AI Assistant */}
        <motion.div
           className="sticky bottom-32 p-4 glass border-t border-border z-30"
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

      {/* AI Intro Tooltip for First-Time Users */}
      <AIIntroTooltip
        show={showAIIntro}
        onDismiss={handleDismissAIIntro}
      />

      {/* Sheets */}
      <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />
      <TemplateSelector open={showTemplates} onOpenChange={setShowTemplates} />
      <TailorSheet open={showTailor} onOpenChange={setShowTailor} />
    </div>
  );
}
