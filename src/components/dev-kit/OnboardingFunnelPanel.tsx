import { useState, useCallback, useEffect, useMemo } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  RefreshCw, Lock, Filter, Users, ListChecks, AlertTriangle, SkipForward, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { getDevKitToken, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard } from './DevKitErrorCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';

type Granularity = 'day' | 'week';

interface FunnelData {
  rangeFrom: string;
  rangeTo: string;
  totalEvents: number;
  truncated?: boolean;
  methodBreakdown: { method: string; count: number }[];
  funnel: { step: string; users: number }[];
  skipRates: { step: string; count: number; denominator: number; rate: number }[];
  saveFailures: { message: string; count: number }[];
  series: { date: string; started: number; path_selected: number; review_opened: number; completed: number }[];
}

const RANGE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Last 24h' },
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const STEP_LABELS: Record<string, string> = {
  started: 'Started',
  path_selected: 'Path picked',
  review_opened: 'Review opened',
  completed: 'Completed',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

function pct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export function OnboardingFunnelPanel() {
  const { isUnlocked } = useDevKitSession();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(14);
  const [granularity, setGranularity] = useState<Granularity>('day');

  const isMounted = useIsMounted();

  const fetchData = useCallback(async () => {
    const token = getDevKitToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const tuple = await appwriteFunctions.invoke(
        'admin-onboarding-funnel',
        { headers: devKitAuthHeaders(), body: { days, granularity } },
      );
      const result = unwrapAdminResponse<{ data?: FunnelData }>(tuple, 'admin-onboarding-funnel');
      if (!isMounted()) return;
      const raw = result?.data;
      if (!raw) throw new Error('No data returned');
      setData(raw);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load funnel'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [days, granularity, isMounted]);

  useEffect(() => {
    if (isUnlocked) fetchData();
    else { setData(null); setError(null); }
  }, [isUnlocked, fetchData]);

  const startedUsers = data?.funnel.find(f => f.step === 'started')?.users ?? 0;

  const funnelRows = useMemo(() => {
    if (!data) return [];
    return data.funnel.map(({ step, users }, idx) => {
      const prev = idx > 0 ? data.funnel[idx - 1].users : users;
      const dropFromPrev = idx === 0 ? 0 : Math.max(0, prev - users);
      return {
        step,
        users,
        pctOfStarted: pct(users, startedUsers),
        dropFromPrev,
        dropPct: idx === 0 ? '—' : pct(dropFromPrev, prev || 1),
      };
    });
  }, [data, startedUsers]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Onboarding funnel locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view onboarding metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Context banner — explains what this panel measures */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">What is this?</p>
        <p>
          Tracks how many users complete each step of the <strong>profile creation onboarding</strong> — from
          landing on the welcome screen to finishing their resume/profile. Data is sourced from{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">audit_logs</code> events with{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">category = &apos;onboarding&apos;</code>.
        </p>
        <p className="text-xs">
          <strong>Steps:</strong>{' '}
          <span className="font-medium text-foreground">Started</span> → user hit the onboarding screen ·{' '}
          <span className="font-medium text-foreground">Path picked</span> → chose CV upload, LinkedIn, or manual ·{' '}
          <span className="font-medium text-foreground">Review opened</span> → reached the profile review step ·{' '}
          <span className="font-medium text-foreground">Completed</span> → finished and saved their profile
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Onboarding Funnel</h2>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(data.rangeFrom).toLocaleDateString()} – {new Date(data.rangeTo).toLocaleDateString()} ·{' '}
              {data.totalEvents.toLocaleString()} events
              {data.truncated && (
                <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                  · result truncated — narrow the time range for exact totals
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background text-foreground px-2 text-xs"
            >
              {RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="h-8 rounded-md border border-border bg-background text-foreground px-2 text-xs"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="flex items-center gap-2">
            {loading ? <MiniSpinner size={16} /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <DevKitErrorCard error={error} title="Couldn't load onboarding funnel" context={{ panel: 'Onboarding Funnel', function: 'admin-devkit-data' }} />
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Funnel summary */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Funnel — unique users at each step
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funnelRows.map(row => (
                <div key={row.step} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{STEP_LABELS[row.step] ?? row.step}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{row.users.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{row.pctOfStarted} of started</p>
                  {row.step !== 'started' && (
                    <p className="text-[11px] text-destructive/80 mt-0.5">−{row.dropFromPrev} ({row.dropPct}) drop</p>
                  )}
                </div>
              ))}
            </div>
            {data.funnel.every(f => f.users === 0) && (
              <p className="text-xs text-muted-foreground">No onboarding events in this range.</p>
            )}
          </div>

          {/* Method breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Path picked — method distribution
            </p>
            {data.methodBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No path_selected events in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, data.methodBreakdown.length * 28)}>
                <BarChart data={data.methodBreakdown} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="method" width={130} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Time series */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Funnel events over time ({granularity})
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="started" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="path_selected" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="review_opened" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Skip rates */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <SkipForward className="w-4 h-4 text-primary" />
              Skip events by step
            </p>
            {data.skipRates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No skip events in this range.</p>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-12 gap-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span className="col-span-5">Step</span>
                  <span className="col-span-3 text-right">Skip rate</span>
                  <span className="col-span-2 text-right">Skips</span>
                  <span className="col-span-2 text-right">Reached</span>
                </div>
                {data.skipRates.map(({ step, count, denominator, rate }) => (
                  <div key={step} className="grid grid-cols-12 gap-2 py-2 text-sm items-center">
                    <span className="col-span-5 text-foreground truncate">{step}</span>
                    <span className="col-span-3 text-right font-semibold tabular-nums">
                      {denominator > 0 ? `${Math.round(rate * 100)}%` : '—'}
                    </span>
                    <span className="col-span-2 text-right tabular-nums">{count.toLocaleString()}</span>
                    <span className="col-span-2 text-right tabular-nums text-muted-foreground">
                      {denominator.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/70">
              Skip rate = skip events at step ÷ unique users that reached that funnel step.
            </p>
          </div>

          {/* Save failures */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              save_failed errors
            </p>
            {data.saveFailures.length === 0 ? (
              <p className="text-xs text-muted-foreground">No save failures in this range.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.saveFailures.map(({ message, count }) => (
                  <div key={message} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="text-foreground break-words">{message}</span>
                    <span className="tabular-nums font-medium shrink-0">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
