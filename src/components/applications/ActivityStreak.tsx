import { memo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { Flame, Trophy, Minus, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { format, subDays, startOfDay, startOfWeek } from 'date-fns';

function getPersonalBest(): number {
  return parseInt(localStorage.getItem('activity-streak-best') || '0', 10);
}

function updatePersonalBest(streak: number): number {
  const current = getPersonalBest();
  if (streak > current) {
    localStorage.setItem('activity-streak-best', String(streak));
    return streak;
  }
  return current;
}

export const ActivityStreak = memo(function ActivityStreak() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [weeklyGoal, setWeeklyGoalState] = useState<number>(() =>
    parseInt(localStorage.getItem('activity-weekly-goal') || '5', 10)
  );

  const handleGoalChange = useCallback((delta: number) => {
    setWeeklyGoalState(prev => {
      const next = Math.max(1, Math.min(20, prev + delta));
      localStorage.setItem('activity-weekly-goal', String(next));
      return next;
    });
  }, []);

  const { data } = useQuery({
    queryKey: ['activity-streak', user?.id],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const [resumes, tailors, apps, covers] = await Promise.all([
        supabase.from('resumes').select('created_at').gte('created_at', since),
        supabase.from('tailor_history').select('created_at').gte('created_at', since),
        supabase.from('job_applications').select('applied_at').gte('applied_at', since),
        supabase.from('cover_letters').select('created_at').gte('created_at', since),
      ]);

      const activeDays = new Set<string>();
      const addDates = (rows: { created_at?: string | null; applied_at?: string | null }[] | null, field: 'created_at' | 'applied_at') => {
        (rows || []).forEach(r => {
          const d = r[field];
          if (d) activeDays.add(format(startOfDay(new Date(d)), 'yyyy-MM-dd'));
        });
      };
      addDates(resumes.data, 'created_at');
      addDates(tailors.data, 'created_at');
      addDates(apps.data as any, 'applied_at');
      addDates(covers.data, 'created_at');

      // Calculate streak
      let streak = 0;
      const today = startOfDay(new Date());
      for (let i = 0; i < 30; i++) {
        const day = format(subDays(today, i), 'yyyy-MM-dd');
        if (activeDays.has(day)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      // Last 7 days
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const day = format(subDays(today, 6 - i), 'yyyy-MM-dd');
        return { day, active: activeDays.has(day), label: format(subDays(today, 6 - i), 'EEE').charAt(0) };
      });

      // This week's applications
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const thisWeekApplications = (apps.data || []).filter(
        a => a.applied_at && new Date(a.applied_at) >= thisWeekStart
      ).length;

      const personalBest = updatePersonalBest(streak);

      return { streak, last7, thisWeekApplications, personalBest };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const { streak, last7, thisWeekApplications, personalBest } = data;
  const goalProgress = Math.min(thisWeekApplications / weeklyGoal, 1);
  const goalPercent = Math.round(goalProgress * 100);

  const milestones: { label: string; emoji: string; threshold: number }[] = [
    { label: '7-day streak', emoji: '🔥', threshold: 7 },
    { label: '30-day streak', emoji: '⚡', threshold: 30 },
  ];
  const earnedMilestones = milestones.filter(m => streak >= m.threshold);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-card border border-border shadow-soft rounded-2xl p-4 space-y-4"
    >
      {/* Streak row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${streak > 0 ? 'bg-warning/15' : 'bg-muted'}`}>
            <Flame className={`w-5 h-5 ${streak > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {streak > 0 ? `${streak} day streak` : 'Start your streak!'}
            </p>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? 'Keep the momentum going' : 'Be active today to begin'}
            </p>
          </div>
        </div>

        {/* Personal best */}
        {personalBest > 0 && (
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl px-2.5 py-1.5">
            <Trophy className="w-3.5 h-3.5 text-warning" />
            <span className="text-[11px] font-semibold">{personalBest}d best</span>
          </div>
        )}
      </div>

      {/* Milestone badges */}
      {earnedMilestones.length > 0 && (
        <div className="flex gap-2">
          {earnedMilestones.map(m => (
            <span
              key={m.threshold}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-warning/10 text-warning border border-warning/20 rounded-full px-2.5 py-1"
            >
              {m.emoji} {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Last 7 days grid */}
      <div className="flex items-center justify-between gap-1">
        {last7.map((d, i) => (
          <motion.div
            key={d.day}
            initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <div
              className={`w-8 h-8 rounded-lg transition-colors ${
                d.active
                  ? 'bg-primary shadow-sm'
                  : 'bg-muted border border-border'
              }`}
            />
            <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Weekly goal widget */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Weekly Goal</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleGoalChange(-1)}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors touch-manipulation"
              aria-label="Decrease goal"
              type="button"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-bold w-6 text-center tabular-nums">{weeklyGoal}</span>
            <button
              onClick={() => handleGoalChange(1)}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors touch-manipulation"
              aria-label="Increase goal"
              type="button"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={shouldReduceMotion ? false : { width: 0 }}
              animate={{ width: `${goalPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {thisWeekApplications}/{weeklyGoal}
          </span>
        </div>
        {thisWeekApplications >= weeklyGoal && (
          <p className="text-xs text-success font-medium">🎉 Weekly goal reached!</p>
        )}
      </div>
    </motion.div>
  );
});
