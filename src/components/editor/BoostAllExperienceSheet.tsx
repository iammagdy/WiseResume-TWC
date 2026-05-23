import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { ExperienceDiffCard } from '@/components/editor/ai/ExperienceDiffCard';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAIEnhance } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { Experience } from '@/types/resume';
import { toast } from 'sonner';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import {
  mergeAIArrayResult,
  EXPERIENCE_FINGERPRINT,
  experienceDefaults,
} from '@/lib/applyAIResult';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';

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

    // Skip entries that have no description and no achievements — sending
    // blank entries to the AI wastes credits and produces unhelpful results.
    const filledEntries = experience.filter(e => {
      const desc = (e.description ?? '').trim();
      const ach = (e.achievements ?? []).filter(a => a.trim() !== '');
      return desc !== '' || ach.length > 0;
    });

    if (filledEntries.length === 0) {
      toast.info('Add descriptions or bullet points to your experience entries first — then AI can improve them.');
      return;
    }

    const skippedCount = experience.length - filledEntries.length;
    if (skippedCount > 0) {
      toast.info(`Skipping ${skippedCount} empty entr${skippedCount === 1 ? 'y' : 'ies'} — add content to include them.`, { duration: 4000 });
    }

    const result = await enhance('ats_improve', filledEntries, currentResume);
    if (!result) {
      // null = privacy disclosure dismissed — reset silently, no error panel
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

  const { rescoreAfterApply } = useAIApplyEffects(currentResume?.id);

  const commitApply = useCallback((next: Experience[]) => {
    if (!currentResume) return;
    updateResume({ experience: next });
    toast.success('All experience entries optimized for ATS!');
    void rescoreAfterApply({ ...currentResume, experience: next });
    onOpenChange(false);
  }, [currentResume, updateResume, rescoreAfterApply, onOpenChange]);

  const handleApply = (bypassConfirm = false) => {
    if (!improved || !currentResume) return;
    // Re-run the canonical merge against current originals so we never
    // silently drop user data even if the user added/removed entries
    // between Generate and Apply.
    const merge = mergeAIArrayResult<Record<string, unknown>>({
      originals: experience as unknown as Record<string, unknown>[],
      aiEntries: improved,
      fingerprint: EXPERIENCE_FINGERPRINT,
      fieldDefaults: experienceDefaults,
    });
    const next = merge.merged as unknown as Experience[];
    // Destructive case: AI returned fewer entries than the user has.
    // Give a one-click "Apply anyway" so they can confirm without
    // re-generating the whole batch.
    if (merge.requiresConfirm && !bypassConfirm) {
      toast.warning(
        `AI returned ${merge.aiCount} of ${merge.originalCount} entries. Originals will be preserved.`,
        {
          duration: 12000,
          action: {
            label: 'Apply anyway',
            onClick: () => commitApply(next),
          },
        },
      );
      return;
    }
    commitApply(next);
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
              <MiniSpinner size={32} />
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
                return (
                  <ExperienceDiffCard key={entry.id} entry={entry} original={orig} diffs={entryDiffs} />
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

        {/* Actions — sticky, opaque background so the diff list never shows
            through and the buttons stay readable on long lists. */}
        {improved && !isEnhancing && (
          <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex gap-3 border-t border-border bg-background z-10">
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
