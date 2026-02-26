import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { activityTracker } from '@/lib/activityTracker';
import { cn } from '@/lib/utils';
import { Trophy, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ATSResult {
  overallScore: number;
  categories: Record<string, number>;
  topStrength: string;
  topImprovement: string;
}

interface AIMatchResult {
  score: { overall: number; skills: number; experience: number; keywords: number };
}

type Step = 'input' | 'loading' | 'results';

const CATEGORY_LABELS: Record<string, string> = {
  keywordOptimization: 'Keywords',
  contentQuality: 'Content Quality',
  sectionStructure: 'Sections',
  parsability: 'Parsability',
  contactCompleteness: 'Contact Info',
  lengthDensity: 'Length & Density',
};

export default function ResumeABCompareSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { data: resumes } = useResumes();

  useEffect(() => {
    if (open) { activityTracker.setActiveFeature('A/B Compare'); }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);

  const [resumeAId, setResumeAId] = useState('');
  const [resumeBId, setResumeBId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [step, setStep] = useState<Step>('input');

  const [atsA, setAtsA] = useState<ATSResult | null>(null);
  const [atsB, setAtsB] = useState<ATSResult | null>(null);
  const [matchA, setMatchA] = useState<AIMatchResult | null>(null);
  const [matchB, setMatchB] = useState<AIMatchResult | null>(null);

  const resumeList = (resumes || []) as unknown as DatabaseResume[];

  const resumeATitle = resumeList.find(r => r.id === resumeAId)?.title || 'Resume A';
  const resumeBTitle = resumeList.find(r => r.id === resumeBId)?.title || 'Resume B';

  const canCompare = resumeAId && resumeBId && resumeAId !== resumeBId && jobDescription.trim().length >= 20;

  const resetState = useCallback(() => {
    setStep('input');
    setAtsA(null);
    setAtsB(null);
    setMatchA(null);
    setMatchB(null);
  }, []);

  const handleCompare = useCallback(async () => {
    if (!canCompare || !user) return;
    haptics.medium();
    setStep('loading');

    const dbA = resumeList.find(r => r.id === resumeAId);
    const dbB = resumeList.find(r => r.id === resumeBId);
    if (!dbA || !dbB) { toast.error('Could not find selected resumes'); setStep('input'); return; }

    const dataA = dbToResumeData(dbA);
    const dataB = dbToResumeData(dbB);

    try {
      const [atsResA, atsResB, matchResA, matchResB] = await Promise.all([
        edgeFunctions.functions.invoke('score-resume', { body: { resume: dataA } }),
        edgeFunctions.functions.invoke('score-resume', { body: { resume: dataB } }),
        edgeFunctions.functions.invoke('analyze-resume', { body: { resume: dataA, jobDescription } }),
        edgeFunctions.functions.invoke('analyze-resume', { body: { resume: dataB, jobDescription } }),
      ]);

      // Check for errors
      for (const res of [atsResA, atsResB, matchResA, matchResB]) {
        if (res.error) {
          const msg = res.error.message || 'Scoring failed';
          if (msg.includes('429') || msg.includes('Rate limit')) {
            toast.error('Rate limit reached. Please wait a moment and try again.');
          } else if (msg.includes('401') || msg.includes('Unauthorized')) {
            toast.error('Session expired. Please log in again.');
          } else {
            toast.error(msg);
          }
          setStep('input');
          return;
        }
      }

      setAtsA(atsResA.data);
      setAtsB(atsResB.data);
      setMatchA(matchResA.data);
      setMatchB(matchResB.data);
      setStep('results');
      haptics.success();
    } catch (err) {
      console.error('A/B Compare error:', err);
      toast.error('Comparison failed. Please try again.');
      setStep('input');
    }
  }, [canCompare, user, resumeAId, resumeBId, resumeList, jobDescription]);

  const winner = useMemo(() => {
    if (!atsA || !atsB) return null;
    const scoreA = (atsA.overallScore + (matchA?.score?.overall || 0)) / 2;
    const scoreB = (atsB.overallScore + (matchB?.score?.overall || 0)) / 2;
    if (scoreA === scoreB) return 'tie';
    return scoreA > scoreB ? 'a' : 'b';
  }, [atsA, atsB, matchA, matchB]);

  const insights = useMemo(() => {
    if (!atsA?.categories || !atsB?.categories) return [];
    const result: string[] = [];
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      const diff = (atsA.categories[key] || 0) - (atsB.categories[key] || 0);
      if (Math.abs(diff) >= 5) {
        const better = diff > 0 ? resumeATitle : resumeBTitle;
        result.push(`${better} has ${Math.abs(diff)}% better ${label.toLowerCase()}`);
      }
    }
    if (matchA?.score && matchB?.score) {
      const skillDiff = matchA.score.skills - matchB.score.skills;
      if (Math.abs(skillDiff) >= 5) {
        result.push(`${skillDiff > 0 ? resumeATitle : resumeBTitle} has stronger skill alignment`);
      }
    }
    return result.slice(0, 4);
  }, [atsA, atsB, matchA, matchB, resumeATitle, resumeBTitle]);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <SheetContent side="bottom" className="h-[92dvh] flex flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader className="shrink-0">
          <div className="flex items-center gap-2">
            {step === 'results' && (
              <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]" onClick={() => { haptics.light(); resetState(); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <SheetTitle className="text-fluid-lg">A/B Compare</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 pb-safe">
          {/* INPUT STEP */}
          {step === 'input' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Resume A</label>
                <Select value={resumeAId} onValueChange={setResumeAId}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select first resume" /></SelectTrigger>
                  <SelectContent>
                    {resumeList.map(r => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === resumeBId}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Resume B</label>
                <Select value={resumeBId} onValueChange={setResumeBId}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select second resume" /></SelectTrigger>
                  <SelectContent>
                    {resumeList.map(r => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === resumeAId}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Job Description</label>
                <Textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="min-h-[160px]"
                />
                {jobDescription.length > 0 && jobDescription.trim().length < 20 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Minimum 20 characters
                  </p>
                )}
              </div>

              <Button
                className="w-full min-h-[48px] gradient-primary active:scale-95 transition-transform"
                disabled={!canCompare}
                onClick={handleCompare}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Compare Resumes
              </Button>
            </div>
          )}

          {/* LOADING STEP */}
          {step === 'loading' && (
            <div className="space-y-6 pt-4">
              <p className="text-sm text-muted-foreground text-center animate-pulse">Scoring both resumes...</p>
              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(i => (
                  <div key={i} className="space-y-3 p-3 rounded-xl glass-surface border border-border/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                    {[0, 1, 2].map(j => <Skeleton key={j} className="h-3 w-full" />)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS STEP */}
          {step === 'results' && atsA && atsB && (
            <div className="space-y-5 pt-2">
              {/* Winner Banner */}
              {winner && winner !== 'tie' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <Trophy className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm font-medium">
                    <span className="text-primary">{winner === 'a' ? resumeATitle : resumeBTitle}</span> performs better for this role
                  </p>
                </motion.div>
              )}
              {winner === 'tie' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                  <Trophy className="w-5 h-5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium text-muted-foreground">Both resumes scored equally!</p>
                </div>
              )}

              {/* ATS Score Rings */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: resumeATitle, ats: atsA, match: matchA, side: 'a' as const },
                  { label: resumeBTitle, ats: atsB, match: matchB, side: 'b' as const },
                ].map(({ label, ats, match, side }) => (
                  <motion.div
                    key={side}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: side === 'b' ? 0.1 : 0 }}
                    className={cn(
                      'p-3 rounded-xl glass-surface border transition-all',
                      winner === side ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border/30'
                    )}
                  >
                    <p className="text-xs font-medium truncate mb-2 text-muted-foreground">{label}</p>
                    <div className="flex justify-center mb-3">
                      <ScoreRing score={ats.overallScore} size={56} strokeWidth={4} />
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mb-1">ATS Score</p>
                    {match?.score && (
                      <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Job Match</p>
                        <div className="text-lg font-bold text-center">{match.score.overall}%</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Category Comparison Bars */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Category Breakdown</h3>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const valA = atsA.categories[key] || 0;
                  const valB = atsB.categories[key] || 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{label}</span>
                        <span>{valA}% vs {valB}%</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', valA >= valB ? 'bg-primary' : 'bg-muted-foreground/40')}
                            style={{ width: `${valA}%` }}
                          />
                        </div>
                        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', valB >= valA ? 'bg-primary' : 'bg-muted-foreground/40')}
                            style={{ width: `${valB}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Match Breakdown */}
              {matchA?.score && matchB?.score && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">AI Job Match</h3>
                  {(['skills', 'experience', 'keywords'] as const).map(dim => (
                    <div key={dim} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted-foreground">{dim}</span>
                      <div className="flex gap-3">
                        <span className={cn('font-medium', matchA.score[dim] >= matchB.score[dim] ? 'text-primary' : 'text-muted-foreground')}>
                          {matchA.score[dim]}%
                        </span>
                        <span className="text-muted-foreground/50">vs</span>
                        <span className={cn('font-medium', matchB.score[dim] >= matchA.score[dim] ? 'text-primary' : 'text-muted-foreground')}>
                          {matchB.score[dim]}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Key Insights */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Key Differences</h3>
                  <div className="space-y-1.5">
                    {insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: resumeATitle, ats: atsA },
                  { label: resumeBTitle, ats: atsB },
                ].map(({ label, ats }) => (
                  <div key={label} className="p-2 rounded-lg bg-muted/20 space-y-1">
                    <p className="text-[10px] font-medium truncate text-muted-foreground">{label}</p>
                    <p className="text-xs text-primary">✓ {ats.topStrength}</p>
                    <p className="text-xs text-muted-foreground">↑ {ats.topImprovement}</p>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full min-h-[48px] active:scale-95" onClick={() => { haptics.light(); resetState(); }}>
                Compare Again
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
