import { useState, memo, useEffect } from 'react';
import { TextareaFormField } from '@/components/ui/form-field';
import { useResumeStore } from '@/store/resumeStore';
import { FileText, Sparkles, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { ActionType } from '@/hooks/useAIEnhance';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { SectionEmptyState } from './SectionEmptyState';
import { summaryExample } from '@/lib/emptyStateExamples';
import { useSummaryAIBridge } from '@/store/summaryAIBridge';

export const SummarySection = memo(function SummarySection() {
  const summary = useResumeStore(state => state.currentResume?.summary);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const pendingSummaryGeneration = useResumeStore(state => state.pendingSummaryGeneration);
  const setPendingSummaryGeneration = useResumeStore(state => state.setPendingSummaryGeneration);
  const [touched, setTouched] = useState(false);
  const [started, setStarted] = useState(false);

  // Single source of truth for the Summary AI flow — registered by
  // `SectionAIAction` (the only owner of the AIEnhanceDialog for
  // summary). All summary AI entry points in this component delegate
  // through it so the user gets one preview dialog and one in-flight
  // request, no matter which trigger they used.
  const triggerSummaryAI = useSummaryAIBridge(state => state.trigger);

  const requestSummaryAI = (action: ActionType) => {
    if (triggerSummaryAI) {
      triggerSummaryAI(action);
    }
    // If the bridge isn't registered yet (extremely unlikely — it
    // mounts in the same SectionCard), the click is a no-op rather
    // than spawning a competing dialog.
  };

  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
  });

  // Auto-trigger AI summary generation when flagged by guided intake.
  // Routed through the bridge so the dialog/result is owned by the
  // single SectionAIAction instance.
  useEffect(() => {
    if (!pendingSummaryGeneration || !currentResume) return;
    const isEmpty = !currentResume.summary || currentResume.summary.trim() === '';
    if (!isEmpty) {
      setPendingSummaryGeneration(false);
      return;
    }
    const timer = setTimeout(() => {
      setPendingSummaryGeneration(false);
      setStarted(true);
      requestSummaryAI('generate');
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSummaryGeneration, currentResume?.id]);

  if (!currentResume || summary === undefined) return null;

  const isEmpty = !summary || summary.trim() === '';

  if (isEmpty && !started) {
    return (
      <SectionEmptyState
        icon={FileText}
        title="Write your professional summary"
        exampleContent={
          <p className="text-sm text-muted-foreground italic">"{summaryExample}"</p>
        }
        actions={[
          { label: 'Start Writing', variant: 'outline', onClick: () => setStarted(true) },
          { label: 'Let AI Write This', variant: 'default', icon: Sparkles, onClick: () => { setStarted(true); requestSummaryAI('generate'); } },
        ]}
      />
    );
  }

  const nudge = getNudgeForSection('summary');

  const getSummaryError = (): string | undefined => {
    if (!summary || summary.trim() === '') return 'Professional summary is required';
    if (summary.length < 50) return 'Summary should be at least 50 characters';
    return undefined;
  };

  const summaryError = getSummaryError();

  const handleNudgeAction = () => {
    if (nudge) {
      requestSummaryAI(nudge.action as ActionType);
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-5">
      <AIContextualNudge
        show={!!nudge}
        message={nudge?.message || ''}
        actionLabel={nudge?.actionLabel || ''}
        onAction={handleNudgeAction}
        onDismiss={() => nudge && dismissNudge(nudge.trigger)}
      />

      <TextareaFormField
        id="summary"
        label="Summary"
        icon={<FileText className="w-4 h-4" />}
        value={summary}
        onChange={(value) => updateResume({ summary: value })}
        onBlur={() => setTouched(true)}
        placeholder="Write a brief professional summary highlighting your key qualifications, experience, and career goals..."
        rows={8}
        maxLength={500}
        showCount
        error={summaryError}
        touched={touched}
        required
      />

      <Collapsible defaultOpen={!summary || summary.trim().length < 50}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-muted border border-border group">
          <h4 className="font-semibold text-sm">Tips for a great summary</h4>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 rounded-b-xl bg-muted border border-t-0 border-border">
          <ul className="text-sm text-muted-foreground space-y-2 pt-3">
            <li>• Start with your years of experience and specialty</li>
            <li>• Include 2-3 key achievements with metrics</li>
            <li>• Mention skills relevant to your target role</li>
            <li>• Keep it concise (3-4 sentences)</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
