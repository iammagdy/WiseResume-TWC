import { Trophy, Clock, TrendingUp, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInterviewHistory } from '@/hooks/useInterviewHistory';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface InterviewStatsCardProps {
  onViewHistory: () => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-elevated rounded-lg px-3 py-2 text-xs shadow-lg border border-border/30">
      <p className="font-semibold text-foreground">Session {d.session}: {d.score}/10</p>
      <p className="text-muted-foreground">{d.date}</p>
    </div>
  );
};

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

  const chartData = scoredSessions.map((s, i) => ({
    session: i + 1,
    score: s.overall_score || 0,
    date: s.created_at ? format(new Date(s.created_at), 'MMM d') : '',
  }));

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

      {/* Sparkline chart */}
      {scoredSessions.length >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="w-full h-16 mt-3 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
                <Tooltip content={<CustomTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {scoredSessions.length === 1 && (
            <p className="text-muted-foreground text-xs text-center mt-1">
              Keep practicing to see your trend!
            </p>
          )}
        </motion.div>
      )}

      {totalMins > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{totalMins} min total practice</span>
        </div>
      )}
    </motion.div>
  );
}
