import { useState, useEffect } from 'react';
import { XCircle, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent, parseAIJson } from '@/lib/ai/parseAIResponse';

interface JobRejectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RejectionResult {
  likelyReason: string;
  improvementAreas: string[];
  nextSteps: string[];
  encouragingReframe: string;
}

function isRejectionResult(v: unknown): v is RejectionResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.likelyReason === 'string' &&
    Array.isArray(r.improvementAreas) &&
    Array.isArray(r.nextSteps) &&
    typeof r.encouragingReframe === 'string'
  );
}

export function JobRejectionSheet({ open, onOpenChange }: JobRejectionSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const [rejectionText, setRejectionText] = useState('');
  const [result, setResult] = useState<RejectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const { execute } = useAIAction({ operation: 'job-rejection' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<RejectionResult>('job-rejection', resumeId);

  useEffect(() => {
    if (open && hasDraft && !result) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, result]);

  const handleAnalyze = async () => {
    if (!rejectionText.trim()) {
      toast.error('Please paste the rejection email or describe what happened');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const candidateName = currentResume?.contactInfo?.fullName ?? '';
        const summary = currentResume?.summary ?? '';
        const { data: responseData, error } = await appwriteFunctions.invoke('wise-ai-chat', {
          body: {
            type: 'job_rejection',
            payload: {
              rejectionText,
              candidateName,
              summary,
              resumeContext: currentResume ?? null,
            },
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        return parseAIJson(content, isRejectionResult);
      });
      if (data) {
        setResult(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to analyze rejection. Please try again.');
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
            <XCircle className="w-5 h-5 text-rose-500" />
            Job Rejection Analyzer
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="job-rejection" />
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
                <Label>Rejection Email or Description *</Label>
                <Textarea
                  placeholder="Paste the rejection email here, or describe what happened (e.g. 'I made it to the final round but was rejected after the technical interview')"
                  value={rejectionText}
                  onChange={e => setRejectionText(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
              <Button
                className="w-full gradient-primary"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-2" />Analyze Rejection</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Rejection Analysis</h3>
                <Button variant="ghost" size="sm" onClick={handleNew} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  New
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Likely Reason</p>
                <p className="text-sm">{result.likelyReason}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Areas to Improve</p>
                <ul className="space-y-1.5">
                  {result.improvementAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5 shrink-0">▲</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Actionable Next Steps</p>
                <ol className="space-y-1.5">
                  {result.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5">
                <p className="text-xs font-medium text-primary">Encouraging Reframe</p>
                <p className="text-sm italic">{result.encouragingReframe}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
