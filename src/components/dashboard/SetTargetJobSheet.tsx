import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Loader2, Sparkles, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { JobUrlParser } from '@/components/editor/tailor/JobUrlParser';
import { tailorResumeWithProgress } from '@/lib/aiTailor';
import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { EnhancedTailorProgress, SuperTailorResult } from '@/types/resume';
import { useQueryClient } from '@tanstack/react-query';
import { Json } from '@/integrations/supabase/types';

interface SetTargetJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: DatabaseResume;
}

type Phase = 'input' | 'analyzing' | 'results';

function getScoreColor(score: number) {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  if (score >= 50) return 'text-orange-400';
  return 'text-destructive';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function getScoreBarColor(score: number) {
  if (score >= 90) return 'bg-success';
  if (score >= 70) return 'bg-warning';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-destructive';
}

export function SetTargetJobSheet({ open, onOpenChange, resume }: SetTargetJobSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('input');
  const [jobDescription, setJobDescription] = useState('');
  const [parsedJob, setParsedJob] = useState<{ title: string; company: string; url?: string } | null>(null);
  const [progress, setProgress] = useState<EnhancedTailorProgress | null>(null);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);

  const resumeData = useMemo(() => dbToResumeData(resume), [resume]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job URL or description');
      return;
    }
    haptics.medium();
    setPhase('analyzing');

    try {
      const result = await tailorResumeWithProgress(
        resumeData,
        jobDescription,
        (p) => setProgress(p as EnhancedTailorProgress),
        'moderate'
      );
      setTailorResult(result);
      setPhase('results');

      // Update resume target job info
      if (user) {
        const title = parsedJob?.title || result.jobParsed?.title || 'Target Job';
        const company = parsedJob?.company || result.jobParsed?.company || '';
        const score = result.overallScore?.after || 0;

        await supabase
          .from('resumes')
          .update({
            target_job_title: title,
            target_company: company,
            job_match_score: score,
          })
          .eq('id', resume.id)
          .eq('user_id', user.id);

        queryClient.invalidateQueries({ queryKey: ['resumes'] });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze job. Please try again.');
      setPhase('input');
    }
  };

  const handleTailor = async () => {
    if (!tailorResult || !user) return;
    haptics.medium();
    setIsTailoring(true);

    try {
      const insertData = {
        user_id: user.id,
        title: `${resume.title} — ${parsedJob?.company || tailorResult.jobParsed?.company || 'Tailored'}`,
        contact_info: resume.contact_info as unknown as Json,
        summary: tailorResult.summary,
        experience: tailorResult.experience as unknown as Json,
        education: tailorResult.education as unknown as Json,
        skills: tailorResult.skills as unknown as Json,
        certifications: resume.certifications as unknown as Json,
        awards: resume.awards as unknown as Json,
        projects: resume.projects as unknown as Json,
        publications: resume.publications as unknown as Json,
        volunteering: resume.volunteering as unknown as Json,
        hobbies: resume.hobbies as unknown as Json,
        references: resume.references as unknown as Json,
        template_id: resume.template_id,
        parent_resume_id: resume.id,
        target_job_title: parsedJob?.title || tailorResult.jobParsed?.title || '',
        target_company: parsedJob?.company || tailorResult.jobParsed?.company || '',
        job_match_score: tailorResult.overallScore?.after || 0,
      };
      const { data, error } = await supabase
        .from('resumes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Tailored version created!');
      haptics.success();
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Tailor error:', error);
      toast.error('Failed to create tailored version');
    } finally {
      setIsTailoring(false);
    }
  };

  const resetState = () => {
    setPhase('input');
    setJobDescription('');
    setParsedJob(null);
    setProgress(null);
    setTailorResult(null);
  };

  const overallScore = tailorResult?.overallScore;
  const missingSkills = tailorResult?.missingSkills || [];
  const sectionScores = tailorResult?.sectionScores;

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Set Target Job
          </SheetTitle>
        </SheetHeader>

        {/* Phase 1: Input */}
        {phase === 'input' && (
          <div className="space-y-4">
            <JobUrlParser
              value={jobDescription}
              onChange={setJobDescription}
              onParsed={(data) => setParsedJob(data)}
            />
            <Button
              onClick={handleAnalyze}
              disabled={!jobDescription.trim()}
              className="w-full min-h-[48px] active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Job
            </Button>
          </div>
        )}

        {/* Phase 2: Analyzing */}
        {phase === 'analyzing' && progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 py-8"
          >
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">{progress.message}</p>
              {progress.funFact && (
                <p className="text-xs text-muted-foreground italic">{progress.funFact}</p>
              )}
            </div>
            <Progress value={progress.progress} className="h-2" />
          </motion.div>
        )}

        {/* Phase 3: Results */}
        {phase === 'results' && tailorResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Overall Match Score */}
            <div className="text-center space-y-2">
              <div className={cn('text-4xl font-bold', getScoreColor(overallScore?.after || 0))}>
                {overallScore?.after || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                Match Score • {getScoreLabel(overallScore?.after || 0)}
              </p>
              <div className="w-full h-3 rounded-full bg-secondary/30 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getScoreBarColor(overallScore?.after || 0))}
                  style={{ width: `${overallScore?.after || 0}%` }}
                />
              </div>
              {overallScore && overallScore.before < overallScore.after && (
                <p className="text-xs text-success">
                  ↑ {overallScore.after - overallScore.before}% improvement possible
                </p>
              )}
            </div>

            {/* Section Scores */}
            {sectionScores && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Section Breakdown</h4>
                {Object.entries(sectionScores).map(([section, scores]) => {
                  const score = scores.after;
                  const Icon = score >= 90 ? CheckCircle : score >= 50 ? AlertTriangle : XCircle;
                  return (
                    <div key={section} className="flex items-center gap-3 text-sm">
                      <Icon className={cn('w-4 h-4 shrink-0', getScoreColor(score))} />
                      <span className="capitalize flex-1">{section}</span>
                      <span className={cn('font-medium', getScoreColor(score))}>{score}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missing Skills */}
            {missingSkills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Missing Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.slice(0, 8).map((s) => (
                    <Badge key={s.skill} variant="outline" className="text-xs border-destructive/30 text-destructive">
                      {s.skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Key Changes */}
            {tailorResult.keyChanges?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">What AI will improve</h4>
                <ul className="space-y-1">
                  {tailorResult.keyChanges.slice(0, 5).map((change, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleTailor}
                disabled={isTailoring}
                className="w-full min-h-[48px] active:scale-95 transition-transform"
              >
                {isTailoring ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Tailor Resume
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onOpenChange(false); resetState(); }}
                className="w-full min-h-[44px]"
              >
                Save Match Only
              </Button>
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
