import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, Lightbulb, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { toast } from 'sonner';
import editorLogger from '@/lib/editorLogger';
import {
  GapInfo,
  formatDuration,
  formatParsedGapDate,
  gapsAreSame,
} from '@/lib/dateUtils';
import { Experience } from '@/types/resume';
import { useAIAction } from '@/hooks/useAIAction';
import { cn } from '@/lib/utils';

interface GapExplainerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  gaps: GapInfo[];
  activeGapIndex: number;
  onActiveGapIndexChange: (index: number) => void;
  experiences: Experience[];
  onAddToSummary?: (explanation: string) => void;
}

const REASON_OPTIONS = [
  { value: 'career_transition', label: 'Career transition / exploring new paths' },
  { value: 'personal_development', label: 'Personal development / skill building' },
  { value: 'family_caregiving', label: 'Family or caregiving responsibilities' },
  { value: 'health_related', label: 'Health-related leave' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'education_training', label: 'Education or training' },
  { value: 'entrepreneurial', label: 'Entrepreneurial venture' },
  { value: 'volunteer_sabbatical', label: 'Volunteer work / sabbatical' },
  { value: 'other', label: 'Other' },
] as const;

function gapStorageKey(gap: GapInfo): string {
  return `${gap.startDate.year}-${gap.startDate.month}-${gap.endDate.year}-${gap.endDate.month}-${gap.months}`;
}

type GapFormState = {
  selectedReason: string;
  additionalContext: string;
  targetRole: string;
  explanation: string;
  tips: string[];
  isEdited: boolean;
};

const emptyFormState = (): GapFormState => ({
  selectedReason: '',
  additionalContext: '',
  targetRole: '',
  explanation: '',
  tips: [],
  isEdited: false,
});

