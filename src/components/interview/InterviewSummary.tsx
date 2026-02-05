import { motion } from 'framer-motion';
import { Award, RotateCcw, Home } from 'lucide-react';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 px-4 py-6 max-w-lg mx-auto"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Interview Complete</h2>
        <p className="text-sm text-muted-foreground">
          Duration: {mins}m {secs.toString().padStart(2, '0')}s
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{summary}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onRestart}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button className="flex-1" onClick={onGoHome}>
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>
      </div>
    </motion.div>
  );
}
