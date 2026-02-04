import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { FileText } from 'lucide-react';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';

export function SummarySection() {
  const { currentResume, updateResume } = useResumeStore();
  const [showDialog, setShowDialog] = useState(false);
  
  const { enhance, isEnhancing, currentAction, result, apply, discard } = useAIEnhance({
    section: 'summary',
    onApply: (content) => {
      updateResume({ summary: content as string });
      setShowDialog(false);
    },
  });

  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
  });

  if (!currentResume) return null;

  const nudge = getNudgeForSection('summary');

  const handleAction = async (actionId: string) => {
    const enhanceResult = await enhance(
      actionId as ActionType,
      currentResume.summary,
      currentResume
    );
    
    if (enhanceResult) {
      setShowDialog(true);
    }
  };

  const handleNudgeAction = () => {
    if (nudge) {
      handleAction(nudge.action);
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Professional Summary</h3>
        <InlineAIButton
          section="summary"
          onAction={handleAction}
          isLoading={isEnhancing}
        />
      </div>

      {/* Contextual Nudge */}
      <AIContextualNudge
        show={!!nudge}
        message={nudge?.message || ''}
        actionLabel={nudge?.actionLabel || ''}
        onAction={handleNudgeAction}
        onDismiss={() => nudge && dismissNudge(nudge.trigger)}
      />
      
      <div>
        <Label htmlFor="summary" className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Summary
        </Label>
        <Textarea
          id="summary"
          value={currentResume.summary}
          onChange={(e) => updateResume({ summary: e.target.value })}
          placeholder="Write a brief professional summary highlighting your key qualifications, experience, and career goals..."
          className="min-h-[200px] resize-none"
        />
        <p className={`text-sm mt-2 ${
          currentResume.summary.length > 500 
            ? 'text-warning font-medium' 
            : 'text-muted-foreground'
        }`}>
          {currentResume.summary.length}/500 characters recommended
        </p>
      </div>

      {/* AI Enhancement Dialog */}
      <AIEnhanceDialog
        isOpen={showDialog}
        original={currentResume.summary}
        improved={result?.improved as string || ''}
        changes={result?.changes || []}
        suggestions={result?.suggestions}
        onApply={() => {
          apply();
          setShowDialog(false);
        }}
        onDiscard={() => {
          discard();
          setShowDialog(false);
        }}
        title="Enhanced Summary"
      />

      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h4 className="font-semibold text-sm mb-3">Tips for a great summary</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Start with your years of experience and specialty</li>
          <li>• Include 2-3 key achievements with metrics</li>
          <li>• Mention skills relevant to your target role</li>
          <li>• Keep it concise (3-4 sentences)</li>
        </ul>
      </div>
    </div>
  );
}
