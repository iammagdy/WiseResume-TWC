import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { BookOpen, Search, Trash2, Edit2, Check, X, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useInterviewAnswers,
  useUpdateInterviewAnswer,
  useDeleteInterviewAnswer,
  type InterviewAnswer,
} from '@/hooks/useInterviewAnswers';

const CATEGORIES = ['All', 'Behavioral', 'Technical', 'Situational', 'General'];

const CATEGORY_COLORS: Record<string, string> = {
  Behavioral: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  Technical: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  Situational: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  General: 'bg-muted text-muted-foreground border-border',
};

function AnswerCard({
  answer,
  onDelete,
  onUpdate,
}: {
  answer: InterviewAnswer;
  onDelete: () => void;
  onUpdate: (id: string, updates: { notes?: string; category?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(answer.notes || '');
  const [category, setCategory] = useState(answer.category);
  const [expanded, setExpanded] = useState(false);

  const handleSave = () => {
    onUpdate(answer.id, { notes, category });
    setEditing(false);
  };

  const categoryColor = CATEGORY_COLORS[answer.category] || CATEGORY_COLORS.General;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs shrink-0', categoryColor)}>
              {answer.category}
            </Badge>
            {answer.score != null && (
              <Badge variant="outline" className={cn(
                'text-xs shrink-0',
                answer.score >= 8 ? 'border-green-500/40 text-green-600'
                  : answer.score >= 5 ? 'border-yellow-500/40 text-yellow-600'
                  : 'border-red-500/40 text-red-500',
              )}>
                {answer.score}/10
              </Badge>
            )}
            {answer.role_context && (
              <span className="text-xs text-muted-foreground truncate">{answer.role_context}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(answer.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(!editing)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Question */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
        <p className="text-sm text-foreground leading-relaxed">{answer.question_text}</p>
      </div>

      {/* Answer */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Answer</p>
        <div className="relative">
          <p className={cn('text-sm text-foreground/80 leading-relaxed', !expanded && 'line-clamp-3')}>
            {answer.answer_text}
          </p>
          {answer.answer_text.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary mt-1 hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => c !== 'All').map((cat) => (
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
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this answer..."
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 min-h-[36px]" onClick={handleSave}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px]"
              onClick={() => { setEditing(false); setNotes(answer.notes || ''); setCategory(answer.category); }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          {notes && !editing && (
            <div className="bg-muted rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground italic">{notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Notes display */}
      {!editing && answer.notes && (
        <div className="bg-muted rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground">Note: {answer.notes}</p>
        </div>
      )}
    </div>
  );
}

interface AnswerLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnswerLibrarySheet({ open, onOpenChange }: AnswerLibrarySheetProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const { data: answers = [], isLoading } = useInterviewAnswers();
  const updateAnswer = useUpdateInterviewAnswer();
  const deleteAnswer = useDeleteInterviewAnswer();

  const filtered = useMemo(() => {
    return answers.filter((a) => {
      const matchesCategory = filterCategory === 'All' || a.category === filterCategory;
      const matchesSearch = !search.trim() || (
        a.question_text.toLowerCase().includes(search.toLowerCase()) ||
        a.answer_text.toLowerCase().includes(search.toLowerCase()) ||
        (a.role_context || '').toLowerCase().includes(search.toLowerCase())
      );
      return matchesCategory && matchesSearch;
    });
  }, [answers, filterCategory, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <SheetTitle>Answer Library</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Saved answers from your interview sessions. Edit notes or remove entries.
          </p>
        </SheetHeader>

        {/* Search + filter */}
        <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions or answers..."
              className="pl-9 min-h-[40px]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors shrink-0',
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted rounded-xl h-32 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {answers.length === 0 ? 'No saved answers yet' : 'No matches found'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {answers.length === 0
                    ? 'After completing an interview session, save standout answers to build your library.'
                    : 'Try a different search or filter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'answer' : 'answers'}</p>
              {filtered.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  onDelete={() => deleteAnswer.mutate(answer.id)}
                  onUpdate={(id, updates) => updateAnswer.mutate({ id, ...updates })}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
