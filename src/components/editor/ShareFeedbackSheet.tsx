import { useState } from 'react';
import { MessageSquare, Check, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useShareComments, useResolveComment, type ShareComment } from '@/hooks/useShareComments';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ShareFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareId: string;
}

type FilterType = 'all' | 'unresolved' | 'resolved';

export function ShareFeedbackSheet({ open, onOpenChange, shareId }: ShareFeedbackSheetProps) {
  const { data: comments = [], isLoading } = useShareComments(shareId);
  const resolveComment = useResolveComment();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = comments.filter((c) => {
    if (filter === 'unresolved') return !c.is_resolved;
    if (filter === 'resolved') return c.is_resolved;
    return true;
  });

  const unresolvedCount = comments.filter((c) => !c.is_resolved).length;

  const handleResolve = (comment: ShareComment) => {
    haptics.light();
    resolveComment.mutate({ commentId: comment.id, resolved: !comment.is_resolved });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[85dvh] flex flex-col">
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">{unresolvedCount}</Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">View and manage feedback on your shared resume</SheetDescription>
        </SheetHeader>

        {/* Filter chips */}
        <div className="flex gap-2 mb-3">
          {(['all', 'unresolved', 'resolved'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); haptics.light(); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] touch-manipulation active:scale-95 transition-all capitalize',
                filter === f ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto overscroll-contain space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No feedback yet</p>
            </div>
          ) : (
            filtered.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  'p-3 rounded-xl glass-surface',
                  comment.is_resolved && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.author_name}</span>
                      {comment.section && (
                        <Badge variant="outline" className="text-[10px]">{comment.section}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolve(comment)}
                    className={cn(
                      'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full touch-manipulation active:scale-90 transition-all',
                      comment.is_resolved ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-label={comment.is_resolved ? 'Unresolve' : 'Resolve'}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
