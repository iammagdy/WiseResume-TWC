import { useCallback, useEffect, useMemo, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import type { ElementType } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, Database, KeyRound, RefreshCw, ServerCog, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall, type DevKitError } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { cn } from '@/lib/utils';
import { DevKitSection, DevKitStatusBadge, DevKitLoading, type DevKitStatusVariant } from './DevKitUI';

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

const STATUS_META: Record<DiagnosticStatus, { title: string; icon: ElementType }> = {
  healthy:        { title: 'Healthy',        icon: CheckCircle2 },
  warning:        { title: 'Warning',        icon: AlertTriangle },
  broken:         { title: 'Broken',         icon: XCircle },
  not_configured: { title: 'Not Configured', icon: CircleDashed },
};

const STATUS_VARIANT: Record<DiagnosticStatus, DevKitStatusVariant> = {
  healthy: 'success',
  warning: 'warning',
  broken: 'error',
  not_configured: 'neutral',
};

const GROUP_ICONS: Record<DiagnosticItem['group'], ElementType> = {
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
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-black uppercase text-muted-foreground')}>
      <meta.icon className="h-3 w-3" />
      <DevKitStatusBadge variant={STATUS_VARIANT[status]} label={meta.title} showDot={false} className="border-0 bg-transparent px-0" />
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
    if (result.ok) setData(result.data);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { runDiagnostics(); }, [runDiagnostics]);

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
    return <DevKitLoading text="Running DevKit diagnostics…" />;
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
      <DevKitSection
        title="DevKit Diagnostics"
        icon={ServerCog}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">{counts.healthy} healthy</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">{counts.warning} warning</span>
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">{counts.broken} broken</span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{counts.notConfigured} not configured</span>
            <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading}>
              {loading ? <MiniSpinner size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DevKitStatusBadge variant={STATUS_VARIANT[data?.overallStatus ?? 'warning']} label={STATUS_META[data?.overallStatus ?? 'warning'].title} />
          <p className="text-xs text-muted-foreground">
            {data?.checkedAt ? `Last checked ${new Date(data.checkedAt).toLocaleString()}` : 'No completed diagnostic run yet'}
          </p>
        </div>
      </DevKitSection>

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
            <DevKitSection key={group} title={group} icon={GroupIcon}>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                      </div>
                      <DevKitStatusBadge variant={STATUS_VARIANT[item.status]} label={STATUS_META[item.status].title} />
                    </div>
                    {item.detail && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>}
                  </div>
                ))}
              </div>
            </DevKitSection>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        Diagnostics are read-only. Any cleanup or support action still requires a separate dry-run/confirmation step.
      </div>
    </div>
  );
}
