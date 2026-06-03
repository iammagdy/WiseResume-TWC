import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Activity, AlertTriangle, Briefcase, CheckCircle2, Clock, ExternalLink, RefreshCw, ServerCrash, Shield, ShieldAlert, Users, Wrench, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { cn } from '@/lib/utils';

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

interface StatusCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  status: 'ok' | 'warn' | 'bad' | 'off' | 'loading';
  onClick?: () => void;
  subtext?: string;
}

function StatusCard({ icon: Icon, label, value, status, onClick, subtext }: StatusCardProps) {
  const border =
    status === 'ok'      ? 'border-emerald-500/20 bg-emerald-500/5'
    : status === 'warn'  ? 'border-amber-400/25 bg-amber-400/5'
    : status === 'bad'   ? 'border-red-500/20 bg-red-500/5'
    : status === 'off'   ? 'border-white/10 bg-white/[0.03]'
    :                      'border-white/10 bg-white/[0.03]';

  const dot =
    status === 'ok'      ? 'bg-emerald-500 shadow-emerald-500/50'
    : status === 'warn'  ? 'bg-amber-400 shadow-amber-400/50'
    : status === 'bad'   ? 'bg-red-500 shadow-red-500/50'
    :                      'bg-white/20';

  return (
    <div
      className={cn('rounded-2xl border p-4 space-y-2 shadow-sm transition-all', border, onClick && 'cursor-pointer hover:brightness-110')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex w-2 h-2 rounded-full shadow-sm shrink-0', dot)} />
          <Icon className="w-4 h-4 text-white/40" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</span>
        </div>
        {onClick && <ExternalLink className="w-3 h-3 text-white/20" />}
      </div>
      <div className="text-lg font-black text-white leading-none">{value}</div>
      {subtext && <p className="text-[10px] text-white/35 truncate">{subtext}</p>}
    </div>
  );
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
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <MiniSpinner size={20} />
          <span className="text-sm font-semibold">Loading Command Center…</span>
        </div>
      </div>
    );
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
    <div className="space-y-8">
      {/* Greeting row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter text-white">{greeting}, Admin.</h2>
          <p className="text-xs font-mono uppercase tracking-widest text-white/35">
            {data ? `Last refreshed ${formatRelative(data.checkedAt)}` : 'Platform overview · Wise Cloud'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="rounded-xl self-start sm:self-auto"
        >
          {loading ? <MiniSpinner size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard
          icon={Activity}
          label="Site"
          value={data ? (data.siteUp ? 'Online' : 'Down') : '—'}
          status={data ? (data.siteUp ? 'ok' : 'bad') : 'loading'}
          onClick={() => onNavigate('mission')}
          subtext={data ? `HTTP ${data.siteHttpStatus}` : undefined}
        />
        <StatusCard
          icon={Zap}
          label="AI Providers"
          value={data ? (data.aiConfigured ? 'Ready' : 'No Keys') : '—'}
          status={data ? (data.aiConfigured ? 'ok' : 'warn') : 'loading'}
          onClick={() => onNavigate('ai-health')}
        />
        <StatusCard
          icon={data?.maintenanceModeOn ? ShieldAlert : Shield}
          label="Maintenance"
          value={data ? (data.maintenanceModeOn ? 'ACTIVE' : 'Off') : '—'}
          status={data ? (data.maintenanceModeOn ? 'warn' : 'ok') : 'loading'}
          onClick={() => onNavigate('flags')}
          subtext={data?.maintenanceModeOn ? 'Site is showing maintenance page' : undefined}
        />
        <StatusCard
          icon={Briefcase}
          label="WiseHire Queue"
          value={data ? (data.wisehireWaitlistCount > 0 ? `${data.wisehireWaitlistCount} pending` : 'Clear') : '—'}
          status={data ? (data.wisehireWaitlistCount > 0 ? 'warn' : 'ok') : 'loading'}
          onClick={() => onNavigate('wisehire-waitlist')}
          subtext={data?.wisehireWaitlistCount > 0 ? 'Needs approval' : undefined}
        />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
          <div className="flex items-center gap-2 text-white/35">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Users</span>
          </div>
          <p className="text-3xl font-black tabular-nums text-white">
            {data?.totalUsers != null ? data.totalUsers.toLocaleString() : '—'}
          </p>
          <button
            onClick={() => onNavigate('users')}
            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
          >
            Users <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        <div className={cn(
          'rounded-2xl border p-4 space-y-1',
          data?.recentErrorCount ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/[0.03]',
        )}>
          <div className="flex items-center gap-2 text-white/35">
            <ServerCrash className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Recent Errors</span>
          </div>
          <p className={cn(
            'text-3xl font-black tabular-nums',
            data?.recentErrorCount ? 'text-red-400' : 'text-white',
          )}>
            {data != null ? data.recentErrorCount : '—'}
          </p>
          <button
            onClick={() => onNavigate('observability')}
            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
          >
            Observability <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-white/35">
            <Wrench className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Diagnostics</span>
          </div>
          <p className="text-sm font-bold text-white/60 leading-snug pt-1">
            Run a full system health check
          </p>
          <button
            onClick={() => onNavigate('diagnostics')}
            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
          >
            Open Diagnostics <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Recent audit log */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/35" />
            <span className="text-sm font-black text-white">Recent Admin Actions</span>
            {data && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/35">
                Last {data.recentAudit.length}
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
          >
            View all <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-6">
            <MiniSpinner size={20} className="text-white/30" />
          </div>
        )}

        {data && data.recentAudit.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-white/25">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">No recent admin actions</span>
            </div>
          </div>
        )}

        {data && data.recentAudit.length > 0 && (
          <div className="space-y-1">
            {data.recentAudit.map(entry => {
              const cat = categoryLabel(entry.action, entry.category);
              const colorClass = CATEGORY_COLORS[cat] ?? 'bg-white/5 text-white/40 border-white/10';
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase', colorClass)}>
                    {cat}
                  </span>
                  <span className="font-mono text-xs text-white/70 truncate flex-1">{entry.action}</span>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <span className="text-[10px] text-white/30 truncate max-w-[140px] hidden sm:block">
                      {Object.entries(entry.metadata)
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </span>
                  )}
                  <span className="text-[10px] tabular-nums text-white/25 shrink-0">
                    {formatRelative(entry.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick nav shortcuts */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/25">Quick Navigation</p>
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
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && data && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Last refresh failed: {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/25">
          <XCircle className="w-4 h-4 shrink-0" />
          No data loaded yet. Click Refresh.
        </div>
      )}
    </div>
  );
}
