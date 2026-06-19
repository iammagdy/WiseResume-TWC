import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { BrainCircuit, KeyRound, Route, RefreshCw, CheckCircle2, XCircle, BarChart3, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall, type DevKitError } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { useVisibleInterval } from '@/lib/devkit/hooks';
import { cn } from '@/lib/utils';
import { AIKeysPanel } from './AIKeysPanel';
import { AIRoutingSwitcher } from './AIRoutingSwitcher';
import { DevKitTabBar } from './DevKitUI';

// ─── Types ────────────────────────────────────────────────────────────────────

type AISubTab = 'overview' | 'keys' | 'routing';

interface ProviderPing {
  provider: string;
  ok: boolean;
  latencyMs: number | null;
  httpStatus: number;
}

interface MissionControlAI {
  providerPings: ProviderPing[];
  openrouterConfigured: boolean;
  groqConfigured: boolean;
  anyProviderOk: boolean;
  allProvidersOk: boolean;
}

interface MissionControlData {
  checkedAt: string;
  ai: MissionControlAI;
}

interface UsageStats {
  total: number;
  openrouter: number;
  groq: number;
  deepseek: number;
  nvidia: number;
}

interface Execution {
  $id: string;
  status: string;
  $createdAt: string;
}

interface AiActivityData {
  executions: Execution[];
  usageStats: UsageStats;
  missingUsageCollection: boolean;
  executionsFetchError: string | null;
  usageFetchError: string | null;
}

// ─── Provider display config ──────────────────────────────────────────────────

