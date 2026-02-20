import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { Flame } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { format, subDays, startOfDay } from 'date-fns';

export const ActivityStreak = memo(function ActivityStreak() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

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

      return { streak, last7 };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const { streak, last7 } = data;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-elevated rounded-2xl p-4 border border-border/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${streak > 0 ? 'bg-warning/15' : 'bg-muted/50'}`}>
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
      </div>

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
                  : 'bg-muted/40 border border-border/30'
              }`}
            />
            <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});
