import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { FileText, Wand2, Target, Minimize2 } from 'lucide-react';
import { AIActionBar, AIAction } from './ai/AIActionBar';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';

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

  if (!currentResume) return null;

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

  const primaryActions: AIAction[] = [
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'improve', label: 'Improve', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-3 h-3" /> },
  ];

  const moreActions: AIAction[] = [
    { id: 'shorten', label: 'Make Shorter', icon: <Minimize2 className="w-3 h-3" /> },
    { id: 'expand', label: 'Expand', icon: <Wand2 className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg mb-4">Professional Summary</h3>
      
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
        <p className="text-xs text-muted-foreground mt-2">
          {currentResume.summary.length}/500 characters recommended
        </p>
      </div>

      {/* AI Action Bar */}
      <AIActionBar
        primaryActions={primaryActions}
        moreActions={moreActions}
        onAction={handleAction}
        isLoading={isEnhancing}
        loadingAction={currentAction}
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
        <h4 className="font-semibold text-sm mb-2">Tips for a great summary</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Start with your years of experience and specialty</li>
          <li>• Include 2-3 key achievements with metrics</li>
          <li>• Mention skills relevant to your target role</li>
          <li>• Keep it concise (3-4 sentences)</li>
        </ul>
      </div>
    </div>
  );
}
