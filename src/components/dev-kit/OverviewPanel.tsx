import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { RefreshCw, Users, FileText, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';

interface OverviewStatsData {
  totalAuthUsers: number;
  verifiedUsers: number;
  totalResumes: number;
  orphanedResumes: number;
}

interface OverviewStats {
  totalAuthUsers: number;
  verifiedUsers: number;
  totalResumes: number;
  orphanedResumes: number;
  region: string;
  latency: number;
  lastUpdate: Date;
}

export const OverviewPanel = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const tuple = await appwriteFunctions.invoke<{ data?: OverviewStatsData }>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'overview-stats' },
        },
      );
      const result = unwrapAdminResponse<{ data?: OverviewStatsData }>(tuple, 'admin-devkit-data');
      const d = result.data;
      if (!d) throw new Error('No data returned from overview-stats');
      setStats({
        totalAuthUsers:  d.totalAuthUsers  ?? 0,
        verifiedUsers:   d.verifiedUsers   ?? 0,
        totalResumes:    d.totalResumes    ?? 0,
        orphanedResumes: d.orphanedResumes ?? 0,
        region:          'Appwrite Cloud (fra)',
        latency:         Date.now() - start,
        lastUpdate:      new Date(),
      });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) return <DevKitErrorCard error={error} onRetry={fetchStats} />;

  const orphaned = stats?.orphanedResumes ?? 0;
  const resumeSub = orphaned > 0
    ? `${orphaned} orphaned (deleted users)`
    : 'Active users only';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe size={20} className="text-blue-400" /> Appwrite Infrastructure Status
        </h2>
        <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
          {loading
            ? <RefreshCw className="animate-spin mr-2" size={14} />
            : <RefreshCw size={14} className="mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Auth Users"
          value={stats?.totalAuthUsers ?? 0}
          sub={`Verified: ${stats?.verifiedUsers ?? 0}`}
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Total Resumes"
          value={stats?.totalResumes ?? 0}
          sub={resumeSub}
        />
        <StatCard
          icon={<ShieldCheck size={20} />}
          label="Region"
          value={stats?.region ?? '---'}
          sub={`Latency: ${stats?.latency ?? '?'}ms`}
        />
      </div>

      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
        <p className="text-xs text-blue-400 font-mono">
          [System Note]: Project is 100% Appwrite-Native. Supabase references have been decommissioned.
        </p>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
      <div className="flex items-center gap-3 text-muted-foreground mb-3">
        {icon} <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
