import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { 
  Wand2, Loader2, CheckCircle, ArrowRight, Undo2, GitCompare, 
  History, FileText, Sparkles, ChevronRight, Brain, Target, BarChart3,
  Zap, Gauge, Flame
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress, TailorIntensity } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { CompareSheet } from './CompareSheet';
import { TailorProgressComponent } from './tailor/TailorProgress';
import { SectionChangeCard } from './tailor/SectionChangeCard';
import { SkillSuggestionList } from './tailor/SkillSuggestionList';
import { ScoreComparison } from './tailor/ScoreComparison';
import { TailorHistorySheet } from './tailor/TailorHistorySheet';
import { CoverLetterGenerator } from './tailor/CoverLetterGenerator';
import { JobUrlParser } from './tailor/JobUrlParser';
import { JobIntelligenceCard } from './tailor/JobIntelligenceCard';
import { InterviewPrepCard } from './tailor/InterviewPrepCard';
import { BulletComparison } from './tailor/BulletComparison';
import { SmartSkillSuggestions } from './tailor/SmartSkillSuggestions';
import { MultiJobCompareSheet } from './tailor/MultiJobCompareSheet';
import { KeywordHeatmap } from './tailor/KeywordHeatmap';
import { QuickActions } from './tailor/QuickActions';

import { useResumeMutations, resumeDataToDb } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { 
  EnhancedTailorResult, 
  TailorProgress, 
  TailorSectionId,
  ResumeData,
  SuperTailorResult,
  EnhancedTailorProgress
} from '@/types/resume';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { Json } from '@/integrations/supabase/types';

interface TailorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (info: { title: string; company: string; resumeId?: string; jobUrl?: string }) => void;
}

const SECTION_LABELS: Record<TailorSectionId, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
};

const TAB_CONFIG = [
  { id: 'changes', label: 'Changes', icon: CheckCircle },
  { id: 'intelligence', label: 'Intel', icon: Brain },
  { id: 'skills', label: 'Skills', icon: Target },
  { id: 'interview', label: 'Prep', icon: Sparkles },
] as const;

