import { useCallback, useEffect, useMemo, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, GitCommit, RefreshCw, Rocket, Search, TerminalSquare, Wrench, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse } from '@/lib/devkit/appwriteResponse';
import { cn } from '@/lib/utils';
import sourceHashManifest from '@/lib/devkit/sourceHashes.generated.json';

interface DeployStatus {
  ready: boolean;
  missing?: string[];
}

interface HubResult {
  hub: string;
  status: 'deployed' | 'failed' | 'skipped';
  deploymentId?: string;
  error?: string;
}

interface DeployResponse {
  results: HubResult[];
  summary: { deployed: number; failed: number; skipped: number };
}

interface FunctionRow {
  id: string;
  name: string;
  enabled: boolean;
  runtime: string;
  deployment: string | null;
  updatedAt: string | null;
}

interface ExecutionRow {
  id: string;
  status: string;
  trigger: string;
  duration: number | null;
  responseStatusCode: number | null;
  createdAt: string | null;
}

interface ExecutionDetail extends ExecutionRow {
  logs: string;
  errors: string;
}

type TabId = 'functions' | 'logs';

function formatTimestamp(value: string | null) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
}

const SOURCE_HASHES = sourceHashManifest.hashes as Record<string, string | null>;

type DriftStatus = 'in-sync' | 'needs-redeploy' | 'unknown';