export function GapExplainerSheet({
  isOpen,
  onClose,
  gaps,
  activeGapIndex,
  onActiveGapIndexChange,
  experiences,
  onAddToSummary,
}: GapExplainerSheetProps) {
  const gap = gaps[activeGapIndex] ?? null;
  const [formByGap, setFormByGap] = useState<Record<string, GapFormState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const { execute: executeAI } = useAIAction({ operation: 'gap-explain' });

  const activeKey = gap ? gapStorageKey(gap) : '';
  const form = (activeKey && formByGap[activeKey]) || emptyFormState();

  const patchForm = useCallback(
    (patch: Partial<GapFormState>) => {
      if (!activeKey) return;
      setFormByGap((prev) => ({
        ...prev,
        [activeKey]: { ...(prev[activeKey] ?? emptyFormState()), ...patch },
      }));
    },
    [activeKey],
  );

  useEffect(() => {
    if (!isOpen) {
      setFormByGap({});
      setShowReasonDropdown(false);
      setCopied(false);
    }
  }, [isOpen]);

  const getSurroundingJobs = useCallback(() => {
    if (!gap) return { previousJob: undefined, nextJob: undefined };

    const sorted = [...experiences]
      .filter((exp) => exp.startDate)
      .sort((a, b) => {
        const aYear = parseInt(a.startDate.match(/\d{4}/)?.[0] || '0', 10);
        const bYear = parseInt(b.startDate.match(/\d{4}/)?.[0] || '0', 10);
        return aYear - bYear;
      });

    let previousJob: { position: string; company: string } | undefined;
    let nextJob: { position: string; company: string } | undefined;

    for (const exp of sorted) {
      const startMatch = exp.startDate.match(/\d{4}/);
      if (startMatch) {
        const startYear = parseInt(startMatch[0], 10);
        if (startYear <= gap.startDate.year) {
          previousJob = { position: exp.position, company: exp.company };
        }
        if (startYear >= gap.endDate.year && !nextJob) {
          nextJob = { position: exp.position, company: exp.company };
        }
      }
    }

    return { previousJob, nextJob };
  }, [gap, experiences]);

  const handleGenerate = async () => {
    if (!gap || !form.selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    setIsGenerating(true);
    patchForm({ explanation: '', tips: [] });

    try {
      const { previousJob, nextJob } = getSurroundingJobs();

      const result = await executeAI(async () => {
        const { data, error } = await appwriteFunctions.invoke('resume-section-ai', {
          body: {
            'x-resume-section-ai-action': 'explain-gap',
            gap: {
              startDate: formatParsedGapDate(gap.startDate),
              endDate: formatParsedGapDate(gap.endDate),
              months: gap.months,
            },
            reason: form.selectedReason,
            targetRole: form.targetRole.trim() || undefined,
            previousJob,
            nextJob,
            additionalContext: form.additionalContext.trim() || undefined,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
      });

      if (!result) return;

      patchForm({
        explanation: result.explanation,
        tips: result.tips || result.talking_points || [],
        isEdited: false,
      });
    } catch (err) {
      editorLogger.error('Error generating explanation:', err);
      toast.error('Failed to generate explanation', {
        description: 'Please try again in a moment.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(form.explanation);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleAddToSummary = () => {
    if (onAddToSummary && form.explanation) {
      onAddToSummary(form.explanation);
      toast.success('Added to summary!');
      onClose();
    }
  };

  const handleClose = () => {
    setFormByGap({});
    setShowReasonDropdown(false);
    onClose();
  };

  if (!gap || gaps.length === 0) return null;

  const gapDateRange = `${formatParsedGapDate(gap.startDate)} – ${formatParsedGapDate(gap.endDate)}`;
  const selectedReasonLabel = REASON_OPTIONS.find((r) => r.value === form.selectedReason)?.label;
  const explainedCount = gaps.filter((g) => {
    const s = formByGap[gapStorageKey(g)];
    return s?.explanation?.trim();
  }).length;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Gap Assistant
          </SheetTitle>
          {gaps.length > 1 && (
            <p className="text-xs text-muted-foreground text-left">
              Gap Finder found {gaps.length} gaps — explain each one separately.
              {explainedCount > 0 && ` (${explainedCount} of ${gaps.length} drafted)`}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {gaps.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select gap to explain</Label>
              <div className="flex flex-col gap-2">
                {gaps.map((g, index) => {
                  const range = `${formatParsedGapDate(g.startDate)} – ${formatParsedGapDate(g.endDate)}`;
                  const isActive = index === activeGapIndex;
                  const hasDraft = !!formByGap[gapStorageKey(g)]?.explanation?.trim();
                  return (
                    <button
                      key={gapStorageKey(g)}
                      type="button"
                      onClick={() => {
                        onActiveGapIndexChange(index);
                        setShowReasonDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
                        isActive
                          ? 'border-warning/50 bg-warning/10 ring-1 ring-warning/30'
                          : 'border-border bg-muted/30 hover:bg-muted/50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          Gap {index + 1} of {gaps.length}
                        </span>
                        {hasDraft && (
                          <span className="text-[10px] font-medium text-success shrink-0">Drafted</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5">{range}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(g.months)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="text-sm text-muted-foreground">
              {gaps.length > 1 ? `Gap ${activeGapIndex + 1}` : 'Employment gap'}
            </p>
            <p className="font-semibold text-foreground">{gapDateRange}</p>
            <p className="text-sm text-muted-foreground">{formatDuration(gap.months)}</p>
          </div>

          <div className="space-y-2">
            <Label>What was the reason for this gap?</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReasonDropdown(!showReasonDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background text-left hover:bg-muted transition-colors"
              >
                <span className={form.selectedReason ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedReasonLabel || 'Select a reason...'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showReasonDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showReasonDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
                  >
                    {REASON_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          patchForm({ selectedReason: option.value });
                          setShowReasonDropdown(false);
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors',
                          form.selectedReason === option.value ? 'bg-primary/10 text-primary' : '',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional context (optional)</Label>
            <Textarea
              value={form.additionalContext}
              onChange={(e) => patchForm({ additionalContext: e.target.value })}
              placeholder="Any details that might help personalize the explanation..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Target role (optional)</Label>
              <span
                className={cn(
                  'text-xs',
                  form.targetRole.length > 180
                    ? form.targetRole.length >= 200
                      ? 'text-destructive font-medium'
                      : 'text-amber-500'
                    : 'text-muted-foreground',
                )}
              >
                {form.targetRole.length}/200
              </span>
            </div>
            <Input
              value={form.targetRole}
              onChange={(e) => patchForm({ targetRole: e.target.value })}
              placeholder="e.g. Product Manager, Software Engineer..."
              maxLength={200}
            />
          </div>

          {!form.explanation && (
            <Button
              onClick={handleGenerate}
              disabled={!form.selectedReason || isGenerating}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <MiniSpinner size={16} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate explanation for this gap
                </>
              )}
            </Button>
          )}

          <AnimatePresence>
            {form.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                  <Label className="text-primary flex items-center gap-2">
                    Your explanation
                    {form.isEdited && (
                      <span className="text-xs font-normal text-muted-foreground">(Edited)</span>
                    )}
                  </Label>
                  <Textarea
                    value={form.explanation}
                    onChange={(e) => patchForm({ explanation: e.target.value, isEdited: true })}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Edit your explanation..."
                  />

                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    {onAddToSummary && (
                      <Button variant="outline" size="sm" onClick={handleAddToSummary} className="gap-2">
                        Add to Summary
                      </Button>
                    )}
                  </div>
                </div>

                {form.tips.length > 0 && (
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                    <Label className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Interview tips
                    </Label>
                    <ul className="space-y-2">
                      {form.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <>
                      <MiniSpinner size={16} />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate again
                    </>
                  )}
                </Button>

                {gaps.length > 1 && activeGapIndex < gaps.length - 1 && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => onActiveGapIndexChange(activeGapIndex + 1)}
                  >
                    Next gap ({activeGapIndex + 2} of {gaps.length})
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
