import { useState, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

interface AIQuestionsDialogProps {
  isOpen: boolean;
  /** Human-readable label shown in the subtitle, e.g. "Summary", "Marketing Lead at Acme", "Skills". */
  contextLabel: string;
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

/**
 * Built on the shared Radix `Dialog` primitive (was a hand-rolled fixed overlay)
 * so it gets a focus trap, Escape-to-close, restore-focus, `aria-modal`, and the
 * height-bounded/scrollable DialogContent for free. Each question's `<label>` is
 * associated with its `<Input>` via htmlFor/id for screen readers.
 */
export function AIQuestionsDialog({
  isOpen,
  contextLabel,
  questions,
  onSubmit,
  onClose,
  isLoading = false,
}: AIQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Reset answers each time the dialog opens so stale answers from a
  // previous session don't pre-populate the next set of questions.
  useEffect(() => {
    if (isOpen) setAnswers({});
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const filledCount = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85dvh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 p-4 pr-14 border-b border-border">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-lg">A couple of quick questions</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {contextLabel ? `"${contextLabel}"` : 'Your section'} — answer to get a better result
            </DialogDescription>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {questions.map((question, i) => (
            <div key={i}>
              <label htmlFor={`aiq-${i}`} className="text-sm font-medium text-foreground mb-1.5 block">
                {question}
              </label>
              <Input
                id={`aiq-${i}`}
                value={answers[String(i)] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [String(i)]: e.target.value }))}
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
            Skip &amp; Generate Anyway
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
                Submit &amp; Generate ({filledCount}/{questions.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