export function DeployHubsPanel() {
  const [tab, setTab] = useState<TabId>('functions');
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [functions, setFunctions] = useState<FunctionRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DeployResponse['summary'] | null>(null);
  const [results, setResults] = useState<HubResult[]>([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [executionDetail, setExecutionDetail] = useState<ExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deployedHashes, setDeployedHashes] = useState<Record<string, string>>({});

  const filteredFunctions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return functions;
    return functions.filter(fn => fn.id.toLowerCase().includes(query) || fn.name.toLowerCase().includes(query));
  }, [functions, search]);

  const loadFunctions = async (searchValue = search) => {
    setLoading(true);
    setError(null);
    try {
      const [statusTuple, listTuple, hashTuple] = await Promise.all([
        appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({ action: 'deploy-hubs-status' })),
        appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({ action: 'list-functions', search: searchValue })),
        appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({ action: 'get-deployed-hashes' })).catch(() => null),
      ]);
      const statusData = unwrapAdminResponse<DeployStatus>(statusTuple, 'admin-devkit-data');
      const listData = unwrapAdminResponse<{ functions: FunctionRow[] }>(listTuple, 'admin-devkit-data');
      setStatus(statusData);
      setFunctions(listData.functions ?? []);
      setSelectedIds(prev => prev.filter(id => (listData.functions ?? []).some(fn => fn.id === id)));
      if (!selectedFunctionId && (listData.functions ?? []).length > 0) {
        setSelectedFunctionId(listData.functions[0].id);
      }
      if (hashTuple) {
        try {
          const hashData = unwrapAdminResponse<{ hashes: Record<string, string> }>(hashTuple, 'admin-devkit-data');
          setDeployedHashes(hashData.hashes ?? {});
        } catch { /* non-critical */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Appwrite Functions');
    } finally {
      setLoading(false);
    }
  };

  const getDriftStatus = useCallback((hubId: string): DriftStatus => {
    const currentHash = SOURCE_HASHES[hubId];
    if (!currentHash) return 'unknown';
    const deployedHash = deployedHashes[hubId];
    if (!deployedHash) return 'needs-redeploy';
    return currentHash === deployedHash ? 'in-sync' : 'needs-redeploy';
  }, [deployedHashes]);

  const recordDeployedHash = useCallback(async (hubId: string) => {
    const currentHash = SOURCE_HASHES[hubId];
    if (!currentHash) return;
    try {
      await appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({
        action: 'set-deployed-hash',
        hubId,
        hash: currentHash,
      }));
      setDeployedHashes(prev => ({ ...prev, [hubId]: currentHash }));
    } catch { /* non-critical — hash recording is best-effort */ }
  }, []);

  const loadExecutions = async (functionId: string) => {
    if (!functionId) return;
    setExecutionsLoading(true);
    setExecutionDetail(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({
        action: 'list-function-executions',
        functionId,
        limit: 12,
      }));
      const data = unwrapAdminResponse<{ executions: ExecutionRow[] }>(tuple, 'admin-devkit-data');
      setExecutions(data.executions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setExecutionsLoading(false);
    }
  };

  const loadExecutionDetail = async (functionId: string, executionId: string) => {
    setDetailLoading(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', devKitInvokeOptions({
        action: 'get-execution-log',
        functionId,
        executionId,
      }));
      const data = unwrapAdminResponse<{ execution: ExecutionDetail }>(tuple, 'admin-devkit-data');
      setExecutionDetail(data.execution ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution detail');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadFunctions('');
  }, []);

  useEffect(() => {
    if (tab === 'logs' && selectedFunctionId) {
      void loadExecutions(selectedFunctionId);
    }
  }, [tab, selectedFunctionId]);

  const toggleSelection = (functionId: string) => {
    setSelectedIds(prev => prev.includes(functionId) ? prev.filter(id => id !== functionId) : [...prev, functionId]);
  };

  const deploy = async (hubs: string[] | null, label: string) => {
    if (!status?.ready) {
      setError('This function deploys all others. If it breaks, use Appwrite Console to redeploy manually.');
      return;
    }
    if (!window.confirm(`Proceed with ${label}?`)) return;
    setDeploying(true);
    setError(null);
    setSummary(null);
    setResults([]);
    try {
      const tuple = await appwriteFunctions.invoke('admin-deploy-hubs', devKitInvokeOptions(hubs ? { hubs } : {}));
      const data = unwrapAdminResponse<DeployResponse>(tuple, 'admin-deploy-hubs');
      setSummary(data.summary ?? null);
      setResults(data.results ?? []);
      // Record deployed hash for each successfully deployed hub
      const deployedHubs = (data.results ?? []).filter(r => r.status === 'deployed').map(r => r.hub);
      await Promise.allSettled(deployedHubs.map(hubId => recordDeployedHash(hubId)));
      await loadFunctions(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
                <Wrench className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Appwrite Functions</h2>
                <p className="text-xs text-white/45">Browse functions, redeploy safely, and inspect recent execution logs.</p>
              </div>
            </div>
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              This function deploys all others. If it breaks, use Appwrite Console to redeploy manually.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'functions' ? 'default' : 'outline'} onClick={() => setTab('functions')} className="rounded-xl">
              <Rocket className="mr-2 h-4 w-4" /> Functions
            </Button>
            <Button variant={tab === 'logs' ? 'default' : 'outline'} onClick={() => setTab('logs')} className="rounded-xl">
              <TerminalSquare className="mr-2 h-4 w-4" /> Logs
            </Button>
            <Button variant="outline" onClick={() => void loadFunctions(search)} disabled={loading || deploying} className="rounded-xl">
              {loading ? <MiniSpinner size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {!status?.ready && !loading && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Missing server variables on <span className="font-mono">admin-deploy-hubs</span>: {(status?.missing ?? []).join(', ') || 'unknown'}.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Deployed" value={summary.deployed} color="emerald" />
          <Stat label="Failed" value={summary.failed} color="red" />
          <Stat label="Skipped" value={summary.skipped} color="white" />
        </div>
      )}

      {tab === 'functions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 sm:min-w-[260px]">
              <Search className="h-4 w-4 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search functions"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
            <Button onClick={() => void loadFunctions(search)} variant="outline" className="rounded-xl">Apply Search</Button>
            <Button onClick={() => void deploy(selectedIds, `redeploying ${selectedIds.length} selected function(s)`)} disabled={deploying || selectedIds.length === 0 || !status?.ready} className="rounded-xl bg-blue-600 hover:bg-blue-500">
              {deploying ? <MiniSpinner size={16} className="mr-2" /> : <Rocket className="mr-2 h-4 w-4" />}
              Redeploy Selected
            </Button>
            <Button onClick={() => void deploy(null, 'deploying all functions')} disabled={deploying || !status?.ready} variant="outline" className="rounded-xl">
              Deploy All
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/45">
                <MiniSpinner size={18} className="mx-auto mb-3" />
                Loading function inventory…
              </div>
            ) : filteredFunctions.map(fn => {
              const drift = getDriftStatus(fn.id);
              const currentHash = SOURCE_HASHES[fn.id];
              return (
              <div key={fn.id} className={cn('rounded-2xl border p-4', drift === 'needs-redeploy' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-white/[0.03]')}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(fn.id)}
                      onChange={() => toggleSelection(fn.id)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-white">{fn.id}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', fn.enabled ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300')}>
                          {fn.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {drift === 'needs-redeploy' && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            Needs Redeploy
                          </span>
                        )}
                        {drift === 'in-sync' && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            In Sync
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/45">{fn.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-white/55">
                        <span>Runtime: <span className="font-mono text-white/75">{fn.runtime}</span></span>
                        <span>Deployment: <span className="font-mono text-white/75">{fn.deployment ?? 'None'}</span></span>
                        <span>Updated: <span className="text-white/75">{formatTimestamp(fn.updatedAt)}</span></span>
                        {currentHash && (
                          <span title="Current source hash (first 16 chars of SHA-256)">
                            Hash: <span className="font-mono text-white/55">{currentHash}</span>
                            {deployedHashes[fn.id] && deployedHashes[fn.id] !== currentHash && (
                              <span className="ml-1 text-amber-400" title={`Deployed: ${deployedHashes[fn.id]}`}>(deployed: {deployedHashes[fn.id]})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => { setTab('logs'); setSelectedFunctionId(fn.id); }} className="rounded-xl">
                      <FileText className="mr-2 h-4 w-4" /> Logs
                    </Button>
                    {drift === 'in-sync' && currentHash && (
                      <Button variant="outline" onClick={() => void recordDeployedHash(fn.id)} className="rounded-xl text-white/50" title="Mark current source hash as deployed">
                        <GitCommit className="mr-2 h-4 w-4" /> Mark Deployed
                      </Button>
                    )}
                    <Button onClick={() => void deploy([fn.id], `redeploying ${fn.id}`)} disabled={deploying || !status?.ready} className="rounded-xl bg-blue-600 hover:bg-blue-500">
                      <Rocket className="mr-2 h-4 w-4" /> Redeploy
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/35">Function</label>
              <select
                value={selectedFunctionId}
                onChange={e => setSelectedFunctionId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              >
                {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.id}</option>)}
              </select>
            </div>
            <Button onClick={() => void loadExecutions(selectedFunctionId)} disabled={!selectedFunctionId || executionsLoading} variant="outline" className="w-full rounded-xl">
              {executionsLoading ? <MiniSpinner size={16} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Executions
            </Button>
            <div className="space-y-2">
              {executions.map(execution => (
                <button
                  key={execution.id}
                  onClick={() => void loadExecutionDetail(selectedFunctionId, execution.id)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white">{execution.id.slice(0, 10)}</span>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/55">
                    <span>{execution.status}</span>
                    <span>{execution.responseStatusCode ?? '—'}</span>
                    <span>{execution.duration ?? '—'}ms</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/35">{formatTimestamp(execution.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {detailLoading ? (
              <div className="py-10 text-center text-white/45">
                <MiniSpinner size={18} className="mx-auto mb-3" />
                Loading execution details…
              </div>
            ) : executionDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-white">{executionDetail.id}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/65">{executionDetail.status}</span>
                  <span className="text-xs text-white/45">{executionDetail.duration ?? '—'}ms</span>
                  <span className="text-xs text-white/45">HTTP {executionDetail.responseStatusCode ?? '—'}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/35">Logs</p>
                  <pre className="max-h-[280px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/75 whitespace-pre-wrap">
                    {executionDetail.logs || 'No logs returned.'}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/35">Errors</p>
                  <pre className="max-h-[200px] overflow-auto rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200 whitespace-pre-wrap">
                    {executionDetail.errors || 'No errors returned.'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-white/35">
                Select a recent execution to inspect its logs.
              </div>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
          {results.map(result => (
            <div key={result.hub} className="flex items-center gap-3 px-4 py-3">
              {result.status === 'deployed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
              {result.status === 'skipped' && <AlertTriangle className="h-4 w-4 text-white/35" />}
              <span className="flex-1 font-mono text-sm text-white">{result.hub}</span>
              {result.deploymentId && <span className="font-mono text-[10px] text-white/30">{result.deploymentId.slice(0, 8)}</span>}
              {result.error && <span className="max-w-[240px] truncate text-xs text-red-300">{result.error}</span>}
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
    red: 'border-red-500/20 bg-red-500/10 text-red-400',
    white: 'border-white/10 bg-white/5 text-white/50',
  }[color];

  return (
    <div className={cn('rounded-xl border p-3 text-center', cls)}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}
