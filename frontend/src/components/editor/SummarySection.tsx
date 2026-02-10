import { useState } from 'react';
 import { TextareaFormField } from '@/components/ui/form-field';
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
   const [touched, setTouched] = useState(false);
  
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
 
   // Validation
   const getSummaryError = (): string | undefined => {
     const summary = currentResume.summary;
     if (!summary || summary.trim() === '') return 'Professional summary is required';
     if (summary.length < 50) return 'Summary should be at least 50 characters';
     return undefined;
   };
 
   const summaryError = getSummaryError();

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
      
       <TextareaFormField
         id="summary"
         label="Summary"
         icon={<FileText className="w-4 h-4" />}
         value={currentResume.summary}
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
