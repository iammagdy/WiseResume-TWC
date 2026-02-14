import { memo, useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, ChevronLeft, ChevronRight, SpellCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import type { ProofreadIssue, WritingScore } from '@/types/proofread';

interface ProofreadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: ProofreadIssue[];
  score: WritingScore | null;
  isChecking: boolean;
  onFix: (issueId: string, suggestionIndex?: number) => void;
  onIgnore: (issueId: string) => void;
  onFixAll: () => void;
  onCheckNow: () => void;
  autoProofread: boolean;
}

const TYPE_CONFIG = {
  spelling: { label: 'Spelling', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  grammar: { label: 'Grammar', color: 'bg-primary/15 text-primary border-primary/30' },
  style: { label: 'Style', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
} as const;

const ScoreBar = memo(function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  );
});

export const ProofreadSheet = memo(function ProofreadSheet({
  open,
  onOpenChange,
  issues,
  score,
  isChecking,
  onFix,
  onIgnore,
  onFixAll,
  onCheckNow,
  autoProofread,
}: ProofreadSheetProps) {
  const [scoreOpen, setScoreOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const spellingCount = issues.filter((i) => i.type === 'spelling').length;

  const handlePrev = useCallback(() => {
    haptics.selection();
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    haptics.selection();
    setCurrentIndex((i) => Math.min(issues.length - 1, i + 1));
  }, [issues.length]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <SpellCheck className="w-5 h-5 text-primary" />
            Proofread
          </SheetTitle>
          <SheetDescription>
            {isChecking ? 'Checking...' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} found`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pt-2">
          {/* Score Card */}
          {score && (
            <Collapsible open={scoreOpen} onOpenChange={setScoreOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-xl glass-surface border border-border/30 touch-manipulation active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                      score.overall >= 80 ? 'bg-success/15 text-success' : score.overall >= 50 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'
                    )}>
                      {score.overall}
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-medium">Writing Score</span>
                      <span className={cn(
                        'ml-2 text-[10px] px-1.5 py-0.5 rounded-full border',
                        score.tone === 'professional' ? 'bg-success/10 text-success border-success/30' :
                        score.tone === 'casual' ? 'bg-warning/10 text-warning border-warning/30' :
                        'bg-muted text-muted-foreground border-border'
                      )}>
                        {score.tone}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', scoreOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-3 px-1">
                  <ScoreBar label="Spelling" value={score.spelling} />
                  <ScoreBar label="Grammar" value={score.grammar} />
                  <ScoreBar label="Style" value={score.style} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Issue List */}
          {issues.length === 0 && !isChecking ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-sm font-medium">Your resume looks great!</p>
              <p className="text-xs text-muted-foreground">No issues found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, idx) => {
                const cfg = TYPE_CONFIG[issue.type];
                return (
                  <div
                    key={issue.id}
                    className={cn(
                      'p-3 rounded-xl glass-surface border border-border/30 space-y-2 transition-all',
                      idx === currentIndex && 'ring-2 ring-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">{issue.sectionName}</span>
                    </div>

                    <p className="text-sm">
                      <span className={cn(
                        'underline decoration-2 decoration-wavy',
                        issue.type === 'spelling' ? 'decoration-destructive' :
                        issue.type === 'grammar' ? 'decoration-primary' : 'decoration-emerald-500'
                      )}>
                        {issue.original}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">{issue.explanation}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {issue.suggestions.map((sug, si) => (
                        <button
                          key={si}
                          onClick={() => {
                            haptics.success();
                            onFix(issue.id, si);
                          }}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium active:scale-95 transition-transform touch-manipulation"
                        >
                          {sug}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          haptics.light();
                          onIgnore(issue.id);
                        }}
                        className="min-h-[44px] px-3 py-2 rounded-lg text-muted-foreground text-sm active:scale-95 transition-transform touch-manipulation"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-3 border-t border-border space-y-2 pb-safe">
          {/* Navigation */}
          {issues.length > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs text-muted-foreground">{currentIndex + 1} / {issues.length}</span>
              <button onClick={handleNext} disabled={currentIndex >= issues.length - 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {spellingCount > 0 && (
              <Button onClick={() => { haptics.medium(); onFixAll(); }} variant="default" className="flex-1 h-12">
                Fix All Spelling ({spellingCount})
              </Button>
            )}
            {!autoProofread && (
              <Button onClick={() => { haptics.medium(); onCheckNow(); }} variant="outline" className="flex-1 h-12">
                Check Now
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
