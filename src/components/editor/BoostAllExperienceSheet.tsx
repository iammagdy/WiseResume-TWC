import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Check, X, AlertTriangle, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAIEnhance } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { Experience } from '@/types/resume';
import { toast } from 'sonner';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

interface BoostAllExperienceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoostAllExperienceSheet({ open, onOpenChange }: BoostAllExperienceSheetProps) {
  const experience = useResumeStore(s => s.currentResume?.experience) ?? [];
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);

  const [improved, setImproved] = useState<Experience[] | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState(false);

  const { enhance, isEnhancing } = useAIEnhance({
    section: 'experience',
    onApply: () => {},
  });

  const runAnalysis = useCallback(async () => {
    if (experience.length === 0) return;
    setImproved(null);
    setChanges([]);
    setSuggestions([]);
    setError(false);

    const result = await enhance('ats_improve', experience, currentResume);
    if (!result) {
      setError(true);
      return;
    }

    const imp = Array.isArray(result.improved) ? result.improved as Experience[] : null;
    if (!imp) {
      setError(true);
      return;
    }

    setImproved(imp);
    setChanges(result.changes ?? []);
    setSuggestions(result.suggestions ?? []);
  }, [experience, currentResume, enhance]);

  useEffect(() => {
    if (open && experience.length > 0) {
      runAnalysis();
    }
    if (!open) {
      setImproved(null);
      setChanges([]);
      setSuggestions([]);
      setError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApply = () => {
    if (!improved) return;
    updateResume({ experience: improved });
    toast.success('All experience entries optimized for ATS!');
    onOpenChange(false);
  };

  const handleDiscard = () => {
    onOpenChange(false);
    toast.info('Changes discarded');
  };

  // Build per-entry change summary from the changes array
  const perEntryChanges: Record<string, string[]> = {};
  if (improved) {
    improved.forEach(entry => {
      const orig = experience.find(e => e.id === entry.id);
      if (!orig) return;
      const diffs: string[] = [];
      if (entry.description !== orig.description) diffs.push('Improved description');
      const origAch = orig.achievements?.length ?? 0;
      const newAch = entry.achievements?.length ?? 0;
      if (newAch > origAch) diffs.push(`Added ${newAch - origAch} bullet${newAch - origAch > 1 ? 's' : ''}`);
      else if (JSON.stringify(entry.achievements) !== JSON.stringify(orig.achievements)) diffs.push('Enhanced bullet points');
      if (diffs.length === 0) diffs.push('Minor wording improvements');
      perEntryChanges[entry.id] = diffs;
    });
  }

  const totalImprovements = Object.values(perEntryChanges).reduce((s, d) => s + d.length, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Boost All Experience
          </SheetTitle>
          <AIProviderVia className="mt-0.5" />
          <SheetDescription>
            {isEnhancing
              ? 'Analyzing all your work experience…'
              : improved
                ? `${totalImprovements} improvement${totalImprovements !== 1 ? 's' : ''} across ${improved.length} role${improved.length !== 1 ? 's' : ''}`
                : error
                  ? 'Something went wrong. Please try again.'
                  : 'Optimize all entries for ATS compatibility.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
          {/* Loading */}
          {isEnhancing && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing {experience.length} role{experience.length !== 1 ? 's' : ''}…</p>
            </div>
          )}

          {/* Error */}
          {error && !isEnhancing && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Could not analyze your experience. Please try again.</p>
              <Button variant="outline" size="sm" onClick={runAnalysis} className="min-h-[44px]">
                Retry
              </Button>
            </div>
          )}

          {/* Results */}
          {improved && !isEnhancing && (
            <div className="space-y-3 pb-4">
              {/* Per-entry cards with before/after */}
              {improved.map(entry => {
                const orig = experience.find(e => e.id === entry.id);
                const entryDiffs = perEntryChanges[entry.id] ?? [];
                const origDesc = orig?.description?.trim() || '';
                const newDesc = entry.description?.trim() || '';
                const origAch = orig?.achievements ?? [];
                const newAch = entry.achievements ?? [];
                const descChanged = origDesc !== newDesc;
                const achChanged = JSON.stringify(origAch) !== JSON.stringify(newAch);

                return (
                  <div key={entry.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm truncate">
                        {orig?.position || entry.position || 'Untitled Role'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {orig?.company || entry.company}
                      {(orig?.account || entry.account) && (
                        <span className="text-muted-foreground/70"> ({orig?.account || entry.account} Account)</span>
                      )}
                    </p>

                    {/* Description diff */}
                    {descChanged && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        {origDesc && (
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="text-xs text-muted-foreground line-through">{origDesc}</p>
                          </div>
                        )}
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                          <p className="text-xs text-foreground">{newDesc}</p>
                        </div>
                      </div>
                    )}

                    {/* Achievements diff */}
                    {achChanged && newAch.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-medium text-muted-foreground">Bullet Points</p>
                        {origAch.length > 0 && (
                          <div className="rounded-lg bg-muted/50 p-2 space-y-0.5">
                            {origAch.map((a, i) => (
                              <p key={i} className="text-xs text-muted-foreground line-through">• {a}</p>
                            ))}
                          </div>
                        )}
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-0.5">
                          {newAch.map((a, i) => (
                            <p key={i} className="text-xs text-foreground">• {a}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Change summary badges */}
                    <ul className="space-y-0.5 pt-1">
                      {entryDiffs.map((d, i) => (
                        <li key={i} className="text-xs text-primary flex items-start gap-1.5">
                          <Check className="w-3 h-3 mt-0.5 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {/* Global changes */}
              {changes.length > 0 && (
                <div className="rounded-xl border border-border p-3 space-y-1.5">
                  <p className="font-medium text-sm">Overall Changes</p>
                  <ul className="space-y-0.5">
                    {changes.map((c, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Suggestions
                  </p>
                  <ul className="space-y-0.5">
                    {suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {improved && !isEnhancing && (
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button variant="outline" className="flex-1 min-h-[48px] gap-1.5" onClick={handleDiscard}>
              <X className="w-4 h-4" />
              Discard
            </Button>
            <Button className="flex-1 min-h-[48px] gap-1.5" onClick={handleApply}>
              <Sparkles className="w-4 h-4" />
              Apply All Changes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
