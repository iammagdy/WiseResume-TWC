import { motion } from 'framer-motion';
import { History, RotateCcw, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TailorHistory } from '@/types/resume';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TailorHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: TailorHistory[];
  onRestore: (id: string) => void;
  onClear: () => void;
}

export function TailorHistorySheet({
  open,
  onOpenChange,
  history,
  onRestore,
  onClear,
}: TailorHistorySheetProps) {
  // Group history by date
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
  }, {} as Record<string, TailorHistory[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Tailor History
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(85vh-140px)] space-y-6 pb-20">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No tailor history yet</p>
              <p className="text-sm">Your tailored resumes will appear here</p>
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
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
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
                          className={cn(
                            'shrink-0',
                            entry.scoreBeforeAfter.after >= 85
                              ? 'bg-success/10 text-success border-success/30'
                              : entry.scoreBeforeAfter.after >= 70
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-muted'
                          )}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {entry.scoreBeforeAfter.after}%
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span>
                          {entry.scoreBeforeAfter.before}% → {entry.scoreBeforeAfter.after}%
                        </span>
                        <span>•</span>
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
                            onRestore(entry.id);
                            onOpenChange(false);
                          }}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="sticky bottom-0 pt-4 pb-safe border-t border-border bg-background">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
