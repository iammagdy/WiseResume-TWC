import { History, Trash2, Calendar, Copy, Eye, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoverLetterHistory } from '@/types/resume';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CoverLetterHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: CoverLetterHistory[];
  onView: (entry: CoverLetterHistory) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const toneColors: Record<string, string> = {
  professional: 'bg-primary/10 text-primary border-primary/30',
  enthusiastic: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  conversational: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function CoverLetterHistorySheet({
  open,
  onOpenChange,
  history,
  onView,
  onDelete,
  onClear,
}: CoverLetterHistorySheetProps) {
  const groupedHistory = history.reduce((acc, entry) => {
    const date = new Date(entry.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, CoverLetterHistory[]>);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Cover Letter History
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-20">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No cover letters yet</p>
              <p className="text-sm">Your generated cover letters will appear here</p>
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date}>
                <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {date}
                </h4>
                <div className="space-y-3">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h5 className="font-semibold text-sm truncate">
                            {entry.jobTitle}
                          </h5>
                          <p className="text-xs text-muted-foreground truncate">
                            @ {entry.company}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={toneColors[entry.tone] || 'bg-muted'}
                        >
                          {entry.tone}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {entry.coverLetter.slice(0, 120)}...
                      </p>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <span>
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            onView(entry);
                            onOpenChange(false);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(entry.coverLetter)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="sticky bottom-0 pt-4 pb-safe border-t border-border bg-background">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All History
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
