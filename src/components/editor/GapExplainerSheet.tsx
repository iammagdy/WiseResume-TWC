import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, Lightbulb, ChevronDown, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { GapInfo, formatDuration } from '@/lib/dateUtils';
import { Experience } from '@/types/resume';
import { getUserGeminiKey } from '@/lib/aiProvider';

interface GapExplainerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  gap: GapInfo | null;
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatGapDate(date: { month: number; year: number }): string {
  return `${MONTHS[date.month]} ${date.year}`;
}

export function GapExplainerSheet({ isOpen, onClose, gap, experiences, onAddToSummary }: GapExplainerSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [tips, setTips] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  // Find surrounding jobs for context
  const getSurroundingJobs = () => {
    if (!gap) return { previousJob: undefined, nextJob: undefined };

    // Sort experiences by start date
    const sorted = [...experiences]
      .filter(exp => exp.startDate)
      .sort((a, b) => {
        const aYear = parseInt(a.startDate.match(/\d{4}/)?.[0] || '0');
        const bYear = parseInt(b.startDate.match(/\d{4}/)?.[0] || '0');
        return aYear - bYear;
      });

    let previousJob: { position: string; company: string } | undefined;
    let nextJob: { position: string; company: string } | undefined;

    for (const exp of sorted) {
      const startMatch = exp.startDate.match(/\d{4}/);
      if (startMatch) {
        const startYear = parseInt(startMatch[0]);
        if (startYear <= gap.startDate.year) {
          previousJob = { position: exp.position, company: exp.company };
        }
        if (startYear >= gap.endDate.year && !nextJob) {
          nextJob = { position: exp.position, company: exp.company };
        }
      }
    }

    return { previousJob, nextJob };
  };

  const handleGenerate = async () => {
    if (!gap || !selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    setIsGenerating(true);
    setExplanation('');
    setTips([]);

    try {
      const { previousJob, nextJob } = getSurroundingJobs();

      const { data, error } = await supabase.functions.invoke('explain-gap', {
        body: {
          gap: {
            startDate: formatGapDate(gap.startDate),
            endDate: formatGapDate(gap.endDate),
            months: gap.months,
          },
          reason: selectedReason,
          previousJob,
          nextJob,
          additionalContext: additionalContext.trim() || undefined,
          userGeminiKey: getUserGeminiKey(),
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setExplanation(data.explanation);
      setTips(data.tips || []);
      setIsEdited(false);
    } catch (err) {
      console.error('Error generating explanation:', err);
      toast.error('Failed to generate explanation', {
        description: 'Please try again in a moment.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(explanation);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleAddToSummary = () => {
    if (onAddToSummary && explanation) {
      onAddToSummary(explanation);
      toast.success('Added to summary!');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setAdditionalContext('');
    setExplanation('');
    setTips([]);
    setIsEdited(false);
    onClose();
  };

  if (!gap) return null;

  const gapDateRange = `${formatGapDate(gap.startDate)} – ${formatGapDate(gap.endDate)}`;
  const selectedReasonLabel = REASON_OPTIONS.find(r => r.value === selectedReason)?.label;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Gap Assistant
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* Gap Info */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">Employment Gap</p>
            <p className="font-semibold">{gapDateRange}</p>
            <p className="text-sm text-muted-foreground">{formatDuration(gap.months)}</p>
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <Label>What was the reason for this gap?</Label>
            <div className="relative">
              <button
                onClick={() => setShowReasonDropdown(!showReasonDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background text-left hover:bg-muted/50 transition-colors"
              >
                <span className={selectedReason ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedReasonLabel || 'Select a reason...'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showReasonDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showReasonDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
                  >
                    {REASON_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedReason(option.value);
                          setShowReasonDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors ${
                          selectedReason === option.value ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label>Additional context (optional)</Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any details that might help personalize the explanation..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Generate Button */}
          {!explanation && (
            <Button
              onClick={handleGenerate}
              disabled={!selectedReason || isGenerating}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Explanation
                </>
              )}
            </Button>
          )}

          {/* Result */}
          <AnimatePresence>
            {explanation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Explanation */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                  <Label className="text-primary flex items-center gap-2">
                    Your Explanation
                    {isEdited && (
                      <span className="text-xs font-normal text-muted-foreground">(Edited)</span>
                    )}
                  </Label>
                  <Textarea
                    value={explanation}
                    onChange={(e) => {
                      setExplanation(e.target.value);
                      setIsEdited(true);
                    }}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="Edit your explanation..."
                  />
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    {onAddToSummary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddToSummary}
                        className="gap-2"
                      >
                        Add to Summary
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tips */}
                {tips.length > 0 && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                    <Label className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Interview Tips
                    </Label>
                    <ul className="space-y-2">
                      {tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Generate Again */}
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Again
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
