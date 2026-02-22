import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw, Home, Sparkles, ChevronDown, ChevronUp, Lightbulb, TrendingUp, Share2, BookOpen, ArrowLeft, Download } from 'lucide-react';
import { InterviewResultsCardSheet } from './InterviewResultsCardSheet';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnswerScore } from '@/hooks/useVoiceInterview';

interface InterviewSummaryProps {
  summary: string;
  duration: number;
  scores: AnswerScore[];
  onRestart: () => void;
  onGoHome: () => void;
  onShowTips?: () => void;
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

function extractScore(summary: string): number | null {
  const patterns = [
    /Score:\s*(\d+)\s*\/\s*10/i,
    /(\d+)\s*\/\s*10/,
    /(\d+)\s*out\s*of\s*10/i,
    /overall[^:]*:\s*(\d+)/i,
  ];
  for (const p of patterns) {
    const m = summary.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 10) return n;
    }
  }
  return null;
}

export function InterviewSummary({ summary, duration, scores, onRestart, onGoHome, onShowTips }: InterviewSummaryProps) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const reducedMotion = useReducedMotion();

  const overallScore = useMemo(() => {
    const parsed = extractScore(summary);
    if (parsed !== null) return parsed;
    if (scores.length > 0) return Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
    return null;
  }, [summary, scores]);

  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
    : null;

  const scoreColor = overallScore !== null
    ? overallScore >= 8 ? 'text-green-400 border-green-500/60'
      : overallScore >= 5 ? 'text-yellow-400 border-yellow-500/60'
      : 'text-red-400 border-red-500/60'
    : 'text-muted-foreground border-border';

  const handleSaveAsPdf = () => {
    import('sonner').then(({ toast }) => toast.info('Opening print dialog...'));
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-md border-b border-border/20 print:hidden"
      >
        <button
          onClick={onGoHome}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-base font-semibold text-foreground">Interview Summary</span>
        <motion.div
          initial={reducedMotion ? false : { scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {overallScore !== null ? (
            <ScoreBadge score={overallScore} />
          ) : (
            <span className="w-10" />
          )}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 px-4 py-6 max-w-lg mx-auto overflow-y-auto"
        id="interview-summary-content"
      >
        <div className="text-center space-y-3">
          <motion.div
            className={cn('w-20 h-20 mx-auto rounded-full border-2 flex flex-col items-center justify-center', scoreColor)}
            initial={reducedMotion ? false : { scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {overallScore !== null ? (
              <>
                <span className={cn('text-2xl font-bold', scoreColor.split(' ')[0])}>{overallScore}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
              </>
            ) : (
              <span className="text-xl text-muted-foreground">—</span>
            )}
          </motion.div>
          <h2 className="text-xl font-bold text-foreground">Wise AI Summary</h2>
          <p className="text-sm text-muted-foreground">
            Duration: {mins}m {secs.toString().padStart(2, '0')}s
            {avgScore !== null && ` · Avg Score: ${avgScore}/10`}
          </p>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-[0_0_20px_hsl(var(--primary)/0.05)]">
          <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-primary [&_h1]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary [&_h3]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-primary [&_h4]:mb-1 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:text-sm [&_li]:text-foreground/80 [&_li]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
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

        {/* 2x2 action button grid */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="backdrop-blur-sm min-h-[44px]" onClick={onRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-primary/80 shadow-[0_0_15px_hsl(var(--primary)/0.25)] min-h-[44px]"
            onClick={onGoHome}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            variant="outline"
            className="backdrop-blur-sm min-h-[44px]"
            onClick={() => setShowShareCard(true)}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Results
          </Button>
          <Button
            variant="outline"
            className="backdrop-blur-sm min-h-[44px]"
            onClick={handleSaveAsPdf}
          >
            <Download className="w-4 h-4 mr-2" />
            Save as PDF
          </Button>
        </div>

        {/* Practice Tips as subtle text link */}
        {onShowTips && (
          <button
            onClick={onShowTips}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 min-h-[44px] touch-manipulation"
          >
            <BookOpen className="w-4 h-4" />
            View Interview Tips
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Sparkles className="w-3 h-3 text-primary/60" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Powered by Wise AI
          </span>
        </div>
      </motion.div>

      <InterviewResultsCardSheet
        open={showShareCard}
        onOpenChange={setShowShareCard}
        overallScore={overallScore}
        duration={duration}
        scores={scores}
      />
    </div>
  );
}
