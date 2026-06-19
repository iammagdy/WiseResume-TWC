import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Activity, AlertTriangle, Briefcase, CheckCircle2, Clock, ExternalLink, LayoutGrid, RefreshCw, ServerCrash, Shield, ShieldAlert, Users, Wrench, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { cn } from '@/lib/utils';
import { DevKitMetricCard, DevKitSection, DevKitLoading } from './DevKitUI';

interface AuditEntry {
  id: string;
  action: string;
  category?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface HomeSummary {
  checkedAt: string;
  siteUp: boolean;
  siteHttpStatus: number;
  maintenanceModeOn: boolean;
  aiConfigured: boolean;
  wisehireWaitlistCount: number;
  recentErrorCount: number;
  totalUsers: number | null;
  recentAudit: AuditEntry[];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  auth:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  users:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
  plans:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  settings:   'bg-slate-500/10 text-slate-300 border-slate-500/20',
  flags:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  wisehire:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  moderation: 'bg-red-500/10 text-red-400 border-red-500/20',
  coupons:    'bg-pink-500/10 text-pink-400 border-pink-500/20',
  email:      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  admin:      'bg-muted text-muted-foreground border-border',
};

function categoryLabel(action: string, category?: string): string {
  if (category) return category;
  if (action.startsWith('approve-wisehire') || action.startsWith('dismiss-wisehire') || action.startsWith('list-wisehire')) return 'wisehire';
  if (action.includes('flag')) return 'flags';
  if (action.includes('plan') || action.includes('trial') || action.includes('credit')) return 'plans';
  if (action.includes('suspend') || action.includes('delete-user') || action.includes('merge') || action.includes('set-plan')) return 'users';
  if (action.includes('setting') || action.includes('maintenance')) return 'settings';
  if (action.includes('discount') || action.includes('coupon')) return 'coupons';
  if (action.includes('email') || action.includes('mail')) return 'email';
  if (action.includes('moderate') || action.includes('moderation')) return 'moderation';
  return 'admin';
}

interface HomePanelProps {
  onNavigate: (panel: string) => void;
}

export function HomePanel({ onNavigate }: HomePanelProps) {
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<HomeSummary>({ action: 'home-summary' });
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <DevKitLoading text="Loading Command Center…" />;
  }

  if (error && !data) {
    return (
      <DevKitErrorCard
        error={error}
        title="Home summary failed"
        onRetry={fetchData}
        context={{ panel: 'Home', function: 'admin-devkit-data', action: 'home-summary' }}
      />
    );
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Greeting row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}, Admin.</h2>
          <p className="text-xs text-muted-foreground">
            {data ? `Last refreshed ${formatRelative(data.checkedAt)}` : 'Platform overview · Wise Cloud'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto"
        >
          {loading ? <MiniSpinner size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DevKitMetricCard
          icon={Activity}
          label="Site"
          value={data ? (data.siteUp ? 'Online' : 'Down') : '—'}
          status={data ? (data.siteUp ? 'success' : 'error') : 'neutral'}
          onClick={() => onNavigate('mission')}
          subtext={data ? `HTTP ${data.siteHttpStatus}` : undefined}
          loading={loading && !data}
        />
        <DevKitMetricCard
          icon={Zap}
          label="AI Providers"
          value={data ? (data.aiConfigured ? 'Ready' : 'No Keys') : '—'}
          status={data ? (data.aiConfigured ? 'success' : 'warning') : 'neutral'}
          onClick={() => onNavigate('ai-health')}
          loading={loading && !data}
        />
        <DevKitMetricCard
          icon={data?.maintenanceModeOn ? ShieldAlert : Shield}
          label="Maintenance"
          value={data ? (data.maintenanceModeOn ? 'Active' : 'Off') : '—'}
          status={data ? (data.maintenanceModeOn ? 'warning' : 'success') : 'neutral'}
          onClick={() => onNavigate('flags')}
          subtext={data?.maintenanceModeOn ? 'Site is showing maintenance page' : undefined}
          loading={loading && !data}
        />
        <DevKitMetricCard
          icon={Briefcase}
          label="WiseHire Queue"
          value={data ? (data.wisehireWaitlistCount > 0 ? `${data.wisehireWaitlistCount} pending` : 'Clear') : '—'}
          status={data ? (data.wisehireWaitlistCount > 0 ? 'warning' : 'success') : 'neutral'}
          onClick={() => onNavigate('wisehire-waitlist')}
          subtext={data?.wisehireWaitlistCount > 0 ? 'Needs approval' : undefined}
          loading={loading && !data}
        />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DevKitMetricCard
          icon={Users}
          label="Total Users"
          value={data?.totalUsers != null ? data.totalUsers.toLocaleString() : '—'}
          subtext="Active auth users"
          onClick={() => onNavigate('users')}
          loading={loading && !data}
        />
        <DevKitMetricCard
          icon={ServerCrash}
          label="Recent Errors"
          value={data != null ? data.recentErrorCount : '—'}
          status={data?.recentErrorCount ? 'error' : 'success'}
          subtext="Last 24h"
          onClick={() => onNavigate('observability')}
          loading={loading && !data}
        />
        <DevKitMetricCard
          icon={Wrench}
          label="Diagnostics"
          value="Run check"
          subtext="Full system health"
          onClick={() => onNavigate('diagnostics')}
          loading={loading && !data}
        />
      </div>

      {/* Recent audit log */}
      <DevKitSection
        title="Recent Admin Actions"
        icon={Clock}
        action={
          <div className="flex items-center gap-3">
            {data && data.recentAudit.length > 0 && (
              <span className="text-xs text-muted-foreground">Last {data.recentAudit.length}</span>
            )}
            <button
              onClick={() => onNavigate('audit')}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        }
      >
        <div className="space-y-1">
          {loading && !data && (
            <div className="flex items-center justify-center py-6">
              <MiniSpinner size={20} className="text-muted-foreground" />
            </div>
          )}
          {data && data.recentAudit.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">No recent admin actions</span>
            </div>
          )}
          {data && data.recentAudit.length > 0 && (
            <div className="space-y-1">
              {data.recentAudit.map(entry => {
                const cat = categoryLabel(entry.action, entry.category);
                const colorClass = CATEGORY_COLORS[cat] ?? 'bg-muted text-muted-foreground border-border';
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                  >
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase', colorClass)}>
                      {cat}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{entry.action}</span>
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <span className="hidden max-w-[140px] truncate text-[10px] text-muted-foreground sm:block">
                        {Object.entries(entry.metadata)
                          .slice(0, 2)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ')}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{formatRelative(entry.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DevKitSection>

      {/* Quick nav shortcuts */}
      <DevKitSection title="Quick Navigation" icon={LayoutGrid}>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Mission Control', panel: 'mission' },
            { label: 'Users', panel: 'users' },
            { label: 'Feature Flags', panel: 'flags' },
            { label: 'AI Health', panel: 'ai-health' },
            { label: 'AI Tools Map', panel: 'ai-tools-map' },
            { label: 'API Keys', panel: 'ai-keys' },
            { label: 'Audit Log', panel: 'audit' },
            { label: 'Growth & Traffic', panel: 'growth' },
            { label: 'Email', panel: 'email-hub' },
            { label: 'Moderation', panel: 'moderation' },
          ].map(({ label, panel }) => (
            <button
              key={panel}
              onClick={() => onNavigate(panel)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </DevKitSection>

      {error && data && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Last refresh failed: {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <XCircle className="h-4 w-4 shrink-0" />
          No data loaded yet. Click Refresh.
        </div>
      )}
    </div>
  );
}
