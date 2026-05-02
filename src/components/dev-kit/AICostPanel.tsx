import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw, Lock, Coins, Users, Activity, Zap, Layers, Server, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { useIsMounted, useVisibleInterval } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard } from './DevKitErrorCard';

import { RangeSwitcher } from './analytics/RangeSwitcher';
import { KpiCard } from './analytics/KpiCard';
import { SectionCard } from './analytics/SectionCard';
import { RankedList } from './analytics/RankedList';
import { EmptyState } from './analytics/EmptyState';
import type { AnalyticsRange, NamedCount, SeriesPoint } from './analytics/types';

interface TopUserEntry {
  user_id: string;
  email: string | null;
  invocations: number;
}

interface AICostData {
  range: AnalyticsRange;
  bucket: 'hour' | 'day';
  totals: { current: number; previous: number };
  distinctUsers: number;
  dailySeries: SeriesPoint[];
  topUsers: TopUserEntry[];
  byFeature: NamedCount[];
  byProvider: NamedCount[];
  generatedAt: string;
}

function prettyFeatureName(raw: string): string {
  // ai_usage_logs.action_type values are snake_case feature keys
  // (e.g. 'cover_letter', 'tailor_resume'). Render as a friendly label.
  return raw.replace(/^ai[._]/, '').replace(/_/g, ' ');
}

function prettyProviderName(raw: string): string {
  if (raw === 'unknown') return 'unknown / not recorded';
  return raw;
}

const RANGE_LABEL: Record<AnalyticsRange, string> = {
  today: 'today',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  all: 'all time',
};

export function AICostPanel() {
  const { isUnlocked } = useDevKitSession();
  const [data, setData] = useState<AICostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const isMounted = useIsMounted();

  const fetchData = useCallback(async (r: AnalyticsRange) => {
    const token = getDevKitToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'ai-cost', range: r },
      });
      const result = unwrapAdminResponse<{ data?: AICostData }>(tuple, 'admin-devkit-data');
      const raw = result.data;
      if (!raw) throw new Error('No data returned');
      if (!isMounted()) return;
      setData(raw);
      setLastRefreshed(new Date());
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load AI cost data'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (isUnlocked) {
      setError(null);
      fetchData(range);
    } else {
      setData(null);
      setError(null);
    }
  }, [isUnlocked, range, fetchData]);

  useVisibleInterval(useCallback(() => fetchData(range), [fetchData, range]), 120_000);

  const topFeatureLabel = data && data.byFeature[0] ? prettyFeatureName(data.byFeature[0].name) : '—';
  const topProviderLabel = data && data.byProvider[0] ? prettyProviderName(data.byProvider[0].name) : '—';

  const sparkData = useMemo(() => data?.dailySeries ?? [], [data?.dailySeries]);
  const showDelta = range !== 'all';

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">AI Cost locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view AI cost data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            AI Cost
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spend attribution for {RANGE_LABEL[range]}
            {lastRefreshed && (
              <> · last updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 2 min</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangeSwitcher value={range} onChange={setRange} disabled={loading} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(range)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Honest disclaimer about what "cost" means here */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          <strong>Cost = AI invocations.</strong> The database does not store USD or
          token counts per call today, so this dashboard attributes spend by
          invocation count — the same unit the credit ledger charges. One row =
          one AI call. To upgrade to USD attribution, persist
          <code className="font-mono mx-1 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px]">
            usage.totalTokens
          </code>
          and a model-priced cost into <code className="font-mono px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px]">ai_usage_logs.metadata</code>.
        </span>
      </div>

      {error && (
        <DevKitErrorCard
          error={error}
          title="Couldn't load AI cost data"
          onRetry={() => fetchData(range)}
        />
      )}

      {loading && !data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-56 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </>
      )}

      {data && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total invocations"
              value={data.totals.current.toLocaleString()}
              sub={`vs previous ${RANGE_LABEL[range]}`}
              icon={Coins}
              accent="primary"
              current={data.totals.current}
              previous={data.totals.previous}
              trend={sparkData}
              hideDelta={!showDelta}
            />
            <KpiCard
              label="Distinct users"
              value={data.distinctUsers.toLocaleString()}
              sub={`spent at least 1 credit in ${RANGE_LABEL[range]}`}
              icon={Users}
              accent="green"
              hideDelta
            />
            <KpiCard
              label="Top feature"
              value={topFeatureLabel}
              sub={data.byFeature[0]
                ? `${data.byFeature[0].count.toLocaleString()} calls`
                : 'no data'}
              icon={Layers}
              accent="amber"
              hideDelta
            />
            <KpiCard
              label="Top provider"
              value={topProviderLabel}
              sub={data.byProvider[0]
                ? `${data.byProvider[0].count.toLocaleString()} calls`
                : 'no data'}
              icon={Server}
              accent="purple"
              hideDelta
            />
          </div>

          {/* Top users */}
          <SectionCard
            title="Top users by spend"
            description="The 10 highest-volume users in the selected window. Email comes from auth.users; user IDs are shown for accounts without a verified email."
            icon={Users}
          >
            {data.topUsers.length === 0 ? (
              <EmptyState message="No AI activity in this window" />
            ) : (
              <RankedList
                items={data.topUsers.map(u => ({
                  name: u.email && u.email.length > 0 ? u.email : `user ${u.user_id.slice(0, 8)}…`,
                  count: u.invocations,
                }))}
                maxItems={10}
              />
            )}
          </SectionCard>

          {/* By feature + by provider — side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Spend by feature"
              description="Breakdown by edge-function / action_type recorded in ai_usage_logs."
              icon={Layers}
            >
              {data.byFeature.length === 0 ? (
                <EmptyState message="No feature data in this window" />
              ) : (
                <RankedList
                  items={data.byFeature}
                  maxItems={12}
                  formatLabel={prettyFeatureName}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Spend by provider"
              description="Breakdown by upstream AI provider (openrouter / groq / deepseek / byok). 'unknown' = older calls that did not record a provider."
              icon={Server}
            >
              {data.byProvider.length === 0 ? (
                <EmptyState message="No provider data in this window" />
              ) : (
                <RankedList
                  items={data.byProvider.map(p => ({
                    ...p,
                    name: prettyProviderName(p.name),
                  }))}
                  maxItems={8}
                />
              )}
            </SectionCard>
          </div>

          <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>
              Generated {new Date(data.generatedAt).toLocaleString()}{' '}
              · service-role read-only
            </span>
            <Zap className="w-3 h-3 ml-2" />
            <span>5 aggregate RPCs + up to 10 auth lookups per refresh</span>
          </div>
        </>
      )}
    </div>
  );
}
