import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall, type DevKitError } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { cn } from '@/lib/utils';

type DiagnosticStatus = 'healthy' | 'warning' | 'broken' | 'not_configured';

interface DiagnosticItem {
  id: string;
  label: string;
  status: DiagnosticStatus;
  summary: string;
  detail?: string;
  group: 'Access' | 'Functions' | 'Database' | 'Providers' | 'Email' | 'Production';
}

interface DiagnosticsResponse {
  checkedAt: string;
  overallStatus: DiagnosticStatus;
  items: DiagnosticItem[];
  requestId?: string;
}

const STATUS_META: Record<DiagnosticStatus, { title: string; icon: React.ElementType; className: string }> = {
  healthy: {
    title: 'Healthy',
    icon: CheckCircle2,
    className: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
  },
  warning: {
    title: 'Warning',
    icon: AlertTriangle,
    className: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
  },
  broken: {
    title: 'Broken',
    icon: XCircle,
    className: 'border-red-500/20 bg-red-500/5 text-red-400',
  },
  not_configured: {
    title: 'Not Configured',
    icon: CircleDashed,
    className: 'border-white/10 bg-white/5 text-white/50',
  },
};

const GROUP_ICONS: Record<DiagnosticItem['group'], React.ElementType> = {
  Access: ShieldCheck,
  Functions: ServerCog,
  Database: Database,
  Providers: KeyRound,
  Email: KeyRound,
  Production: ServerCog,
};

function StatusPill({ status }: { status: DiagnosticStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase', meta.className)}>
      <meta.icon className="h-3 w-3" />
      {meta.title}
    </span>
  );
}

export function DiagnosticsPanel() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DevKitError | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<DiagnosticsResponse>({ action: 'diagnostics' });
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const grouped = useMemo(() => {
    const groups = new Map<DiagnosticItem['group'], DiagnosticItem[]>();
    for (const item of data?.items ?? []) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries());
  }, [data]);

  const counts = useMemo(() => {
    const items = data?.items ?? [];
    return {
      healthy: items.filter(i => i.status === 'healthy').length,
      warning: items.filter(i => i.status === 'warning').length,
      broken: items.filter(i => i.status === 'broken').length,
      notConfigured: items.filter(i => i.status === 'not_configured').length,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Running DevKit diagnostics</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <DevKitErrorCard
        error={error.message}
        title="Diagnostics failed"
        onRetry={runDiagnostics}
        context={{ panel: 'Diagnostics', function: 'admin-devkit-data', action: 'diagnostics', httpStatus: error.status }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusPill status={data?.overallStatus ?? 'warning'} />
            <h2 className="text-lg font-black text-white">DevKit Diagnostics</h2>
          </div>
          <p className="text-xs text-white/45">
            {data?.checkedAt ? `Last checked ${new Date(data.checkedAt).toLocaleString()}` : 'No completed diagnostic run yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">{counts.healthy} healthy</span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">{counts.warning} warning</span>
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">{counts.broken} broken</span>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/45">{counts.notConfigured} not configured</span>
          <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error && data && (
        <DevKitErrorCard
          error={error.message}
          title="Last diagnostics refresh failed"
          onRetry={runDiagnostics}
          compact
          context={{ panel: 'Diagnostics', function: 'admin-devkit-data', action: 'diagnostics', httpStatus: error.status }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {grouped.map(([group, items]) => {
          const GroupIcon = GROUP_ICONS[group];
          return (
            <section key={group} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-2">
                <GroupIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-black uppercase tracking-wide text-white/80">{group}</h3>
              </div>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-bold text-white">{item.label}</p>
                        <p className="text-xs leading-relaxed text-white/55">{item.summary}</p>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    {item.detail && (
                      <p className="mt-2 rounded-lg bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-white/45">
                        {item.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-300">
        <Clock className="h-4 w-4 shrink-0" />
        Diagnostics are read-only. Any cleanup or support action still requires a separate dry-run/confirmation step.
      </div>
    </div>
  );
}
