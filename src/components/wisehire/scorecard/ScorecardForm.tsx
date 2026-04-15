import { useState, useEffect } from 'react';
import { Star, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Scorecard } from '@/hooks/wisehire/useScorecards';

interface ScorecardFormProps {
  scorecard: Scorecard;
  onSave: (ratings: (number | null)[], notes: string[], submit: boolean) => void;
  isSaving: boolean;
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered !== null ? star <= hovered : star <= (value ?? 0);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            className={cn(
              'p-0.5 rounded transition-colors',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'
            )}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => !disabled && setHovered(null)}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ScorecardForm({ scorecard, onSave, isSaving }: ScorecardFormProps) {
  const [ratings, setRatings] = useState<(number | null)[]>(
    scorecard.ratings?.length ? scorecard.ratings : new Array(scorecard.questions.length).fill(null)
  );
  const [notes, setNotes] = useState<string[]>(
    scorecard.notes?.length ? scorecard.notes : new Array(scorecard.questions.length).fill('')
  );

  useEffect(() => {
    setRatings(
      scorecard.ratings?.length ? scorecard.ratings : new Array(scorecard.questions.length).fill(null)
    );
    setNotes(
      scorecard.notes?.length ? scorecard.notes : new Array(scorecard.questions.length).fill('')
    );
  }, [scorecard.id]);

  const isSubmitted = Boolean(scorecard.submitted_at);
  const filledCount = ratings.filter((r) => r !== null && r > 0).length;
  const avgScore = filledCount
    ? Math.round((ratings.reduce((a, b) => a + (b ?? 0), 0) / filledCount) * 10) / 10
    : null;

  const setRating = (i: number, v: number) =>
    setRatings((prev) => { const n = [...prev]; n[i] = v; return n; });

  const setNote = (i: number, v: string) =>
    setNotes((prev) => { const n = [...prev]; n[i] = v; return n; });

  return (
    <div className="space-y-4">
      {avgScore !== null && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Current average score:
          </span>
          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {avgScore} / 5
          </span>
          <span className="text-xs text-muted-foreground">
            ({filledCount}/{scorecard.questions.length} questions rated)
          </span>
        </div>
      )}

      <div className="space-y-4">
        {scorecard.questions.map((q, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 space-y-3 transition-shadow hover:shadow-sm"
          >
            <p className="text-sm font-medium leading-relaxed">
              <span className="text-muted-foreground mr-2 font-normal">Q{i + 1}.</span>
              {q}
            </p>

            <StarRating
              value={ratings[i]}
              onChange={(v) => setRating(i, v)}
              disabled={isSubmitted}
            />

            <Textarea
              placeholder="Add notes (optional)…"
              value={notes[i] ?? ''}
              onChange={(e) => setNote(i, e.target.value)}
              disabled={isSubmitted}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {!isSubmitted && (
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onSave(ratings, notes, false)}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => onSave(ratings, notes, true)}
            disabled={isSaving || filledCount === 0}
            className="gap-2 bg-blue-700 hover:bg-blue-800 text-white"
          >
            <Send className="h-4 w-4" />
            Submit Scorecard
          </Button>
        </div>
      )}

      {isSubmitted && (
        <p className="text-sm text-muted-foreground italic">
          This scorecard was submitted on{' '}
          {new Date(scorecard.submitted_at!).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}.
        </p>
      )}
    </div>
  );
}
