import { useQuery } from '@tanstack/react-query';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Briefcase, Users, TrendingUp } from 'lucide-react';
import { DashboardStatsSkeleton } from './DashboardStatsSkeleton';

interface StatData {
  totalBriefs: number;
  openRoles: number;
  candidatesInPipeline: number;
  avgMatchScore: number | null;
}

function useWiseHireDashboardStats() {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['wisehire-dashboard-stats', userId],
    queryFn: async (): Promise<StatData> => {
      if (!userId) return { totalBriefs: 0, openRoles: 0, candidatesInPipeline: 0, avgMatchScore: null };

      const [briefsRes, rolesRes, candidatesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, [
          Query.equal('owner_id', userId),
          Query.select(['match_score']),
          Query.limit(5000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_roles, [
          Query.equal('owner_id', userId),
          Query.equal('is_deleted', false),
          Query.notEqual('status', 'archived'),
          Query.select(['$id']),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidates, [
          Query.equal('owner_id', userId),
          Query.equal('is_deleted', false),
          Query.select(['$id']),
          Query.limit(1),
        ]),
      ]);

      const scores = briefsRes.documents
        .map((b) => b.match_score as number | null)
        .filter((s): s is number => s !== null);
      const avgMatchScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      return {
        totalBriefs: briefsRes.total,
        openRoles: rolesRes.total,
        candidatesInPipeline: candidatesRes.total,
        avgMatchScore,
      };
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function StatCard({ label, value, description, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-0.5">
        {value}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
    </div>
  );
}

export function DashboardStats() {
  const { data, isLoading } = useWiseHireDashboardStats();

  if (isLoading) return <DashboardStatsSkeleton />;

  const stats = data ?? { totalBriefs: 0, openRoles: 0, candidatesInPipeline: 0, avgMatchScore: null };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Briefs Generated"
        value={stats.totalBriefs.toString()}
        description="AI candidate briefs"
        icon={Sparkles}
        iconColor="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-50 dark:bg-blue-900/30"
      />
      <StatCard
        label="Open Roles"
        value={stats.openRoles.toString()}
        description="Active job openings"
        icon={Briefcase}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
      />
      <StatCard
        label="In Pipeline"
        value={stats.candidatesInPipeline.toString()}
        description="Candidates being tracked"
        icon={Users}
        iconColor="text-violet-600 dark:text-violet-400"
        iconBg="bg-violet-50 dark:bg-violet-900/30"
      />
      <StatCard
        label="Avg Match Score"
        value={stats.avgMatchScore !== null ? `${stats.avgMatchScore}%` : '—'}
        description={stats.avgMatchScore !== null ? 'Across all briefs' : 'Generate briefs to see'}
        icon={TrendingUp}
        iconColor="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-50 dark:bg-amber-900/30"
      />
    </div>
  );
}
