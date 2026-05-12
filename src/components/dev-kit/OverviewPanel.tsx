import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { RefreshCw, Users, FileText, Globe, ShieldCheck, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface OrphanSample {
  $id: string;
  user_id: string | null;
  email?: string | null;
  title?: string | null;
}

interface PurgePreview {
  dryRun: true;
  orphanedProfiles: number;
  orphanedResumes: number;
  sampleProfiles: OrphanSample[];
  sampleResumes: OrphanSample[];
}

interface PurgeResult {
  dryRun: false;
  deletedProfiles: number;
  deletedResumes: number;
}

type PurgePhase = 'idle' | 'previewing' | 'confirm' | 'purging' | 'done';

// ── Component ─────────────────────────────────────────────────────────────────

export const OverviewPanel = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [purgePhase, setPurgePhase] = useState<PurgePhase>('idle');
  const [purgePreview, setPurgePreview] = useState<PurgePreview | null>(null);
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const tuple = await appwriteFunctions.invoke<OverviewStatsData>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'overview-stats' },
        },
      );
      const result = unwrapAdminResponse<OverviewStatsData>(tuple, 'admin-devkit-data');
      setStats({
        totalAuthUsers:  result.totalAuthUsers  ?? 0,
        verifiedUsers:   result.verifiedUsers   ?? 0,
        totalResumes:    result.totalResumes    ?? 0,
        orphanedResumes: result.orphanedResumes ?? 0,
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

  const runPurge = useCallback(async (dryRun: boolean) => {
    setPurgePhase(dryRun ? 'previewing' : 'purging');
    setPurgeError(null);
    try {
      const tuple = await appwriteFunctions.invoke<{ data?: PurgePreview | PurgeResult }>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'purge-orphans', dryRun },
        },
      );
      const result = unwrapAdminResponse<{ data?: PurgePreview | PurgeResult }>(
        tuple,
        'admin-devkit-data',
      );
      const d = result.data;
      if (!d) throw new Error('No data returned from purge-orphans');
      if (dryRun) {
        setPurgePreview(d as PurgePreview);
        setPurgePhase('confirm');
      } else {
        setPurgeResult(d as PurgeResult);
        setPurgePhase('done');
        fetchStats();
      }
    } catch (err: unknown) {
      setPurgeError(formatEdgeError(err));
      setPurgePhase('idle');
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) return <DevKitErrorCard error={error} onRetry={fetchStats} />;

  const orphaned = stats?.orphanedResumes ?? 0;
  const resumeSub = orphaned > 0
    ? `${orphaned} orphaned (deleted users)`
    : 'Active users only';

  const totalOrphans = (purgePreview?.orphanedProfiles ?? 0) + (purgePreview?.orphanedResumes ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats grid */}
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

      {/* Orphan cleanup — warning prompt */}
      {orphaned > 0 && purgePhase === 'idle' && !purgeResult && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">
              {orphaned} orphaned resume{orphaned !== 1 ? 's' : ''} from deleted accounts detected
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => runPurge(true)}
          >
            Preview &amp; clean
          </Button>
        </div>
      )}

      {/* Orphan cleanup — scanning spinner */}
      {purgePhase === 'previewing' && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Scanning for orphaned documents…</span>
          </div>
        </div>
      )}

      {/* Orphan cleanup — confirm deletion */}
      {purgePhase === 'confirm' && purgePreview && (
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold text-white">Orphaned documents found</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              Resumes: <span className="text-destructive font-bold">{purgePreview.orphanedResumes}</span>
            </div>
            <div>
              Profiles: <span className="text-destructive font-bold">{purgePreview.orphanedProfiles}</span>
            </div>
          </div>

          {purgePreview.sampleResumes.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-xs text-white/40 font-medium mt-1">Resumes:</p>
              {purgePreview.sampleResumes.slice(0, 3).map(r => (
                <p key={r.$id} className="text-xs font-mono text-white/30">
                  …{r.$id.slice(-8)}{r.title ? ` "${r.title}"` : ''} (user: …{r.user_id?.slice(-8) ?? '?'})
                </p>
              ))}
              {purgePreview.orphanedResumes > 3 && (
                <p className="text-xs font-mono text-white/30">
                  …and {purgePreview.orphanedResumes - 3} more
                </p>
              )}
            </div>
          )}

          {purgePreview.sampleProfiles.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-xs text-white/40 font-medium">Profiles:</p>
              {purgePreview.sampleProfiles.slice(0, 3).map(p => (
                <p key={p.$id} className="text-xs font-mono text-white/30">
                  …{p.$id.slice(-8)}{p.email ? ` ${p.email}` : ''} (user: …{p.user_id?.slice(-8) ?? '?'})
                </p>
              ))}
              {purgePreview.orphanedProfiles > 3 && (
                <p className="text-xs font-mono text-white/30">
                  …and {purgePreview.orphanedProfiles - 3} more
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-destructive font-medium">
            This action is permanent and cannot be undone.
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runPurge(false)}
            >
              Delete {totalOrphans} document{totalOrphans !== 1 ? 's' : ''} permanently
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setPurgePhase('idle'); setPurgePreview(null); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Orphan cleanup — deleting spinner */}
      {purgePhase === 'purging' && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Deleting orphaned documents…</span>
          </div>
        </div>
      )}

      {/* Orphan cleanup — success */}
      {purgePhase === 'done' && purgeResult && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <Check size={14} />
            Deleted {purgeResult.deletedResumes} resume{purgeResult.deletedResumes !== 1 ? 's' : ''} and{' '}
            {purgeResult.deletedProfiles} profile{purgeResult.deletedProfiles !== 1 ? 's' : ''}. Stats refreshed.
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setPurgePhase('idle'); setPurgeResult(null); }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Orphan cleanup — error */}
      {purgeError && (
        <DevKitErrorCard
          error={purgeError}
          title="Orphan purge failed"
          onRetry={() => { setPurgeError(null); runPurge(true); }}
          compact
        />
      )}

      {/* System note */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
        <p className="text-xs text-blue-400 font-mono">
          [System Note]: Project is 100% Appwrite-Native. Supabase references have been decommissioned.
        </p>
      </div>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────

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
