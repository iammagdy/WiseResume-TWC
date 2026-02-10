import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { AnswerScore } from '@/hooks/useVoiceInterview';

interface AnswerScoreSheetProps {
  score: AnswerScore | null;
  onDismiss: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;
  const color = score >= 8 ? 'hsl(142 70% 50%)' : score >= 6 ? 'hsl(45 90% 55%)' : score >= 4 ? 'hsl(30 90% 55%)' : 'hsl(0 70% 55%)';
  const glowColor = score >= 8 ? 'hsl(142 70% 50% / 0.4)' : score >= 6 ? 'hsl(45 90% 55% / 0.4)' : score >= 4 ? 'hsl(30 90% 55% / 0.4)' : 'hsl(0 70% 55% / 0.4)';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border) / 0.3)" strokeWidth="5" />
        <motion.circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <motion.span 
        className="absolute text-2xl font-black text-foreground"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
      >
        {score}<span className="text-sm font-bold text-muted-foreground">/10</span>
      </motion.span>
    </div>
  );
}

export function AnswerScoreSheet({ score, onDismiss }: AnswerScoreSheetProps) {
  const [showImproved, setShowImproved] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (score) {
      setShowImproved(false);
      
      // Haptic feedback based on score
      if (score.score >= 8) {
        haptics.success();
      } else if (score.score >= 5) {
        haptics.medium();
      } else {
        haptics.light();
      }
      
      // Auto-dismiss after 10 seconds
      autoDismissRef.current = setTimeout(onDismiss, 10000);
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
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
          onClick={cancelAutoDismiss}
        >
          <div className="max-w-lg mx-auto rounded-t-3xl bg-card/95 backdrop-blur-2xl border border-border/40 shadow-[0_-10px_50px_hsl(var(--primary)/0.15)] p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <motion.div
                  className="p-1.5 rounded-full bg-primary/15"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-sm font-bold text-foreground">Answer #{score.questionIndex}</span>
              </div>
              <button onClick={onDismiss} className="p-1.5 touch-manipulation rounded-full hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Score + Tip */}
            <div className="flex items-center gap-5">
              <ScoreRing score={score.score} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Pro Tip</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{score.tip}</p>
              </div>
            </div>

            {/* Improved Answer Collapsible */}
            {score.improvedAnswer && (
              <div>
                <button
                  onClick={() => setShowImproved(!showImproved)}
                  className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-primary touch-manipulation py-2 hover:opacity-80 transition-opacity"
                >
                  {showImproved ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showImproved ? 'Hide' : 'View'} stronger answer
                </button>
                <AnimatePresence>
                  {showImproved && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-xl p-4 mt-2 border border-border/30">
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
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}