const PROVIDER_DISPLAY: Record<string, { label: string; color: string; border: string; bg: string }> = {
  openrouter: { label: 'OpenRouter', color: 'text-blue-400',   border: 'border-blue-500/20',   bg: 'bg-blue-500/5' },
  groq:       { label: 'Groq',       color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
  deepseek:   { label: 'DeepSeek',   color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
  nvidia:     { label: 'NVIDIA',     color: 'text-green-400',  border: 'border-green-500/20',  bg: 'bg-green-500/5' },
};

// ─── Sub-tab config ────────────────────────────────────────────────────────────

const TABS: { id: AISubTab; label: string; Icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview',       Icon: BrainCircuit },
  { id: 'keys',     label: 'Keys & Models',  Icon: KeyRound },
  { id: 'routing',  label: 'Routing',        Icon: Route },
];

// ─── Overview tab ─────────────────────────────────────────────────────────────

function AIOverviewTab() {
  const [mcData, setMcData] = useState<MissionControlData | null>(null);
  const [mcError, setMcError] = useState<DevKitError | null>(null);
  const [mcLoading, setMcLoading] = useState(true);

  const [actData, setActData] = useState<AiActivityData | null>(null);
  const [actError, setActError] = useState<DevKitError | null>(null);
  const [actLoading, setActLoading] = useState(true);

  const fetchMissionControl = useCallback(async () => {
    setMcLoading(true);
    setMcError(null);
    const result = await devKitCall<MissionControlData>({ action: 'mission-control' });
    if (result.ok) setMcData(result.data);
    else setMcError(result.error);
    setMcLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    setActLoading(true);
    setActError(null);
    const result = await devKitCall<AiActivityData>({ action: 'list-ai-gateway-activity', payload: { limit: 10 } });
    if (result.ok) setActData(result.data);
    else setActError(result.error);
    setActLoading(false);
  }, []);

  const fetchAll = useCallback(() => {
    void fetchMissionControl();
    void fetchActivity();
  }, [fetchMissionControl, fetchActivity]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useVisibleInterval(fetchAll, 30000);

  const loading = mcLoading && actLoading;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <MiniSpinner size={20} />
          <span className="text-sm font-semibold">Loading AI Overview…</span>
        </div>
      </div>
    );
  }

  const providerPings = mcData?.ai.providerPings ?? [];
  const stats = actData?.usageStats ?? { total: 0, openrouter: 0, groq: 0, deepseek: 0, nvidia: 0 };
  const executions = actData?.executions ?? [];
  const totalTracked = stats.openrouter + stats.groq + stats.deepseek + stats.nvidia;

  return (
    <div className="space-y-6">
      {/* Refresh row */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Provider Health</p>
          {mcData?.checkedAt && (
            <p className="text-[10px] text-white/25 font-mono">
              Last checked {new Date(mcData.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={fetchAll}
          disabled={mcLoading || actLoading}
          className="rounded-xl"
        >
          {(mcLoading || actLoading) ? <MiniSpinner size={14} className="mr-2" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Mission control error */}
      {mcError && !mcData && (
        <DevKitErrorCard
          error={mcError.message}
          title="Provider health check failed"
          onRetry={fetchMissionControl}
          context={{ panel: 'AI Center / Overview', action: 'mission-control', httpStatus: mcError.status }}
        />
      )}

      {/* Provider health cards — from mission-control providerPings */}
      {(providerPings.length > 0 || mcData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(['openrouter', 'groq', 'deepseek', 'nvidia'] as const).map(provId => {
            const ping = providerPings.find(p => p.provider === provId);
            const display = PROVIDER_DISPLAY[provId];
            const notConfigured = !ping || ping.httpStatus === 0;
            const ok = ping?.ok ?? false;

            return (
              <div
                key={provId}
                className={cn(
                  'rounded-2xl border p-4 space-y-3 transition-all',
                  notConfigured ? 'border-white/10 bg-white/[0.02]'
                  : ok ? `${display.border} ${display.bg}`
                  : 'border-red-500/20 bg-red-500/5',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-[10px] font-black uppercase tracking-widest', display.color)}>
                    {display.label}
                  </span>
                  {notConfigured ? (
                    <span className="text-[9px] uppercase font-mono text-white/25">not configured</span>
                  ) : ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <div>
                  {notConfigured ? (
                    <p className="text-lg font-black text-white/20">—</p>
                  ) : ok ? (
                    <p className="text-lg font-black text-white">
                      {ping?.latencyMs != null ? `${ping.latencyMs}ms` : 'OK'}
                    </p>
                  ) : (
                    <p className="text-lg font-black text-red-400">
                      {ping?.httpStatus ? `HTTP ${ping.httpStatus}` : 'Error'}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {notConfigured ? 'API key not set' : ok ? 'Ping successful' : 'Ping failed'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity error */}
      {actError && !actData && (
        <DevKitErrorCard
          error={actError.message}
          title="Activity data failed to load"
          onRetry={fetchActivity}
          context={{ panel: 'AI Center / Overview', action: 'list-ai-gateway-activity', httpStatus: actError.status }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic distribution */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-white/40" /> Traffic Distribution
            <span className="text-[10px] text-white/25 font-normal ml-auto">last 50 calls</span>
          </h3>
          {actData?.usageFetchError ? (
            <DevKitErrorCard
              error={actData.usageFetchError}
              title="Usage data fetch failed"
              onRetry={fetchActivity}
              compact
              context={{ panel: 'AI Center / Overview', action: 'list-ai-gateway-activity' }}
            />
          ) : actData?.missingUsageCollection ? (
            <p className="text-xs text-white/30 italic">ai_usage_logs collection not found.</p>
          ) : totalTracked === 0 ? (
            <p className="text-xs text-white/30 italic">No usage data in ai_usage_logs yet.</p>
          ) : (
            <div className="space-y-4">
              {(['openrouter', 'groq', 'deepseek', 'nvidia'] as const).map(provId => {
                const count = stats[provId];
                const display = PROVIDER_DISPLAY[provId];
                const percent = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
                if (count === 0) return null;
                return (
                  <div key={provId} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
                      <span>{display.label}</span>
                      <span>{percent}% <span className="text-white/30 font-normal">({count})</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', display.color.replace('text-', 'bg-').replace('-400', '-500'))}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent executions */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-white/40" /> Recent Executions
          </h3>
          {actData?.executionsFetchError ? (
            <DevKitErrorCard
              error={actData.executionsFetchError}
              title="Execution log fetch failed"
              onRetry={fetchActivity}
              compact
              context={{ panel: 'AI Center / Overview', action: 'list-ai-gateway-activity' }}
            />
          ) : executions.length === 0 ? (
            <p className="text-xs text-white/30 italic">No recent AI gateway executions.</p>
          ) : (
            <div className="space-y-2">
              {executions.map(e => (
                <div key={e.$id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px]">
                  <span className="text-white/40 flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(e.$createdAt).toLocaleTimeString()}
                  </span>
                  <span className="text-white/30">{e.$id.slice(-8)}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full',
                    e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                  )}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AICommandCenterPanel() {
  const [activeTab, setActiveTab] = useState<AISubTab>('overview');

  return (
    <div className="space-y-6">
      <DevKitTabBar
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab content */}
      {activeTab === 'overview' && <AIOverviewTab />}
      {activeTab === 'keys'     && <AIKeysPanel />}
      {activeTab === 'routing'  && <AIRoutingSwitcher />}
    </div>
  );
}
