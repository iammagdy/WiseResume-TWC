import { memo, useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Zap, AlertTriangle, Info, Sparkles, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ATSSuggestion } from '@/hooks/useATSSuggestions';
import { SectionId } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { toast } from 'sonner';
import haptics from '@/lib/haptics';
import type { DeepResult } from '@/hooks/useATSSuggestions';

interface ATSInlineSuggestionsProps {
  section: SectionId;
  suggestions: ATSSuggestion[];
  isAnalyzing: boolean;
  onDeepAnalyze: (section: SectionId) => void;
  deepResult?: DeepResult;
  onApplyDeep?: (improved: unknown) => void;
  onDiscardDeep?: () => void;
}

const priorityConfig = {
  high: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  medium: { icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
  low: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
};

const PROGRESS_STEPS = ['Analyzing…', 'Optimizing…', 'Finalizing…'];

export const ATSInlineSuggestions = memo(function ATSInlineSuggestions({
  section,
  suggestions,
  isAnalyzing,
  onDeepAnalyze,
  deepResult,
  onApplyDeep,
  onDiscardDeep,
}: ATSInlineSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const updateResume = useResumeStore(state => state.updateResume);
  const currentSkills = useResumeStore(state => state.currentResume?.skills || []);

  // Stepped progress indicator
  const [progressStep, setProgressStep] = useState(0);
  useEffect(() => {
    if (!isAnalyzing) {
      setProgressStep(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressStep(prev => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleDismiss = useCallback((id: string) => {
    haptics.light();
    setDismissed(prev => new Set(prev).add(id));
  }, []);

  const handleApply = useCallback((suggestion: ATSSuggestion) => {
    haptics.medium();
    if (suggestion.autoFix && section === 'skills') {
      if (!currentSkills.includes(suggestion.autoFix)) {
        updateResume({ skills: [...currentSkills, suggestion.autoFix] });
        toast.success(`Added "${suggestion.autoFix}" to skills`);
      } else {
        toast.info('Skill already exists');
      }
      setDismissed(prev => new Set(prev).add(suggestion.id));
    }
  }, [section, currentSkills, updateResume]);

  const visible = suggestions.filter(s => !dismissed.has(s.id));
  const hasContent = visible.length > 0 || deepResult || isAnalyzing;
  if (!hasContent) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mt-3 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] active:scale-[0.98] touch-manipulation">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground flex-1 text-left">
            {suggestions.some(s => s.type === 'missing_keyword') ? 'ATS Tips' : 'Writing Tips'}
          </span>
          {visible.length > 0 && (
            <Badge variant="glass" className="text-[10px] px-1.5 py-0">
              {visible.length}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1.5">
            {/* Stepped progress while analyzing */}
            {isAnalyzing && (
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 bg-primary/5 border border-primary/10">
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                <span className="text-xs text-primary font-medium">
                  {PROGRESS_STEPS[progressStep]}
                </span>
              </div>
            )}

            {/* Keyword suggestions */}
            {visible.map(suggestion => {
              const config = priorityConfig[suggestion.priority];
              const PriorityIcon = config.icon;

              return (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-muted/30"
                >
                  <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0', config.bg)}>
                    <PriorityIcon className={cn('w-3 h-3', config.color)} />
                  </div>
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                    {suggestion.message}
                  </span>
                  {suggestion.autoFix && (
                    <button
                      onClick={() => handleApply(suggestion)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-1 min-h-[28px] active:scale-95 touch-manipulation"
                    >
                      <Check className="w-3 h-3" />
                      Apply
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation"
                    aria-label="Dismiss suggestion"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })}

            {/* Deep Analysis Results Panel */}
            {deepResult && deepResult.improved && !isAnalyzing && (
              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">AI Optimized Content Ready</span>
                </div>

                {deepResult.changes.length > 0 && (
                  <ul className="space-y-1 pl-1">
                    {deepResult.changes.map((change, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 text-xs min-h-[36px]"
                    onClick={() => {
                      haptics.success();
                      onApplyDeep?.(deepResult.improved);
                    }}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Apply Changes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    onClick={() => {
                      haptics.light();
                      onDiscardDeep?.();
                    }}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}

            {/* Deep Analyze CTA */}
            {!deepResult && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs mt-1"
                onClick={() => {
                  haptics.light();
                  onDeepAnalyze(section);
                }}
                disabled={isAnalyzing}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Deep Analyze
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
