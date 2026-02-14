import { Trophy, Clock, TrendingUp, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInterviewHistory } from '@/hooks/useInterviewHistory';
import { cn } from '@/lib/utils';

interface InterviewStatsCardProps {
  onViewHistory: () => void;
}

export function InterviewStatsCard({ onViewHistory }: InterviewStatsCardProps) {
  const { data: sessions } = useInterviewHistory();

  if (!sessions || sessions.length === 0) return null;

  const scoredSessions = sessions.filter(s => s.overall_score != null);
  const avgScore = scoredSessions.length > 0
    ? Math.round((scoredSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scoredSessions.length) * 10) / 10
    : null;
  const bestScore = scoredSessions.length > 0
    ? Math.max(...scoredSessions.map(s => s.overall_score || 0))
    : null;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalMins = Math.floor(totalDuration / 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 glass-elevated rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Your Performance
        </h3>
        <button
          onClick={onViewHistory}
          className="text-xs text-primary font-medium flex items-center gap-1 touch-manipulation min-h-[44px] px-2"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{sessions.length}</div>
          <div className="text-[10px] text-muted-foreground">Sessions</div>
        </div>
        <div className="text-center">
          <div className={cn(
            'text-lg font-bold',
            avgScore && avgScore >= 7 ? 'text-green-500' : avgScore && avgScore >= 5 ? 'text-yellow-500' : 'text-foreground'
          )}>
            {avgScore !== null ? `${avgScore}/10` : '—'}
          </div>
          <div className="text-[10px] text-muted-foreground">Avg Score</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
            <Trophy className="w-4 h-4" />
            {bestScore !== null ? bestScore : '—'}
          </div>
          <div className="text-[10px] text-muted-foreground">Best</div>
        </div>
      </div>

      {totalMins > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{totalMins} min total practice</span>
        </div>
      )}
    </motion.div>
  );
}
