import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent, parseAIJson } from '@/lib/ai/parseAIResponse';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import type { ResumeData } from '@/types/resume';

interface SkillsGapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SkillImportance = 'critical' | 'high' | 'medium' | 'low';

interface SkillItem {
  skill: string;
  importance: SkillImportance;
}

interface LearningPlanItem {
  week: string;
  action: string;
}

interface GapResult {
  matchedSkills: string[];
  missingSkills: SkillItem[];
  learningPlan: LearningPlanItem[];
}

function isSkillImportance(v: unknown): v is SkillImportance {
  return v === 'critical' || v === 'high' || v === 'medium' || v === 'low';
}

function isSkillItem(v: unknown): v is SkillItem {
  if (typeof v !== 'object' || v === null) return false;
  const item = v as Record<string, unknown>;
  return typeof item.skill === 'string' && isSkillImportance(item.importance);
}

function isLearningPlanItem(v: unknown): v is LearningPlanItem {
  if (typeof v !== 'object' || v === null) return false;
  const item = v as Record<string, unknown>;
  return typeof item.week === 'string' && typeof item.action === 'string';
}

function isGapResult(v: unknown): v is GapResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r.matchedSkills) &&
    r.matchedSkills.every((s: unknown) => typeof s === 'string') &&
    Array.isArray(r.missingSkills) &&
    r.missingSkills.every(isSkillItem) &&
    Array.isArray(r.learningPlan) &&
    r.learningPlan.every(isLearningPlanItem)
  );
}

const IMPORTANCE_STYLES: Record<SkillImportance, string> = {
  critical: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

function getResumeSkillsString(resume: ResumeData | null): string {
  if (!resume?.skills) return 'Not listed';
  const skills = resume.skills as unknown[];
  return skills
    .map(s => (typeof s === 'string' ? s : (s as Record<string, string>)?.name ?? ''))
    .filter(Boolean)
    .join(', ');
}

function getResumeExperienceString(resume: ResumeData | null): string {
  if (!resume?.experience) return '';
  const exp = resume.experience as Array<{
    position?: string;
    company?: string;
    achievements?: string[];
  }>;
  return exp
    .slice(0, 3)
    .map(e => {
      const role = `${e.position ?? ''} at ${e.company ?? ''}`.trim();
      const bullets = (e.achievements ?? []).slice(0, 2).join(', ');
      return bullets ? `${role}: ${bullets}` : role;
    })
    .filter(Boolean)
    .join(' | ');
}

export function SkillsGapSheet({ open, onOpenChange }: SkillsGapSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<GapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const { execute } = useAIAction({ operation: 'skills-gap' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<GapResult>('skills-gap', resumeId);

  useEffect(() => {
    if (open && hasDraft && !result) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, result]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description');
      return;
    }
    if (!currentResume) {
      toast.error('Please select a resume first');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const resume = currentResume as unknown as ResumeData;
        const skills = getResumeSkillsString(resume);
        const experience = getResumeExperienceString(resume);
        const summary = resume.summary ?? '';

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            type: 'skills_gap',
            payload: {
              skills,
              experience,
              summary,
              jobDescription,
              resumeContext: redactedResume,
            },
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        return parseAIJson(content, isGapResult);
      });
      if (data) {
        setResult(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to analyze skills gap. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNew = () => {
    setResult(null);
    clearDraft();
    setShowDraftBanner(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Skills Gap Analyzer
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="skills-gap" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {showDraftBanner && draft && !result && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">Resume from last session?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResult(draft); setShowDraftBanner(false); }}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { clearDraft(); setShowDraftBanner(false); }}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!result ? (
            <>
              <div className="space-y-1.5">
                <Label>Job Description *</Label>
                <Textarea
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={7}
                  className="resize-none"
                />
              </div>
              <Button className="w-full gradient-primary" onClick={handleAnalyze} disabled={isLoading || !currentResume}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing gap...</>
                ) : (
                  <><TrendingUp className="w-4 h-4 mr-2" />Analyze Skills Gap</>
                )}
              </Button>
              {!currentResume && (
                <p className="text-xs text-center text-muted-foreground">Select a resume to use this tool</p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Skills Gap Report</h3>
                <Button variant="ghost" size="sm" onClick={handleNew} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  New
                </Button>
              </div>

              {result.matchedSkills.length > 0 && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 space-y-2">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                    Matched Skills ({result.matchedSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedSkills.map((skill, i) => (
                      <Badge key={i} className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 border text-xs font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.missingSkills.length > 0 && (
                <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Missing Skills ({result.missingSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingSkills.map((item, i) => (
                      <Badge
                        key={i}
                        className={cn('border text-xs font-normal', IMPORTANCE_STYLES[item.importance])}
                      >
                        {item.skill}
                        <span className="ml-1 opacity-60 capitalize">({item.importance})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.learningPlan.length > 0 && (
                <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">30-Day Learning Plan</p>
                  <div className="space-y-2">
                    {result.learningPlan.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-xs font-medium text-primary shrink-0 mt-0.5 min-w-[60px]">{item.week}</span>
                        <span className="text-sm">{item.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
