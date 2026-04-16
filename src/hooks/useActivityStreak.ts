import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { format, subDays, startOfDay, startOfWeek } from 'date-fns';

export interface ActivityStreakData {
  streak: number;
  last7: { day: string; active: boolean; label: string }[];
  thisWeekApplications: number;
  personalBest: number;
}

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

export function useActivityStreak() {
  const { user } = useAuth();

  return useQuery<ActivityStreakData>({
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
      const addDates = (
        rows: { created_at?: string | null; applied_at?: string | null }[] | null,
        field: 'created_at' | 'applied_at',
      ) => {
        (rows || []).forEach(r => {
          const d = r[field];
          if (d) activeDays.add(format(startOfDay(new Date(d)), 'yyyy-MM-dd'));
        });
      };
      addDates(resumes.data, 'created_at');
      addDates(tailors.data, 'created_at');
      (apps.data || []).forEach(r => {
        if (r.applied_at) activeDays.add(format(startOfDay(new Date(r.applied_at)), 'yyyy-MM-dd'));
      });
      addDates(covers.data, 'created_at');

      const today = startOfDay(new Date());
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const day = format(subDays(today, i), 'yyyy-MM-dd');
        if (activeDays.has(day)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return {
          day: format(d, 'yyyy-MM-dd'),
          active: activeDays.has(format(d, 'yyyy-MM-dd')),
          label: format(d, 'EEE').charAt(0),
        };
      });

      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const thisWeekApplications = (apps.data || []).filter(
        a => a.applied_at && new Date(a.applied_at) >= thisWeekStart,
      ).length;

      const personalBest = updatePersonalBest(streak);

      return { streak, last7, thisWeekApplications, personalBest };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
