import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { devKitCall, type DevKitError } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';

interface RuntimeReceipt {
  requestId: string;
  executionId: string | null;
  hub: string;
  feature: string;
  provider: string;
  model: string;
  status: string;
  httpStatus: number;
  latencyMs: number;
  fallback: boolean;
  adminTest: boolean;
  userRef: string;
  creditsCharged: number;
  idempotencyState: string;
  errorClass: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface EvidenceData {
  receipts: RuntimeReceipt[];
  total: number;
  missingCollection: boolean;
  fetchError: string | null;
}

export function AIRuntimeEvidencePanel() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [requestId, setRequestId] = useState('');
  const [feature, setFeature] = useState('');
  const [hub, setHub] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DevKitError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<EvidenceData>({
      action: 'list-ai-runtime-receipts',
      payload: {
        limit: 50,
        ...(requestId.trim() ? { request_id: requestId.trim() } : {}),
        ...(feature ? { feature } : {}),
        ...(hub ? { hub } : {}),
        ...(status ? { status } : {}),
        since: new Date(Date.now() - (range === '24h' ? 86400000 : range === '7d' ? 7 * 86400000 : 30 * 86400000)).toISOString(),
      },
    });
    if (result.ok) setData(result.data);
    else setError(result.error);
    setLoading(false);
  }, [feature, hub, range, requestId, status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white"><ClipboardList size={17} /> AI QA Evidence</h2>
            <p className="mt-1 text-xs text-white/45">Metadata-only, read-only receipts. Prompts, outputs, headers, tokens, and raw user IDs are never displayed.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="rounded-xl">
            {loading ? <MiniSpinner size={14} className="mr-2" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />} Refresh
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input value={requestId} onChange={event => setRequestId(event.target.value)} placeholder="Server request ID" aria-label="Filter by request ID" />
          <select value={hub} onChange={event => setHub(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All hubs</option><option value="ai-gateway">ai-gateway</option><option value="resume-section-ai">resume-section-ai</option><option value="job-import">job-import</option>
          </select>
          <select value={feature} onChange={event => setFeature(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All features</option><option value="agentic-chat">agentic-chat</option><option value="resume-section-ai">resume-section-ai</option><option value="parse-job">parse-job</option>
          </select>
          <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All states</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cached">Cached</option>
          </select>
          <select value={range} onChange={event => setRange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by time range">
            <option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {error && <DevKitErrorCard error={error.message} title="AI QA evidence failed to load" onRetry={load} context={{ panel: 'AI QA Evidence', action: 'list-ai-runtime-receipts', httpStatus: error.status }} />}
      {data?.missingCollection && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">The receipt schema has not been provisioned yet. No production change was made by this panel.</div>}
      {data?.fetchError && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">Receipt metadata could not be read safely: {data.fetchError}</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-white/45"><span>Retained evidence</span><span>{data?.total ?? 0} record(s)</span></div>
        {loading && !data ? <div className="flex min-h-40 items-center justify-center"><MiniSpinner size={20} /></div> : (data?.receipts.length ?? 0) === 0 ? <div className="p-6 text-sm text-white/40">No matching runtime receipts are retained.</div> : (
          <div className="divide-y divide-white/5">
            {data?.receipts.map(receipt => <div key={receipt.requestId} className="grid gap-2 px-5 py-4 text-xs md:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr]">
              <div><p className="font-mono text-white/80">{receipt.requestId}</p><p className="mt-1 text-white/35">{receipt.userRef} · {receipt.idempotencyState}</p></div>
              <div><p className="font-semibold text-white/80">{receipt.hub}</p><p className="mt-1 text-white/35">{receipt.feature}</p></div>
              <div><p className="text-white/75">{receipt.provider}</p><p className="mt-1 truncate text-white/35" title={receipt.model}>{receipt.model}</p></div>
              <div><p className={receipt.status === 'completed' ? 'text-emerald-300' : receipt.status === 'failed' ? 'text-red-300' : 'text-amber-200'}>{receipt.status} · HTTP {receipt.httpStatus || '—'}</p><p className="mt-1 text-white/35">{receipt.latencyMs}ms · {receipt.creditsCharged} credit(s)</p></div>
              <div><p className="text-white/65">{receipt.completedAt ? new Date(receipt.completedAt).toLocaleString() : '—'}</p><p className="mt-1 text-white/35">{receipt.errorClass || (receipt.fallback ? 'fallback used' : 'primary path')}</p></div>
            </div>)}
          </div>
        )}
      </div>
      <p className="flex items-center gap-2 text-[11px] text-white/35"><ShieldCheck size={13} /> Receipts are server-generated and may include a platform execution ID only when Appwrite makes one available to the runtime.</p>
    </div>
  );
}
