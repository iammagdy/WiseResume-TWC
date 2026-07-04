/**
 * CommandHomeHub.tsx
 *
 * Step 1: Command Home — the only hub wired to live read-only data.
 *
 * Data source: `devKitCall({ action: 'home-summary' })` — the same action
 * already used by the existing HomePanel.tsx in /devkit.
 *
 * No mock data is displayed as real production data.
 * All dangerous actions are disabled and labeled.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  ExternalLink,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  XCircle,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from '@/components/dev-kit/DevKitErrorCard';
import { INTEGRATION_MAP } from '@/lib/devkit-v2/devKit2IntegrationMap';
import type { Hub2Id } from '@/lib/devkit-v2/devKit2HubConfig';
import type { DevKitError } from '@/lib/devkit/devKitClient';

// ─── Types (mirrors HomePanel.tsx contract) ───────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  category?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const AUDIT_CATEGORY_COLORS: Record<string, string> = {
  auth: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  users: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  plans: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  settings: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  flags: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  wisehire: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  moderation: 'bg-red-500/10 text-red-400 border-red-500/20',
  coupons: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  email: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  admin: 'bg-muted text-muted-foreground border-border',
};

function categoryFromAction(action: string, category?: string): string {
  if (category) return category;
  if (action.includes('flag')) return 'flags';
  if (action.includes('plan') || action.includes('trial') || action.includes('credit')) return 'plans';
  if (action.includes('suspend') || action.includes('delete-user') || action.includes('merge')) return 'users';
  if (action.includes('setting') || action.includes('maintenance')) return 'settings';
  if (action.includes('wisehire')) return 'wisehire';
  if (action.includes('email')) return 'email';
  if (action.includes('coupon')) return 'coupons';
  if (action.includes('moderate')) return 'moderation';
  if (action.includes('auth') || action.includes('login')) return 'auth';
  return 'admin';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  status: 'ok' | 'warn' | 'error' | 'neutral';
  subtext?: string;
}

function StatusCard({ label, value, icon: Icon, status, subtext }: StatusCardProps) {
  const statusClasses = {
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('rounded-lg border p-2', {
          'bg-emerald-500/10 border-emerald-500/20': status === 'ok',
          'bg-amber-500/10 border-amber-500/20': status === 'warn',
          'bg-red-500/10 border-red-500/20': status === 'error',
          'bg-muted border-border': status === 'neutral',
        })}>
          <Icon size={18} className={statusClasses[status]} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-base font-semibold truncate', statusClasses[status])}>{value}</p>
          {subtext && <p className="text-[10px] text-muted-foreground/70 truncate">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface HubCardProps {
  id: Hub2Id;
  label: string;
  icon: React.ElementType;
  description: string;
  onClick: (hub: Hub2Id) => void;
}

function HubCard({ id, label, icon: Icon, description, onClick }: HubCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-border bg-muted p-2">
          <Icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <ExternalLink size={13} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-2">{description}</p>
      </div>
      <div className="absolute bottom-2 right-3">
        <span className="text-[9px] font-mono text-muted-foreground/40">Placeholder · Step 2</span>
      </div>
    </button>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────

interface CommandHomeHubProps {
  onHubChange: (hub: Hub2Id) => void;
  showIntegrationMap: boolean;
  onOpenIntegrationMap: () => void;
}

export function CommandHomeHub({
  onHubChange,
  showIntegrationMap,
  onOpenIntegrationMap,
}: CommandHomeHubProps) {
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DevKitError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await devKitCall<HomeSummary>({ action: 'home-summary' });
    if (res.ok) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Integration map entries (live only) ────────────────────────────────────
  const liveEntries = INTEGRATION_MAP.filter((m) => m.step1Status === 'live-readonly');
  const pendingEntries = INTEGRATION_MAP.filter((m) => m.step1Status === 'placeholder');
  const dangerousEntries = INTEGRATION_MAP.filter((m) => m.step1Status === 'disabled-dangerous');

  return (
    <div className="space-y-8">
      {/* ── Live data header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Command Home</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational overview — live read-only data via{' '}
            <code className="text-[11px] text-foreground bg-muted px-1 py-0.5 rounded">
              home-summary
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live Data
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <DevKitErrorCard error={error} onRetry={load} />
      )}

      {/* ── Status metric cards ────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operational Status
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-5 rounded mb-2" />
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatusCard
              label="Site Status"
              value={data.siteUp ? 'Online' : 'Offline'}
              icon={data.siteUp ? CheckCircle2 : XCircle}
              status={data.siteUp ? 'ok' : 'error'}
              subtext={`HTTP ${data.siteHttpStatus}`}
            />
            <StatusCard
              label="Maintenance Mode"
              value={data.maintenanceModeOn ? 'Active' : 'Off'}
              icon={Shield}
              status={data.maintenanceModeOn ? 'warn' : 'ok'}
            />
            <StatusCard
              label="AI Configured"
              value={data.aiConfigured ? 'Ready' : 'Not Configured'}
              icon={Cpu}
              status={data.aiConfigured ? 'ok' : 'warn'}
            />
            <StatusCard
              label="Total Users"
              value={data.totalUsers !== null ? data.totalUsers.toLocaleString() : '—'}
              icon={Users}
              status="neutral"
            />
            <StatusCard
              label="Recent Errors"
              value={data.recentErrorCount === 0 ? 'None' : String(data.recentErrorCount)}
              icon={AlertTriangle}
              status={data.recentErrorCount === 0 ? 'ok' : 'warn'}
            />
            <StatusCard
              label="WiseHire Queue"
              value={String(data.wisehireWaitlistCount)}
              icon={Briefcase}
              status={data.wisehireWaitlistCount > 0 ? 'warn' : 'ok'}
              subtext="Pending approvals"
            />
            {data.checkedAt && (
              <StatusCard
                label="Data Checked At"
                value={formatRelative(data.checkedAt)}
                icon={Clock}
                status="neutral"
              />
            )}
          </div>
        ) : null}
      </section>

      {/* ── Recent admin audit ─────────────────────────────────────────────── */}
      {(loading || (data?.recentAudit && data.recentAudit.length > 0)) && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Admin Activity <span className="ml-1 font-normal normal-case text-muted-foreground/60">(live)</span>
          </h3>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-0 divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data?.recentAudit.slice(0, 8).map((entry) => {
                    const cat = categoryFromAction(entry.action, entry.category);
                    const colorClass = AUDIT_CATEGORY_COLORS[cat] ?? AUDIT_CATEGORY_COLORS['admin'];
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            colorClass,
                          )}
                        >
                          {cat}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm text-foreground font-mono text-[11px]">
                          {entry.action}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {formatRelative(entry.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Hub navigator cards (placeholders) ────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hub Navigator
          <span className="ml-2 rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 text-[9px] text-amber-400">
            Hubs below wiring in Step 2
          </span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HubCard
            id="health"
            label="System Health"
            icon={Activity}
            description="Diagnostics, observability, mission control, growth & traffic"
            onClick={onHubChange}
          />
          <HubCard
            id="users"
            label="Users & Accounts"
            icon={Users}
            description="Account explorer, signups, database X-Ray, moderation"
            onClick={onHubChange}
          />
          <HubCard
            id="ai"
            label="AI Operations"
            icon={Cpu}
            description="LLM routing, health, radar, and key management"
            onClick={onHubChange}
          />
          <HubCard
            id="growth"
            label="Growth Analytics"
            icon={TrendingUp}
            description="Visitor data, onboarding funnel, conversion metrics"
            onClick={onHubChange}
          />
          <HubCard
            id="business"
            label="Business Ops"
            icon={Briefcase}
            description="Email hub, coupons, moderation queues, waitlists"
            onClick={onHubChange}
          />
          <HubCard
            id="devops"
            label="Developer Ops"
            icon={Terminal}
            description="Appwrite functions, database X-Ray, system tests, feature flags"
            onClick={onHubChange}
          />
        </div>
      </section>

      {/* ── Integration map preview ────────────────────────────────────────── */}
      {showIntegrationMap && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Compass size={12} className="inline mr-1.5 text-amber-400" />
              Integration Map Preview
            </h3>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Hub → Action Cross-Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Hub</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Function</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Action</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Step 1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...liveEntries, ...pendingEntries.slice(0, 6)].map((m, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground/80">{m.hub}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{m.functionId}</td>
                        <td className="px-4 py-2 font-mono text-foreground/70">{m.action}</td>
                        <td className="px-4 py-2">
                          {m.step1Status === 'live-readonly' && (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                              Live
                            </span>
                          )}
                          {m.step1Status === 'placeholder' && (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              Step 2
                            </span>
                          )}
                          {m.step1Status === 'disabled-dangerous' && (
                            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold text-red-400">
                              Disabled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {dangerousEntries.length > 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-[10px] text-muted-foreground/60">
                          + {dangerousEntries.length} dangerous actions disabled in Step 1 •{' '}
                          {pendingEntries.length - 6 > 0 && `${pendingEntries.length - 6} more pending `}
                          <button
                            type="button"
                            className="underline hover:text-foreground transition-colors"
                            onClick={onOpenIntegrationMap}
                          >
                            View full map →
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Step 1 scope note ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground text-xs mb-1">DevKit2 Step 1 Scope</p>
        <p className="text-xs leading-relaxed">
          Command Home is the only hub wired to live data in this step (via <code className="text-foreground">home-summary</code>).
          All other hubs show structural placeholders that document the integration plan.
          No destructive actions are enabled in this preview.
          Step 2 will progressively wire each hub to its real read-only data.
        </p>
      </div>
    </div>
  );
}
