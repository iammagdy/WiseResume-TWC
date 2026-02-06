import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, RotateCcw, Home, Sparkles, ChevronDown, ChevronUp, Lightbulb, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnswerScore } from '@/hooks/useVoiceInterview';

interface InterviewSummaryProps {
  summary: string;
  duration: number;
  scores: AnswerScore[];
  onRestart: () => void;
  onGoHome: () => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500/15 text-green-500 border-green-500/30'
    : score >= 6 ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
    : score >= 4 ? 'bg-orange-500/15 text-orange-500 border-orange-500/30'
    : 'bg-red-500/15 text-red-500 border-red-500/30';

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full border', color)}>
      {score}/10
    </span>
  );
}

export function InterviewSummary({ summary, duration, scores, onRestart, onGoHome }: InterviewSummaryProps) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const scoreMatch = summary.match(/Score:\s*(\d+)\/10/i);
  const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 px-4 py-6 max-w-lg mx-auto overflow-y-auto"
    >
      <div className="text-center space-y-3">
        <div className="relative w-24 h-24 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            {overallScore !== null ? (
              <span className="text-2xl font-bold text-primary">{overallScore}/10</span>
            ) : (
              <Award className="w-10 h-10 text-primary" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">Wise AI Summary</h2>
        <p className="text-sm text-muted-foreground">
          Duration: {mins}m {secs.toString().padStart(2, '0')}s
          {avgScore !== null && ` · Avg Score: ${avgScore}/10`}
        </p>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-2 shadow-[0_0_20px_hsl(var(--primary)/0.05)]">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{summary}</p>
      </div>

      {/* Per-answer score breakdown */}
      {scores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Answer Breakdown</h3>
          </div>
          <div className="space-y-1.5">
            {scores.map((s, i) => (
              <div
                key={i}
                className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2.5 touch-manipulation"
                >
                  <span className="text-sm text-foreground font-medium">Answer #{s.questionIndex}</span>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={s.score} />
                    {expandedIndex === i ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2">
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{s.tip}</p>
                        </div>
                        {s.improvedAnswer && (
                          <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
                            <p className="text-xs text-muted-foreground italic">"{s.improvedAnswer}"</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 backdrop-blur-sm" onClick={onRestart}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 shadow-[0_0_15px_hsl(var(--primary)/0.25)]"
          onClick={onGoHome}
        >
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2">
        <Sparkles className="w-3 h-3 text-primary/60" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Powered by Wise AI
        </span>
      </div>
    </motion.div>
  );
}
