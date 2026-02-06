import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnswerScore } from '@/hooks/useVoiceInterview';

interface AnswerScoreSheetProps {
  score: AnswerScore | null;
  onDismiss: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;
  const color = score >= 8 ? 'hsl(142 70% 50%)' : score >= 6 ? 'hsl(45 90% 55%)' : score >= 4 ? 'hsl(30 90% 55%)' : 'hsl(0 70% 55%)';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--border) / 0.3)" strokeWidth="4" />
        <motion.circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-foreground">{score}<span className="text-sm text-muted-foreground">/10</span></span>
    </div>
  );
}

export function AnswerScoreSheet({ score, onDismiss }: AnswerScoreSheetProps) {
  const [showImproved, setShowImproved] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (score) {
      setShowImproved(false);
      // Auto-dismiss after 8 seconds
      autoDismissRef.current = setTimeout(onDismiss, 8000);
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      };
    }
  }, [score, onDismiss]);

  const cancelAutoDismiss = () => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      {score && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
          onClick={cancelAutoDismiss}
        >
          <div className="max-w-lg mx-auto rounded-t-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-[0_-10px_40px_hsl(var(--primary)/0.1)] p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Answer #{score.questionIndex}</span>
              </div>
              <button onClick={onDismiss} className="p-1 touch-manipulation">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Score + Tip */}
            <div className="flex items-center gap-4">
              <ScoreRing score={score.score} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">Tip</span>
                </div>
                <p className="text-sm text-foreground leading-snug">{score.tip}</p>
              </div>
            </div>

            {/* Improved Answer Collapsible */}
            {score.improvedAnswer && (
              <div>
                <button
                  onClick={() => setShowImproved(!showImproved)}
                  className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-primary touch-manipulation py-1"
                >
                  {showImproved ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showImproved ? 'Hide' : 'Show'} stronger answer
                </button>
                <AnimatePresence>
                  {showImproved && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 mt-1 border border-border/30">
                        "{score.improvedAnswer}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Got it button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="w-full text-muted-foreground"
            >
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
