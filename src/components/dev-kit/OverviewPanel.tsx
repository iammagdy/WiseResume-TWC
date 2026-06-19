import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { RefreshCw, Users, FileText, Globe, AlertTriangle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { invokeWithRetry } from '@/lib/devkit/devKitClient';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';
import { DevKitMetricCard, DevKitSection, DevKitLoading } from './DevKitUI';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewStatsData {
  totalAuthUsers: number;
  verifiedUsers: number;
  totalResumes: number;
  orphanedResumes: number;
  rawResumeDocuments?: number;
  truncated?: boolean;
  unverifiedUsers?: Array<{
    user_id: string;
    email: string | null;
    name: string | null;
    created_at: string;
  }>;
}

interface OverviewStats {
  totalAuthUsers: number;
  verifiedUsers: number;
  totalResumes: number;
  orphanedResumes: number;
  rawResumeDocuments: number;
  truncated: boolean;
  unverifiedUsers: NonNullable<OverviewStatsData['unverifiedUsers']>;
  backend: string;
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
      const tuple = await invokeWithRetry<OverviewStatsData>(
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
        rawResumeDocuments: result.rawResumeDocuments ?? result.totalResumes ?? 0,
        truncated:       result.truncated ?? false,
        unverifiedUsers: result.unverifiedUsers ?? [],
        backend:         'Appwrite',
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
      const tuple = await appwriteFunctions.invoke<PurgePreview | PurgeResult>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'purge-orphans', dryRun },
        },
      );
      const result = unwrapAdminResponse<PurgePreview | PurgeResult>(
        tuple,
        'admin-devkit-data',
      );
      if (dryRun) {
        setPurgePreview(result as PurgePreview);
        setPurgePhase('confirm');
      } else {
        setPurgeResult(result as PurgeResult);
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

  if (loading && !stats) {
    return <DevKitLoading text="Loading infrastructure overview…" />;
  }

  if (error && !stats) {
    return <DevKitErrorCard error={error} onRetry={fetchStats} />;
  }

  const orphaned = stats?.orphanedResumes ?? 0;
  const resumeSub = orphaned > 0
    ? `${orphaned} orphaned hidden from active count`
    : 'Active auth users only';

  const totalOrphans = (purgePreview?.orphanedProfiles ?? 0) + (purgePreview?.orphanedResumes ?? 0);

  return (
    <div className="space-y-6">
      {stats?.truncated && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300">
          <Info size={14} className="mt-0.5 shrink-0 text-yellow-400" />
          <span>
            <strong>Approximate data</strong> — user base exceeds 500 accounts. Verified/unverified counts and orphan
            analysis cover the first 500 users only. Total auth user count is exact.
          </span>
        </div>
      )}
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DevKitMetricCard
          icon={Users}
          label="Auth Users"
          value={stats?.totalAuthUsers ?? 0}
          subtext={`Verified: ${stats?.verifiedUsers ?? 0}`}
          loading={loading && !stats}
        />
        <DevKitMetricCard
          icon={FileText}
          label="Total Resumes"
          value={stats?.totalResumes ?? 0}
          subtext={resumeSub}
          status={orphaned > 0 ? 'warning' : 'success'}
          loading={loading && !stats}
        />
        <DevKitMetricCard
          icon={Globe}
          label="Backend"
          value={stats?.backend ?? '---'}
          subtext={`Latency: ${stats?.latency ?? '?'}ms`}
          loading={loading && !stats}
        />
      </div>

      {stats && stats.unverifiedUsers.length > 0 && (
        <DevKitSection
          title="Unverified Auth Users"
          icon={AlertTriangle}
          status="warning"
          action={
            <span className="text-xs text-muted-foreground">{stats.unverifiedUsers.length} pending</span>
          }
        >
          <div className="space-y-1">
            {stats.unverifiedUsers.map(user => (
              <div key={user.user_id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{user.email ?? user.name ?? 'No email'}</span>
                <span className="font-mono">{user.user_id}</span>
                <span>joined {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </DevKitSection>
      )}

      {/* Orphan cleanup — warning prompt */}
      {orphaned > 0 && purgePhase === 'idle' && !purgeResult && (
        <DevKitSection
          title="Orphaned Resumes Detected"
          icon={AlertTriangle}
          status="warning"
          action={
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={() => runPurge(true)}
            >
              Preview &amp; clean
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground">
            {orphaned} orphaned resume{orphaned !== 1 ? 's' : ''} from deleted accounts were found.
            Preview before deleting them permanently.
          </p>
        </DevKitSection>
      )}

      {/* Orphan cleanup — scanning spinner */}
      {purgePhase === 'previewing' && (
        <DevKitSection title="Scanning orphans…" icon={Info}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MiniSpinner size={14} />
            <span className="text-xs">Scanning for orphaned documents…</span>
          </div>
        </DevKitSection>
      )}

      {/* Orphan cleanup — confirm deletion */}
      {purgePhase === 'confirm' && purgePreview && (
        <DevKitSection
          title="Confirm Orphan Cleanup"
          icon={AlertTriangle}
          status="error"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => runPurge(false)}>
                Delete {totalOrphans} document{totalOrphans !== 1 ? 's' : ''}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setPurgePhase('idle'); setPurgePreview(null); }}>
                Cancel
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-4 sm:w-48">
              <div className="rounded-lg border border-border bg-card p-2 text-center">
                <div className="text-lg font-semibold text-destructive">{purgePreview.orphanedResumes}</div>
                <div className="text-[10px] uppercase tracking-wider">Resumes</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-2 text-center">
                <div className="text-lg font-semibold text-destructive">{purgePreview.orphanedProfiles}</div>
                <div className="text-[10px] uppercase tracking-wider">Profiles</div>
              </div>
            </div>
            {purgePreview.sampleResumes.length > 0 && (
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Resumes:</p>
                {purgePreview.sampleResumes.slice(0, 3).map(r => (
                  <p key={r.$id} className="font-mono">
                    …{r.$id.slice(-8)}{r.title ? ` "${r.title}"` : ''} (user: …{r.user_id?.slice(-8) ?? '?'})
                  </p>
                ))}
                {purgePreview.orphanedResumes > 3 && <p className="font-mono">…and {purgePreview.orphanedResumes - 3} more</p>}
              </div>
            )}
            {purgePreview.sampleProfiles.length > 0 && (
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Profiles:</p>
                {purgePreview.sampleProfiles.slice(0, 3).map(p => (
                  <p key={p.$id} className="font-mono">
                    …{p.$id.slice(-8)}{p.email ? ` ${p.email}` : ''} (user: …{p.user_id?.slice(-8) ?? '?'})
                  </p>
                ))}
                {purgePreview.orphanedProfiles > 3 && <p className="font-mono">…and {purgePreview.orphanedProfiles - 3} more</p>}
              </div>
            )}
            <p className="text-destructive font-medium">This action is permanent and cannot be undone.</p>
          </div>
        </DevKitSection>
      )}

      {/* Orphan cleanup — deleting spinner */}
      {purgePhase === 'purging' && (
        <DevKitSection title="Cleaning orphans…" icon={Info}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MiniSpinner size={14} />
            <span className="text-xs">Deleting orphaned documents…</span>
          </div>
        </DevKitSection>
      )}

      {/* Orphan cleanup — success */}
      {purgePhase === 'done' && purgeResult && (
        <DevKitSection
          title="Cleanup Complete"
          icon={Check}
          status="success"
          action={
            <Button size="sm" variant="ghost" onClick={() => { setPurgePhase('idle'); setPurgeResult(null); }}>
              Dismiss
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground">
            Deleted {purgeResult.deletedResumes} resume{purgeResult.deletedResumes !== 1 ? 's' : ''} and{' '}
            {purgeResult.deletedProfiles} profile{purgeResult.deletedProfiles !== 1 ? 's' : ''}. Stats refreshed.
          </p>
        </DevKitSection>
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
      <DevKitSection title="System Note" icon={Info}>
        <p className="text-xs text-muted-foreground font-mono">
          Project is Appwrite-native. Admin data reads and writes use Appwrite Functions.
        </p>
      </DevKitSection>
    </div>
  );
};
