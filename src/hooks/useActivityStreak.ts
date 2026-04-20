import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from './useAuth';
import { format, subDays, startOfDay, startOfWeek } from 'date-fns';

export interface ActivityStreakData {
  streak: number;
  last7: { day: string; active: boolean; label: string }[];
  thisWeekApplications: number;
  personalBest: number;
}

function streakBestKey(userId: string) {
  return `activity-streak-best-${userId}`;
}

function getPersonalBest(userId: string): number {
  return parseInt(localStorage.getItem(streakBestKey(userId)) || '0', 10);
}

function updatePersonalBest(userId: string, streak: number): number {
  const current = getPersonalBest(userId);
  if (streak > current) {
    localStorage.setItem(streakBestKey(userId), String(streak));
    return streak;
  }
  return current;
}

export function weeklyGoalKey(userId: string) {
  return `activity-weekly-goal-${userId}`;
}

interface ActivityRowsResponse {
  resumes: { created_at: string }[];
  jobApplications: { applied_at: string | null; status?: string }[];
  coverLetters: { created_at: string }[];
  tailorHistory: { created_at: string }[];
}

export function useActivityStreak() {
  const { user } = useAuth();

  return useQuery<ActivityStreakData>({
    queryKey: ['activity-streak', user?.id],
    queryFn: async () => {
      const since = subDays(new Date(), 365).toISOString();
      const data = await apiFetch<ActivityRowsResponse>('/api/data/activity-rows', {
        query: { since },
      });

      const activeDays = new Set<string>();
      const addDates = (
        rows: { created_at?: string | null }[] | null | undefined,
      ) => {
        (rows || []).forEach(r => {
          if (r.created_at) activeDays.add(format(startOfDay(new Date(r.created_at)), 'yyyy-MM-dd'));
        });
      };
      addDates(data.resumes);
      addDates(data.tailorHistory);
      addDates(data.coverLetters);
      (data.jobApplications || []).forEach(r => {
        if (r.applied_at) activeDays.add(format(startOfDay(new Date(r.applied_at)), 'yyyy-MM-dd'));
      });

      const today = startOfDay(new Date());
      let streak = 0;
      for (let i = 0; i < 365; i++) {
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
      const thisWeekApplications = (data.jobApplications || []).filter(
        a => a.applied_at && new Date(a.applied_at) >= thisWeekStart,
      ).length;

      const personalBest = updatePersonalBest(user!.id, streak);

      return { streak, last7, thisWeekApplications, personalBest };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
