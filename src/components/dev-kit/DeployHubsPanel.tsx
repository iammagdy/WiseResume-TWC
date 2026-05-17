import { useState, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, Rocket, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { cn } from '@/lib/utils';

interface HubResult {
  hub: string;
  status: 'deployed' | 'failed' | 'skipped';
  deploymentId?: string;
  error?: string;
}

interface DeployResponse {
  ok: boolean;
  results: HubResult[];
  summary: { deployed: number; failed: number; skipped: number };
}

export function DeployHubsPanel() {
  const [state, setState] = useState<'idle' | 'deploying' | 'done'>('idle');
  const [results, setResults] = useState<HubResult[]>([]);
  const [summary, setSummary] = useState<DeployResponse['summary'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const deploy = async () => {
    setState('deploying');
    setResults([]);
    setSummary(null);
    setError(null);
    abortRef.current = false;

    try {
      const result = await appwriteFunctions.invoke<DeployResponse>(
        'admin-deploy-hubs',
        devKitInvokeOptions({ }),
      );

      if (result.error) {
        setError(result.error.message || 'Deployment failed');
        setState('done');
        return;
      }

      const data = result.data;
      if (!data) {
        setError('No response from deploy function');
        setState('done');
        return;
      }

      setResults(data.results ?? []);
      setSummary(data.summary ?? null);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('done');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
            <Rocket className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Deploy AI Hubs</h2>
            <p className="text-xs text-white/45">Clones GitHub, builds &amp; deploys all 18 Appwrite functions from latest main</p>
          </div>
        </div>

        <Button
          onClick={deploy}
          disabled={state === 'deploying'}
          className="w-full h-12 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 disabled:opacity-60"
        >
          {state === 'deploying' ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deploying… this takes ~5 minutes</>
          ) : (
            <><Rocket className="mr-2 h-4 w-4" />Deploy All Hubs</>
          )}
        </Button>

        {state === 'deploying' && (
          <p className="text-center text-xs text-white/40">
            The function is running on Appwrite's servers. Don't close this tab.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Deployed" value={summary.deployed} color="emerald" />
          <Stat label="Failed" value={summary.failed} color="red" />
          <Stat label="Skipped" value={summary.skipped} color="white" />
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
          {results.map(r => (
            <div key={r.hub} className="flex items-center gap-3 px-4 py-3">
              {r.status === 'deployed' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {r.status === 'failed'   && <XCircle      className="h-4 w-4 shrink-0 text-red-400" />}
              {r.status === 'skipped' && <SkipForward   className="h-4 w-4 shrink-0 text-white/30" />}
              <span className={cn(
                'flex-1 font-mono text-sm',
                r.status === 'deployed' ? 'text-white'     :
                r.status === 'failed'   ? 'text-red-300'   : 'text-white/35',
              )}>
                {r.hub}
              </span>
              {r.deploymentId && (
                <span className="font-mono text-[10px] text-white/25">{r.deploymentId.slice(0, 8)}</span>
              )}
              {r.error && (
                <span className="max-w-[200px] truncate text-xs text-red-400" title={r.error}>{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'red' | 'white' }) {
  const cls = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    red:     'border-red-500/20 bg-red-500/10 text-red-400',
    white:   'border-white/10 bg-white/5 text-white/50',
  }[color];
  return (
    <div className={cn('rounded-xl border p-3 text-center', cls)}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}
