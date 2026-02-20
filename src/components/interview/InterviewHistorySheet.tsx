import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trophy, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useInterviewHistory, useDeleteInterviewSession } from '@/hooks/useInterviewHistory';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface InterviewHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewHistorySheet({ open, onOpenChange }: InterviewHistorySheetProps) {
  const { data: sessions, isLoading } = useInterviewHistory();
  const deleteSession = useDeleteInterviewSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] pb-safe overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Interview History</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No interview sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete a practice interview to see your history</p>
            </div>
          ) : (
            sessions.map(session => {
              const isExpanded = expandedId === session.id;
              const mins = session.duration_seconds ? Math.floor(session.duration_seconds / 60) : 0;
              const secs = session.duration_seconds ? session.duration_seconds % 60 : 0;

              return (
                <motion.div
                  key={session.id}
                  layout
                  className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => { haptics.light(); setExpandedId(isExpanded ? null : session.id); }}
                    className="w-full flex items-center justify-between p-3.5 touch-manipulation"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.job_title || (session.interview_type === 'general' ? 'General Practice' : 'Interview Practice')}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {session.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.created_at), 'MMM d')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {mins}m {secs.toString().padStart(2, '0')}s
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {session.overall_score != null && (
                        <span className={cn(
                          'text-sm font-bold px-2 py-0.5 rounded-full',
                          session.overall_score >= 8 ? 'bg-green-500/15 text-green-500'
                            : session.overall_score >= 6 ? 'bg-yellow-500/15 text-yellow-500'
                            : 'bg-red-500/15 text-red-500'
                        )}>
                          {session.overall_score}/10
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3.5 space-y-3">
                          {Array.isArray(session.strengths) && (session.strengths as string[]).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-green-500 mb-1">Strengths</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {(session.strengths as string[]).map((s, i) => (
                                  <li key={i} className="flex gap-1">
                                    <span>•</span>
                                    <span className="prose prose-xs dark:prose-invert max-w-none [&_p]:inline [&_strong]:text-foreground [&_strong]:font-semibold"><ReactMarkdown>{s}</ReactMarkdown></span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(session.improvements) && (session.improvements as string[]).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-yellow-500 mb-1">Areas to Improve</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {(session.improvements as string[]).map((s, i) => (
                                  <li key={i} className="flex gap-1">
                                    <span>•</span>
                                    <span className="prose prose-xs dark:prose-invert max-w-none [&_p]:inline [&_strong]:text-foreground [&_strong]:font-semibold"><ReactMarkdown>{s}</ReactMarkdown></span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive w-full"
                            onClick={() => {
                              haptics.warning();
                              deleteSession.mutate(session.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete Session
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
