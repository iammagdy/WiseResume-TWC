import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Activity, BarChart3, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devKitCall, type DevKitError } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';
import { useVisibleInterval } from '@/lib/devkit/hooks';
import { cn } from '@/lib/utils';

interface Execution {
  $id: string;
  status: string;
  trigger?: string;
  duration?: number;
  $createdAt: string;
}

interface UsageStats {
  total: number;
  openrouter: number;
  groq: number;
  deepseek: number;
  nvidia: number;
}

interface AiActivityData {
  executions: Execution[];
  usageStats: UsageStats;
  missingUsageCollection: boolean;
  executionsFetchError: string | null;
  usageFetchError: string | null;
}

export const AIRadarPanel = () => {
  const [data, setData] = useState<AiActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DevKitError | null>(null);

  const fetchRadar = useCallback(async () => {
    setError(null);
    const result = await devKitCall<AiActivityData>({ action: 'list-ai-gateway-activity', payload: { limit: 10 } });
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRadar(); }, [fetchRadar]);
  useVisibleInterval(fetchRadar, 15000);

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <MiniSpinner size={20} />
          <span className="text-sm font-semibold">Loading AI Radar…</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <DevKitErrorCard
        error={error.message}
        title="AI Radar failed to load"
        onRetry={fetchRadar}
        context={{ panel: 'AI Radar', function: 'admin-devkit-data', action: 'list-ai-gateway-activity', httpStatus: error.status }}
      />
    );
  }

  const stats = data?.usageStats ?? { total: 0, openrouter: 0, groq: 0, deepseek: 0, nvidia: 0 };
  const executions = data?.executions ?? [];
  const totalTracked = stats.openrouter + stats.groq + stats.deepseek + stats.nvidia;

  return (
    <div className="space-y-6">
      {error && data && (
        <DevKitErrorCard
          error={error.message}
          title="Last AI Radar refresh failed"
          onRetry={fetchRadar}
          compact
          context={{ panel: 'AI Radar', action: 'list-ai-gateway-activity', httpStatus: error.status }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RadarCard label="Total AI Calls" value={stats.total > 0 ? String(stats.total) : '—'} icon={<ShieldCheck className="text-emerald-400" size={18} />} />
        <RadarCard label="Groq" value={stats.groq > 0 ? String(stats.groq) : '—'} icon={<Zap className="text-orange-400" size={18} />} />
        <RadarCard label="OpenRouter" value={stats.openrouter > 0 ? String(stats.openrouter) : '—'} icon={<Zap className="text-blue-400" size={18} />} />
        <RadarCard label="DeepSeek" value={stats.deepseek > 0 ? String(stats.deepseek) : '—'} icon={<Zap className="text-purple-400" size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold flex items-center gap-2">
              <BarChart3 size={20} /> Traffic Distribution
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchRadar} disabled={loading} className="h-7 px-2 text-white/40 hover:text-white">
              {loading ? <MiniSpinner size={14} /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {data?.usageFetchError ? (
            <DevKitErrorCard
              error={data.usageFetchError}
              title="Usage data fetch failed"
              onRetry={fetchRadar}
              compact
              context={{ panel: 'AI Radar', action: 'list-ai-gateway-activity' }}
            />
          ) : data?.missingUsageCollection ? (
            <p className="text-xs text-white/30 italic">ai_usage_logs collection not found — no traffic data available.</p>
          ) : totalTracked === 0 ? (
            <p className="text-xs text-white/30 italic">No recent usage data in ai_usage_logs.</p>
          ) : (
            <div className="space-y-6">
              <ProgressBar label="OpenRouter" count={stats.openrouter} total={totalTracked} color="bg-blue-500" />
              <ProgressBar label="Groq" count={stats.groq} total={totalTracked} color="bg-orange-500" />
              <ProgressBar label="DeepSeek" count={stats.deepseek} total={totalTracked} color="bg-purple-500" />
              {stats.nvidia > 0 && (
                <ProgressBar label="NVIDIA" count={stats.nvidia} total={totalTracked} color="bg-green-500" />
              )}
            </div>
          )}
        </div>

        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6"><Activity size={20} /> Recent Executions</h3>
          {data?.executionsFetchError ? (
            <DevKitErrorCard
              error={data.executionsFetchError}
              title="Execution log fetch failed"
              onRetry={fetchRadar}
              compact
              context={{ panel: 'AI Radar', action: 'list-ai-gateway-activity' }}
            />
          ) : executions.length === 0 ? (
            <p className="text-xs text-white/30 italic">No recent AI gateway executions found.</p>
          ) : (
            <div className="space-y-3">
              {executions.map(e => (
                <div key={e.$id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px]">
                  <span className="text-white/40">{new Date(e.$createdAt).toLocaleTimeString()}</span>
                  <span className="text-white/50">{e.$id.slice(-8)}</span>
                  <span className={`px-2 py-0.5 rounded-full ${e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
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
};

function RadarCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-white/5">{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{label}</p>
        <p className="text-lg font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
        <span>{label}</span>
        <span>{percent}% <span className="text-white/30 font-normal">({count})</span></span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