export const TailorSheet = memo(function TailorSheet({ open, onOpenChange, onApplied }: TailorSheetProps) {
  const { user } = useAuth();
  const { 
    currentResume, 
    currentResumeId,
    jobDescription, 
    setJobDescription,
    updateResume,
    tailorHistory,
    addTailorHistory,
    clearTailorHistory,
    restoreTailorVersion,
    currentComparison,
    startNewComparison,
    addJobToComparison,
    setCurrentResumeId,
    setCurrentResume,
  } = useResumeStore(useShallow(state => ({
    currentResume: state.currentResume,
    currentResumeId: state.currentResumeId,
    jobDescription: state.jobDescription,
    setJobDescription: state.setJobDescription,
    updateResume: state.updateResume,
    tailorHistory: state.tailorHistory,
    addTailorHistory: state.addTailorHistory,
    clearTailorHistory: state.clearTailorHistory,
    restoreTailorVersion: state.restoreTailorVersion,
    currentComparison: state.currentComparison,
    startNewComparison: state.startNewComparison,
    addJobToComparison: state.addJobToComparison,
    setCurrentResumeId: state.setCurrentResumeId,
    setCurrentResume: state.setCurrentResume,
  })));

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('changes');
  const [showMultiCompare, setShowMultiCompare] = useState(false);
  const [isAddingToComparison, setIsAddingToComparison] = useState(false);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [isApplying, setIsApplying] = useState(false);
  const [jobUrl, setJobUrl] = useState<string | undefined>(undefined);
  const autoTailorTriggered = useRef(false);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>([
    'summary', 'skills', 'experience', 'education'
  ]);

  const toggleSection = (sectionId: TailorSectionId) => {
    setEnabledSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleTailor = useCallback(async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description first');
      return;
    }

    if (!currentResume) {
      toast.error('No resume to tailor');
      return;
    }

    setIsTailoring(true);
    setOriginalResume(currentResume);
    setProgress({ step: 'analyzing', progress: 5, message: 'Starting...' });
    setEnabledSections(['summary', 'skills', 'experience', 'education']);
    setActiveTab('changes');

    try {
      const result = await tailorResumeWithProgress(
        currentResume, 
        jobDescription,
        (p) => setProgress(p),
        intensity
      );
      setTailorResult(result as SuperTailorResult);
      
      if (result.jobParsed) {
        setParsedJobInfo({
          title: result.jobParsed.title,
          company: result.jobParsed.company,
        });
      }
      
      toast.success('Resume tailored successfully!');
    } catch (error) {
      console.error('Tailor error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to tailor resume');
    } finally {
      setIsTailoring(false);
      setProgress(null);
    }
  }, [jobDescription, currentResume, intensity]);

  // Auto-tailor when a URL is parsed
  const handleParsedJobInfo = useCallback((info: { title: string; company: string; url?: string } | null) => {
    setParsedJobInfo(info);
    if (info?.url) setJobUrl(info.url);
    if (info && jobDescription.trim() && currentResume && !autoTailorTriggered.current) {
      autoTailorTriggered.current = true;
      toast.info('Auto-tailoring your resume...', { duration: 2000 });
      setTimeout(() => handleTailor(), 500);
    }
  }, [jobDescription, currentResume, handleTailor]);

  useEffect(() => {
    if (open) {
      autoTailorTriggered.current = false;
    }
  }, [open]);

  const resumeText = useMemo(() => {
    if (!currentResume) return '';
    const parts = [
      currentResume.summary,
      ...currentResume.experience.map(e => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`),
      ...currentResume.education.map(e => `${e.degree} ${e.field} ${e.institution}`),
      ...currentResume.skills,
    ];
    return parts.join(' ');
  }, [currentResume]);

  const handleUpdateTailorResult = useCallback((updated: Partial<SuperTailorResult>) => {
    setTailorResult(prev => prev ? { ...prev, ...updated } : null);
  }, []);

  // Auto-create tailored CV as new resume in DB
  const handleApplyChanges = useCallback(async () => {
    if (!tailorResult || !currentResume || !user) return;

    setIsApplying(true);

    try {
      // Build merged resume data
      const mergedResume: ResumeData = { ...currentResume };
      
      if (enabledSections.includes('summary')) {
        mergedResume.summary = tailorResult.summary;
      }
      if (enabledSections.includes('skills')) {
        mergedResume.skills = tailorResult.skills;
      }
      if (enabledSections.includes('experience')) {
        mergedResume.experience = tailorResult.experience.map((exp, index) => ({
          ...currentResume.experience[index],
          ...exp,
        }));
      }
      if (enabledSections.includes('education')) {
        mergedResume.education = tailorResult.education.map((edu, index) => ({
          ...currentResume.education[index],
          ...edu,
        }));
      }

      const jobTitle = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const company = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      const originalTitle = currentResume.contactInfo.fullName || 'Resume';
      const newTitle = `${originalTitle} - Tailored for ${jobTitle} @ ${company}`;

      // Create new resume in database
      const { data: newResume, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: newTitle,
          contact_info: mergedResume.contactInfo as unknown as Json,
          summary: mergedResume.summary,
          experience: mergedResume.experience as unknown as Json,
          education: mergedResume.education as unknown as Json,
          skills: mergedResume.skills as unknown as Json,
          certifications: mergedResume.certifications as unknown as Json,
          template_id: mergedResume.templateId,
          parent_resume_id: currentResumeId,
          target_job_title: jobTitle,
          target_company: company,
          job_match_score: tailorResult.overallScore.after,
        })
        .select()
        .single();

      if (error) throw error;

      // Save to tailor history
      addTailorHistory({
        jobTitle,
        company,
        jobDescription,
        tailorResult,
        scoreBeforeAfter: tailorResult.overallScore,
        appliedSections: enabledSections,
      }, currentResumeId || undefined);

      toast.success('🎉 Tailored resume created! Original preserved.', { duration: 4000 });

      // Notify parent to show apply prompt
      const jt = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const co = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      onApplied?.({ title: jt, company: co, resumeId: newResume?.id, jobUrl });

      setTailorResult(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to create tailored resume');
    } finally {
      setIsApplying(false);
    }
  }, [tailorResult, currentResume, user, enabledSections, parsedJobInfo, currentResumeId, jobDescription, addTailorHistory, onOpenChange]);

  const handleStartComparison = () => {
    if (!tailorResult || !currentResume?.id) return;
    
    startNewComparison(currentResume.id, {
      jobTitle: parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position',
      company: parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company',
      jobDescription,
      tailorResult,
    });
    
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
    setIsAddingToComparison(true);
    toast.success('Added to comparison. Now add another job!');
  };

  const handleAddToComparison = () => {
    if (!tailorResult) return;
    
    addJobToComparison({
      jobTitle: parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position',
      company: parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company',
      jobDescription,
      tailorResult,
    });
    
    setShowMultiCompare(true);
    setIsAddingToComparison(false);
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
  };

  const handleOpenCompare = () => {
    setShowMultiCompare(true);
  };

  const handleAddJobFromCompare = () => {
    setShowMultiCompare(false);
    setIsAddingToComparison(true);
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
  };

  const handleRevert = () => {
    if (originalResume) {
      updateResume(originalResume);
      toast.info('Reverted to original resume');
    }
    setTailorResult(null);
    setProgress(null);
  };

  const handleAddSkill = (skill: string) => {
    if (!currentResume) return;
    const newSkills = [...currentResume.skills, skill];
    updateResume({ skills: newSkills });
    toast.success(`Added "${skill}" to your skills`);
  };

  const handleBoostSkill = (skill: string) => {
    if (!currentResume) return;
    const newSkills = [skill, ...currentResume.skills.filter(s => s !== skill)];
    updateResume({ skills: newSkills });
    toast.success(`Moved "${skill}" to the top`);
  };

  const handleAddAllSkills = () => {
    if (!tailorResult || !currentResume) return;
    const newSkills = [
      ...tailorResult.missingSkills.map(s => s.skill),
      ...currentResume.skills,
    ];
    updateResume({ skills: newSkills });
    toast.success(`Added ${tailorResult.missingSkills.length} skills`);
  };

  const handleRestoreVersion = (id: string) => {
    restoreTailorVersion(id);
    toast.success('Restored previous version');
  };

  const effectiveScore = useMemo(() => {
    if (!tailorResult) return null;
    const before = tailorResult.overallScore.before;
    const maxImprovement = tailorResult.overallScore.after - before;
    const sectionWeight = enabledSections.length / 4;
    return Math.round(before + (maxImprovement * sectionWeight));
  }, [tailorResult, enabledSections]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AI Resume Tailor
            </SheetTitle>
            {tailorHistory.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(true)}
              >
                <History className="w-4 h-4 mr-1" />
                History
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(92vh-140px)] space-y-4 pb-24">
          {/* Tailoring Progress */}
          {isTailoring && progress && (
            <TailorProgressComponent
              progress={progress}
              projectedScore={tailorResult?.overallScore}
              matchingKeywords={tailorResult?.missingSkills?.length}
            />
          )}

          {/* Results */}
          {tailorResult && !isTailoring && (
            <div className="space-y-4 animate-fade-in">
              {/* Success Header with celebration */}
              <div className="p-4 rounded-xl bg-success/10 border border-success/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-success/5 animate-[shimmer_3s_infinite]" />
                <div className="relative flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-success animate-pulse" />
                  <h4 className="font-semibold">🎉 Resume Tailored!</h4>
                </div>
                <p className="relative text-sm text-muted-foreground">
                  Review changes below. A new tailored copy will be created — your original stays safe.
                </p>
              </div>

              {/* Manual Tabs (replacing Radix Tabs to avoid crash) */}
              <div className="flex rounded-lg bg-muted/50 p-1 gap-1">
                {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 min-h-[44px]',
                      activeTab === id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'changes' && (
                <div className="space-y-4">
                  {/* Score Comparison */}
                  <ScoreComparison
                    beforeScore={tailorResult.overallScore.before}
                    afterScore={tailorResult.overallScore.after}
                    sectionScores={tailorResult.sectionScores}
                    selectedSections={enabledSections}
                  />

                  {/* Section Changes */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Select Changes to Apply
                    </h4>

                    <SectionChangeCard
                      sectionId="summary"
                      title={SECTION_LABELS.summary}
                      enabled={enabledSections.includes('summary')}
                      onToggle={() => toggleSection('summary')}
                      impactScore={tailorResult.sectionScores.summary.after - tailorResult.sectionScores.summary.before}
                      changesSummary="Professional summary rewritten"
                      preview={
                        <p className="text-muted-foreground leading-relaxed">
                          {tailorResult.summary}
                        </p>
                      }
                    />

                    <SectionChangeCard
                      sectionId="skills"
                      title={SECTION_LABELS.skills}
                      enabled={enabledSections.includes('skills')}
                      onToggle={() => toggleSection('skills')}
                      impactScore={tailorResult.sectionScores.skills.after - tailorResult.sectionScores.skills.before}
                      changesSummary={`${tailorResult.skills.length} skills optimized`}
                      preview={
                        <div className="flex flex-wrap gap-2">
                          {tailorResult.skills.slice(0, 10).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {tailorResult.skills.length > 10 && (
                            <Badge variant="outline" className="text-xs">
                              +{tailorResult.skills.length - 10} more
                            </Badge>
                          )}
                        </div>
                      }
                    />

                    <SectionChangeCard
                      sectionId="experience"
                      title={SECTION_LABELS.experience}
                      enabled={enabledSections.includes('experience')}
                      onToggle={() => toggleSection('experience')}
                      impactScore={tailorResult.sectionScores.experience.after - tailorResult.sectionScores.experience.before}
                      changesSummary={`${tailorResult.experience.length} positions enhanced`}
                      preview={
                        <ul className="space-y-2">
                          {tailorResult.experience.slice(0, 2).map((exp, i) => (
                            <li key={i} className="text-muted-foreground">
                              <span className="font-medium text-foreground">{exp.position}</span>
                              <span className="text-xs"> @ {exp.company}</span>
                            </li>
                          ))}
                        </ul>
                      }
                    />

                    <SectionChangeCard
                      sectionId="education"
                      title={SECTION_LABELS.education}
                      enabled={enabledSections.includes('education')}
                      onToggle={() => toggleSection('education')}
                      impactScore={tailorResult.sectionScores.education.after - tailorResult.sectionScores.education.before}
                      changesSummary={`${tailorResult.education.length} entries refined`}
                      preview={
                        <ul className="space-y-1">
                          {tailorResult.education.map((edu, i) => (
                            <li key={i} className="text-muted-foreground text-sm">
                              {edu.degree} in {edu.field} - {edu.institution}
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  </div>

                  {/* Bullet Transformations */}
                  {tailorResult.bulletTransformations && tailorResult.bulletTransformations.length > 0 && (
                    <BulletComparison transformations={tailorResult.bulletTransformations} />
                  )}

                  {/* Key Changes */}
                  {tailorResult.keyChanges && tailorResult.keyChanges.length > 0 && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <h4 className="font-semibold text-sm mb-3">Key Improvements</h4>
                      <ul className="space-y-2">
                        {tailorResult.keyChanges.slice(0, 5).map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'intelligence' && (
                <div className="space-y-4">
                  {tailorResult.jobIntelligence && (
                    <JobIntelligenceCard
                      jobIntelligence={tailorResult.jobIntelligence}
                      atsAnalysis={tailorResult.atsAnalysis}
                      strengthsAnalysis={tailorResult.strengthsAnalysis}
                      jobTitle={parsedJobInfo?.title || tailorResult.jobParsed?.title}
                      company={parsedJobInfo?.company || tailorResult.jobParsed?.company}
                    />
                  )}
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-4">
                  <SmartSkillSuggestions
                    missingSkills={tailorResult.missingSkills || []}
                    boostableSkills={tailorResult.boostableSkills || []}
                    onAddSkill={handleAddSkill}
                    onBoostSkill={handleBoostSkill}
                    onAddAllCritical={handleAddAllSkills}
                  />
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-4">
                  {tailorResult.interviewTalkingPoints && tailorResult.interviewTalkingPoints.length > 0 ? (
                    <InterviewPrepCard talkingPoints={tailorResult.interviewTalkingPoints} />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Interview prep coming soon</p>
                      <p className="text-sm">Tailored interview questions will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {currentResume && (
                <QuickActions
                  resume={currentResume}
                  tailorResult={tailorResult}
                  jobDescription={jobDescription}
                  onUpdateResult={handleUpdateTailorResult}
                />
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCompare(true)}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare Changes
                </Button>

                {!isAddingToComparison && !currentComparison && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartComparison}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Compare to Another Job
                  </Button>
                )}

                {(isAddingToComparison || currentComparison) && (
                  <Button
                    variant="outline"
                    className="w-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50"
                    onClick={handleAddToComparison}
                  >
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                    Add to Comparison ({currentComparison ? currentComparison.jobs.length + 1 : 1}/4)
                  </Button>
                )}

                {currentComparison && currentComparison.jobs.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={handleOpenCompare}
                  >
                    View Comparison ({currentComparison.jobs.length} jobs)
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                  onClick={() => setShowCoverLetter(true)}
                >
                  <FileText className="w-4 h-4 mr-2 text-purple-500" />
                  Generate Matching Cover Letter
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleRevert}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Discard
                  </Button>
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={handleApplyChanges}
                    disabled={enabledSections.length === 0 || isApplying}
                  >
                    {isApplying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {isApplying ? 'Creating...' : `Apply (${enabledSections.length})`}
                  </Button>
                </div>

                {effectiveScore && (
                  <p className="text-xs text-center text-muted-foreground">
                    Applying {enabledSections.length} sections → Score: {effectiveScore}% • New tailored copy will be created
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Initial State - Job Input */}
          {!tailorResult && !isTailoring && (
            <>
              <JobUrlParser
                value={jobDescription}
                onChange={setJobDescription}
                onParsed={handleParsedJobInfo}
              />

              {/* Keyword Heatmap */}
              {jobDescription.trim() && currentResume && (
                <KeywordHeatmap
                  jobDescription={jobDescription}
                  resumeSkills={currentResume.skills}
                  resumeText={resumeText}
                />
              )}

              {/* Intensity Selector */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Tailoring Intensity</h4>
                <ToggleGroup
                  type="single"
                  value={intensity}
                  onValueChange={(val) => val && setIntensity(val as TailorIntensity)}
                  className="w-full grid grid-cols-3"
                >
                  <ToggleGroupItem value="light" className="text-xs gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Light
                  </ToggleGroupItem>
                  <ToggleGroupItem value="moderate" className="text-xs gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    Moderate
                  </ToggleGroupItem>
                  <ToggleGroupItem value="aggressive" className="text-xs gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Aggressive
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-[11px] text-muted-foreground">
                  {intensity === 'light' && 'Minimal keyword tweaks, preserves your voice'}
                  {intensity === 'moderate' && 'Balanced rewrite with keyword optimization'}
                  {intensity === 'aggressive' && 'Maximum ATS compatibility, extensive rewrite'}
                </p>
              </div>

              <Button
                className="w-full h-12 gradient-primary font-semibold"
                onClick={handleTailor}
                disabled={isTailoring || !jobDescription.trim()}
              >
                {isTailoring ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Tailoring Resume...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Tailor My Resume
                  </>
                )}
              </Button>

              {/* Tips */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  What's new in AI Tailor
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Auto-save</strong> - Tailored copies are saved separately</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Original preserved</strong> - Your base resume stays untouched</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Match scores</strong> - See before/after improvement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Job intelligence</strong> - Deep analysis of requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Interview prep</strong> - Tailored talking points</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* Compare Sheet */}
      <CompareSheet
        open={showCompare}
        onOpenChange={setShowCompare}
        originalResume={originalResume}
        tailorResult={tailorResult}
        onApplyChanges={handleApplyChanges}
      />

      {/* History Sheet */}
      <TailorHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        history={tailorHistory}
        onRestore={handleRestoreVersion}
        onClear={clearTailorHistory}
      />

      {/* Cover Letter Generator */}
      <CoverLetterGenerator
        open={showCoverLetter}
        onOpenChange={setShowCoverLetter}
        resume={currentResume}
        jobDescription={jobDescription}
      />

      {/* Multi-Job Comparison Sheet */}
      <MultiJobCompareSheet
        open={showMultiCompare}
        onOpenChange={setShowMultiCompare}
        onAddJob={handleAddJobFromCompare}
        onViewJobDetails={(jobId) => {
          toast.info('Full details view coming soon');
        }}
      />

    </Sheet>
  );
});
