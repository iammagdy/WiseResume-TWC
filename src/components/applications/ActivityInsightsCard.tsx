import { useMemo, useState, useEffect } from 'react';
import { differenceInDays, startOfWeek } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, TrendingUp, Target, Zap, Lightbulb } from 'lucide-react';
import { JobActivityStats } from '@/hooks/useJobActivityStats';
import { useActivityStreak } from '@/hooks/useActivityStreak';
import { JobApplication } from '@/hooks/useJobApplications';

interface Nudge {
  icon: React.ElementType;
  message: string;
  type: 'warning' | 'tip' | 'success' | 'info';
}

const typeStyles: Record<Nudge['type'], { card: string; icon: string }> = {
  warning: { card: 'bg-amber-500/8 border-amber-500/20', icon: 'text-amber-500' },
  tip:     { card: 'bg-primary/8 border-primary/20',     icon: 'text-primary' },
  success: { card: 'bg-success/8 border-success/20',     icon: 'text-success' },
  info:    { card: 'bg-muted/50 border-border',           icon: 'text-muted-foreground' },
};

interface Props {
  applications: JobApplication[];
  stats: JobActivityStats;
}

export function ActivityInsightsCard({ applications, stats }: Props) {
  const shouldReduceMotion = useReducedMotion();
  const { data: streakData } = useActivityStreak();
  const streak = streakData?.streak ?? 0;

  const [weeklyGoal, setWeeklyGoal] = useState<number>(() =>
    parseInt(localStorage.getItem('activity-weekly-goal') || '5', 10)
  );
  useEffect(() => {
    const handler = (e: Event) => {
      const goal = (e as CustomEvent<{ goal: number }>).detail?.goal;
      if (typeof goal === 'number') setWeeklyGoal(goal);
    };
    window.addEventListener('activity-weekly-goal-change', handler);
    return () => window.removeEventListener('activity-weekly-goal-change', handler);
  }, []);

  const nudges = useMemo<Nudge[]>(() => {
    if (stats.isLoading) return [];
    const now = new Date();
    const result: Nudge[] = [];

    // Rule 1: Stale applications (applied/screening, no movement in 14+ days)
    const staleApps = applications.filter(app => {
      if (app.status !== 'applied' && app.status !== 'screening') return false;
      const ref = app.updated_at || app.applied_at;
      return ref && differenceInDays(now, new Date(ref)) >= 14;
    });
    if (staleApps.length > 0) {
      result.push({
        icon: AlertCircle,
        message: `${staleApps.length} application${staleApps.length > 1 ? 's have' : ' has'} had no movement in 14+ days — consider sending a follow-up or refreshing your approach.`,
        type: 'warning',
      });
    }

    // Rule 2: Zero applications this week
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekApps = applications.filter(
      a => a.applied_at && new Date(a.applied_at) >= thisWeekStart
    );
    if (thisWeekApps.length === 0 && applications.length > 0) {
      result.push({
        icon: Target,
        message: "You haven't applied to anything this week — even one application keeps the momentum going.",
        type: 'tip',
      });
    }

    // Rule 3: Response rate commentary
    if (stats.responseRate > 0) {
      if (stats.responseRate < 20) {
        result.push({
          icon: TrendingUp,
          message: `Your response rate is ${stats.responseRate}% — keep applying and tailor each resume to push it higher.`,
          type: 'info',
        });
      } else if (stats.responseRate >= 30) {
        result.push({
          icon: Zap,
          message: `Strong ${stats.responseRate}% response rate! Your applications are landing well — keep the quality up.`,
          type: 'success',
        });
      }
    }

    // Rule 4: Streak encouragement — uses broader activity streak (same source as streak card)
    if (streak > 0) {
      result.push({
        icon: Zap,
        message: streak === 1
          ? `You were active yesterday — keep the streak alive today!`
          : `${streak}-day activity streak — great consistency, keep it going!`,
        type: 'success',
      });
    }

    // Rule 5: Close to weekly goal nudge
    const remaining = weeklyGoal - thisWeekApps.length;
    if (thisWeekApps.length > 0 && remaining > 0 && remaining <= 2) {
      result.push({
        icon: Target,
        message: `You're ${remaining} application${remaining > 1 ? 's' : ''} away from your weekly goal of ${weeklyGoal} — you're almost there!`,
        type: 'success',
      });
    }

    // Fallback: zero-history motivational nudge
    if (result.length === 0) {
      result.push({
        icon: Lightbulb,
        message: 'Start logging your job applications to unlock personalised insights and track your progress over time.',
        type: 'info',
      });
    }

    return result.slice(0, 3);
  }, [applications, stats, streak, weeklyGoal]);

  if (nudges.length === 0 || stats.isLoading) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-card border border-border shadow-soft rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm font-semibold">AI Insights</p>
      </div>
      <div className="space-y-2">
        {nudges.map((nudge, i) => {
          const styles = typeStyles[nudge.type];
          const Icon = nudge.icon;
          return (
            <motion.div
              key={i}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className={`flex items-start gap-2.5 rounded-xl border p-3 ${styles.card}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${styles.icon}`} />
              <p className="text-xs leading-relaxed text-foreground/85">{nudge.message}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
