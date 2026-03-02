import { useState } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

interface ProjectAIQuestionsDialogProps {
  isOpen: boolean;
  projectName: string;
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ProjectAIQuestionsDialog({
  isOpen,
  projectName,
  questions,
  onSubmit,
  onClose,
  isLoading = false,
}: ProjectAIQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const filledCount = Object.values(answers).filter(v => v.trim()).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Tell me about your project</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {projectName ? `"${projectName}"` : 'Your project'} — answer to get a better result
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="min-w-[44px] min-h-[44px]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Questions */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {questions.map((question, i) => (
            <div key={i}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {question}
              </label>
              <Input
                value={answers[String(i)] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [String(i)]: e.target.value }))}
                placeholder="Type your answer..."
                className="h-12"
              />
            </div>
          ))}
          <div className="pt-1">
            <AIProviderVia className="text-xs" />
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-3 p-4 pb-safe border-t border-border">
          <Button variant="outline" size="lg" className="flex-1 h-12" onClick={onClose}>
            Skip & Generate Anyway
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12 gradient-primary"
            onClick={handleSubmit}
            disabled={isLoading || filledCount === 0}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">Generating...</span>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit & Generate ({filledCount}/{questions.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
