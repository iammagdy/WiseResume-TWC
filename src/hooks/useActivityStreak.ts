import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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

export function useActivityStreak() {
  const { user } = useAuth();

  return useQuery<ActivityStreakData>({
    queryKey: ['activity-streak', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const since = subDays(new Date(), 365).toISOString();

      // Fetch all four collections in parallel
      const [resumesRes, jobAppsRes, coverLettersRes, tailorRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
          Query.equal('user_id', user.id),
          Query.greaterThanEqual('$createdAt', since),
          Query.select(['$createdAt']),
          Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.job_applications, [
          Query.equal('user_id', user.id),
          Query.select(['applied_at', 'status']),
          Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.cover_letters, [
          Query.equal('user_id', user.id),
          Query.greaterThanEqual('$createdAt', since),
          Query.select(['$createdAt']),
          Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.tailor_history, [
          Query.equal('user_id', user.id),
          Query.greaterThanEqual('$createdAt', since),
          Query.select(['$createdAt']),
          Query.limit(500),
        ]),
      ]);

      const activeDays = new Set<string>();

      const addCreatedAt = (docs: { $createdAt?: string }[]) => {
        docs.forEach(d => {
          if (d.$createdAt) {
            activeDays.add(format(startOfDay(new Date(d.$createdAt)), 'yyyy-MM-dd'));
          }
        });
      };

      addCreatedAt(resumesRes.documents as { $createdAt?: string }[]);
      addCreatedAt(coverLettersRes.documents as { $createdAt?: string }[]);
      addCreatedAt(tailorRes.documents as { $createdAt?: string }[]);

      const jobApps = jobAppsRes.documents as unknown as { applied_at?: string | null; status?: string | null; $createdAt?: string }[];
      jobApps.forEach(r => {
        const dateStr = r.applied_at ?? r.$createdAt;
        if (dateStr) activeDays.add(format(startOfDay(new Date(dateStr)), 'yyyy-MM-dd'));
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
      const thisWeekApplications = jobApps.filter(a => {
        const dateStr = a.applied_at ?? null;
        return dateStr && new Date(dateStr) >= thisWeekStart;
      }).length;

      const personalBest = updatePersonalBest(user.id, streak);

      return { streak, last7, thisWeekApplications, personalBest };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
