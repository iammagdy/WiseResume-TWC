import { useState } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSaveInterviewAnswer } from '@/hooks/useInterviewAnswers';

const CATEGORIES = ['Behavioral', 'Technical', 'Situational', 'General'] as const;
type Category = typeof CATEGORIES[number];

interface SaveAnswerDialogProps {
  questionText: string;
  answerText: string;
  score?: number;
  sessionId?: string;
  roleContext?: string;
  onSaved?: () => void;
}

export function SaveAnswerDialog({
  questionText,
  answerText,
  score,
  sessionId,
  roleContext,
  onSaved,
}: SaveAnswerDialogProps) {
  const [category, setCategory] = useState<Category>('Behavioral');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const saveAnswer = useSaveInterviewAnswer();

  const handleSave = () => {
    saveAnswer.mutate({
      session_id: sessionId,
      question_text: questionText,
      answer_text: answerText,
      category,
      role_context: roleContext,
      score,
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        setSaved(true);
        onSaved?.();
      },
    });
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
        <Check className="w-4 h-4 text-green-500 shrink-0" />
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Saved to Answer Library</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <BookmarkPlus className="w-4 h-4 text-primary" />
        Save to Answer Library
      </p>

      {/* Category */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes about this answer..."
        className="min-h-[60px] text-sm resize-none"
      />

      <Button
        onClick={handleSave}
        disabled={saveAnswer.isPending}
        size="sm"
        className="w-full min-h-[40px]"
      >
        {saveAnswer.isPending ? 'Saving…' : 'Save Answer'}
      </Button>
    </div>
  );
}
