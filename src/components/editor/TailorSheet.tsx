import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, Loader2, CheckCircle, ArrowRight, Undo2, GitCompare, 
  History, FileText, Sparkles, ChevronRight
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { CompareSheet } from './CompareSheet';
import { TailorProgressComponent } from './tailor/TailorProgress';
import { SectionChangeCard } from './tailor/SectionChangeCard';
import { SkillSuggestionList } from './tailor/SkillSuggestionList';
import { ScoreComparison } from './tailor/ScoreComparison';
import { TailorHistorySheet } from './tailor/TailorHistorySheet';
import { CoverLetterGenerator } from './tailor/CoverLetterGenerator';
import { JobUrlParser } from './tailor/JobUrlParser';
import { 
  EnhancedTailorResult, 
  TailorProgress, 
  TailorSectionId,
  ResumeData 
} from '@/types/resume';
import { cn } from '@/lib/utils';

interface TailorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTION_LABELS: Record<TailorSectionId, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
};

export function TailorSheet({ open, onOpenChange }: TailorSheetProps) {
  const { 
    currentResume, 
    jobDescription, 
    setJobDescription,
    updateResume,
    tailorHistory,
    addTailorHistory,
    clearTailorHistory,
    restoreTailorVersion,
  } = useResumeStore();

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<EnhancedTailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [progress, setProgress] = useState<TailorProgress | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);

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

  const handleTailor = async () => {
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

    try {
      const result = await tailorResumeWithProgress(
        currentResume, 
        jobDescription,
        (p) => setProgress(p)
      );
      setTailorResult(result);
      
      // Set parsed job info if available
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
  };

  const handleApplyChanges = () => {
    if (!tailorResult || !currentResume) return;

    const updates: Partial<ResumeData> = {};
    
    if (enabledSections.includes('summary')) {
      updates.summary = tailorResult.summary;
    }
    if (enabledSections.includes('skills')) {
      updates.skills = tailorResult.skills;
    }
    if (enabledSections.includes('experience')) {
      updates.experience = tailorResult.experience.map((exp, index) => ({
        ...currentResume.experience[index],
        ...exp,
      }));
    }
    if (enabledSections.includes('education')) {
      updates.education = tailorResult.education.map((edu, index) => ({
        ...currentResume.education[index],
        ...edu,
      }));
    }

    updateResume(updates);

    // Save to history
    addTailorHistory({
      jobTitle: parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position',
      company: parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company',
      jobDescription,
      tailorResult,
      scoreBeforeAfter: tailorResult.overallScore,
      appliedSections: enabledSections,
    });

    toast.success('Changes applied to your resume!');
    setTailorResult(null);
    onOpenChange(false);
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
    // Move skill to top
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

  // Calculate effective score based on selected sections
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
          <AnimatePresence>
            {isTailoring && progress && (
              <TailorProgressComponent
                progress={progress}
                projectedScore={tailorResult?.overallScore}
                matchingKeywords={tailorResult?.missingSkills?.length}
              />
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {tailorResult && !isTailoring && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Success Header */}
                <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-success" />
                    <h4 className="font-semibold">Resume Tailored!</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review changes below and select which sections to apply.
                  </p>
                </div>

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

                {/* Skill Suggestions */}
                {(tailorResult.missingSkills?.length > 0 || tailorResult.boostableSkills?.length > 0) && (
                  <SkillSuggestionList
                    missingSkills={tailorResult.missingSkills || []}
                    boostableSkills={tailorResult.boostableSkills || []}
                    onAddSkill={handleAddSkill}
                    onBoostSkill={handleBoostSkill}
                    onAddAll={handleAddAllSkills}
                  />
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

                  {/* Cover Letter CTA */}
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
                      disabled={enabledSections.length === 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Apply ({enabledSections.length})
                    </Button>
                  </div>

                  {effectiveScore && (
                    <p className="text-xs text-center text-muted-foreground">
                      Applying {enabledSections.length} sections → Score: {effectiveScore}%
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Initial State - Job Input */}
          {!tailorResult && !isTailoring && (
            <>
              <JobUrlParser
                value={jobDescription}
                onChange={setJobDescription}
                onParsed={setParsedJobInfo}
              />

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
                    <span><strong>Section-by-section control</strong> - Choose which changes to apply</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Match scores</strong> - See before/after improvement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Skills gap analysis</strong> - Add missing keywords with one click</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span><strong>Cover letter generator</strong> - Create matching cover letters</span>
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
    </Sheet>
  );
}
