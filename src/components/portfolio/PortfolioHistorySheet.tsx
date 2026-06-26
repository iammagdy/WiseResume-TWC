import { motion, AnimatePresence } from 'framer-motion';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { History, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolioHistory, type PortfolioHistoryRecord } from '@/hooks/usePortfolioHistory';
import { formatDistanceToNow } from 'date-fns';

interface PortfolioHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  onRestore: (data: Record<string, unknown>) => void;
  isRestoring: boolean;
}

export function PortfolioHistorySheet({ open, onOpenChange, userId, onRestore, isRestoring }: PortfolioHistorySheetProps) {
  const { history, loading } = usePortfolioHistory(userId);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background backdrop-blur-sm pointer-events-auto"
          onClick={() => onOpenChange(false)}
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl overflow-hidden pointer-events-auto sm:max-h-[85vh] max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold">Revision History</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full w-8 h-8" aria-label="Close history">
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center text-muted-foreground">
                <MiniSpinner size={24} className="mb-2" />
                <p className="text-sm">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No History Yet</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  Your portfolio revisions will appear here each time you save changes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a previous version of your portfolio to restore its exact state.
                </p>
                {history.map((record: PortfolioHistoryRecord, idx: number) => {
                  const isLatest = idx === 0;
                  const dateStr = new Date(record.created_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  });
                  const timeAgo = formatDistanceToNow(new Date(record.created_at), { addSuffix: true });

                  return (
                    <div
                      key={record.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isLatest ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{dateStr}</p>
                          {isLatest && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {timeAgo}
                        </p>
                      </div>

                      <Button
                        variant={isLatest ? "outline" : "default"}
                        size="sm"
                        onClick={() => {
                          if (!isRestoring) {
                            onRestore(record.portfolio_data);
                          }
                        }}
                        disabled={isRestoring || isLatest}
                        className="text-xs h-8 px-3 shrink-0"
                      >
                        {isRestoring ? <MiniSpinner size={12} className="mr-1.5" /> : (
                          isLatest ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <History className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isLatest ? 'Current' : 'Restore'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
