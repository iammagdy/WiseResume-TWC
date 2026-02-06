import { motion } from 'framer-motion';
import { Award, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterviewSummaryProps {
  summary: string;
  duration: number;
  onRestart: () => void;
  onGoHome: () => void;
}

export function InterviewSummary({ summary, duration, onRestart, onGoHome }: InterviewSummaryProps) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  // Try to extract score from summary
  const scoreMatch = summary.match(/Score:\s*(\d+)\/10/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 px-4 py-6 max-w-lg mx-auto"
    >
      <div className="text-center space-y-3">
        {/* Glowing score orb */}
        <div className="relative w-24 h-24 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            {score !== null ? (
              <span className="text-2xl font-bold text-primary">{score}/10</span>
            ) : (
              <Award className="w-10 h-10 text-primary" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">Wise AI Summary</h2>
        <p className="text-sm text-muted-foreground">
          Duration: {mins}m {secs.toString().padStart(2, '0')}s
        </p>
      </div>

      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-2 shadow-[0_0_20px_hsl(var(--primary)/0.05)]">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{summary}</p>
      </div>

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

      {/* Powered by footer */}
      <div className="flex items-center justify-center gap-1.5 pt-2">
        <Sparkles className="w-3 h-3 text-primary/60" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Powered by Wise AI
        </span>
      </div>
    </motion.div>
  );
}
