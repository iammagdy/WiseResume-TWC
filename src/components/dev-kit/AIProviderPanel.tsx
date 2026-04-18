import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Check, Zap, DollarSign, RefreshCw, Cpu, ChevronDown, ChevronRight,
  Info, AlertTriangle, PlayCircle, Loader2, ShieldCheck, ShieldAlert, ShieldX,
  Map,
} from 'lucide-react';
import { useSettingsStore, WiseresumeSubProvider } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type ProviderTab = 'openrouter' | 'groq' | 'gemini' | 'ollama';

interface ORModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  isFree: boolean;
}

interface ORModelRaw {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
}

interface GroqModel {
  id: string;
  owned_by?: string;
  context_window?: number;
}

interface GeminiModel {
  id: string;
  name: string;
  context: number | null;
}

interface OllamaModel {
  name: string;
  size?: number;
}

interface OllamaTagsResponse {
  models?: OllamaModel[];
}

interface BreakerRow {
  provider: string;
  failure_count: number;
  opened_until: string | null;
  last_failure_at: string | null;
  is_open: boolean;
}

interface BreakerStatusResponse {
  now: string;
  providers: BreakerRow[];
}

interface ManagedORData {
  label?: string;
  usage?: number;
  limit?: number | null;
  is_free_tier?: boolean;
  rate_limit?: { requests: number; interval: string } | null;
}

interface ManagedORStatus {
  configured: boolean;
  data?: ManagedORData | null;
  error?: string;
}

interface ManagedGroqStatus {
  configured: boolean;
  models: GroqModel[];
  error?: string;
}

interface GroqUsage {
  configured: boolean;
  requests_today?: number;
  requests_limit?: number;
  tokens_today?: number;
  tokens_limit?: number;
  error?: string;
}

interface ManagedGeminiStatus {
  configured: boolean;
  models: GeminiModel[];
  error?: string;
}

interface AITestResponse {
  success?: boolean;
  model?: string;
  latencyMs?: number;
  response?: string;
  preview?: string;
  error?: string;
}

interface OllamaGenerateResponse {
  response?: string;
}

interface GeminiTestResponse {
  success: boolean;
  model?: string;
  latencyMs?: number;
  preview?: string;
  error?: string;
}

interface TestState {
  status: 'idle' | 'running' | 'done' | 'error';
  latencyMs?: number;
  preview?: string;
  model?: string;
  error?: string;
}

// ── Provider ID constants (match ai_provider_breaker table keys) ───────────────

const BREAKER_ID = {
  openrouter: 'wiseresume/openrouter',
  groq: 'wiseresume/groq',
  gemini: 'gemini_global',
  ollama: null, // local — not tracked in breaker
} as const;

// ── Static fallbacks ───────────────────────────────────────────────────────────

const GEMINI_MODELS_FALLBACK: GeminiModel[] = [
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview', context: 1_000_000 },
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview', context: 1_000_000 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: 1_000_000 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: 2_000_000 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: 1_000_000 },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', context: 32_768 },
];

const GROQ_CONTEXT_FALLBACK: Record<string, number> = {
  'llama-3.3-70b-versatile': 128_000,
  'llama-3.1-8b-instant': 128_000,
  'llama3-8b-8192': 8_192,
  'llama3-70b-8192': 8_192,
  'mixtral-8x7b-32768': 32_768,
  'gemma2-9b-it': 8_192,
  'qwen/qwen3-32b': 32_768,
  'deepseek-r1-distill-llama-70b': 128_000,
  'meta-llama/llama-4-scout-17b-16e-instruct': 131_072,
  'meta-llama/llama-4-maverick-17b-128e-instruct': 131_072,
};

const GROQ_MODELS_FALLBACK: GroqModel[] = Object.entries(GROQ_CONTEXT_FALLBACK).map(([id, ctx]) => ({
  id,
  context_window: ctx,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCtx(n?: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ctx`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ctx`;
  return `${n} ctx`;
}

async function fetchWithToken(url: string, options?: RequestInit): Promise<Response> {
  const token = await getSupabaseToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

function FreeBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
      <Zap className="w-2.5 h-2.5" />
      Free
    </span>
  );
}

function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <DollarSign className="w-2.5 h-2.5" />
      Paid
    </span>
  );
}

function BreakerChip({ row }: { row?: BreakerRow | null }) {
  if (!row) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border">
        <ShieldCheck className="w-3 h-3" />
        No breaker data
      </span>
    );
  }
  if (row.is_open && row.opened_until) {
    const secsLeft = Math.max(0, Math.ceil((new Date(row.opened_until).getTime() - Date.now()) / 1000));
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <ShieldX className="w-3 h-3" />
        Breaker OPEN — resets in {secsLeft}s
      </span>
    );
  }
  if ((row.failure_count ?? 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <ShieldAlert className="w-3 h-3" />
        {row.failure_count} recent failure{row.failure_count !== 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
      <ShieldCheck className="w-3 h-3" />
      Healthy
    </span>
  );
}

function BreakerBanner({ row }: { row?: BreakerRow | null }) {
  if (!row?.is_open) return null;
  const secsLeft = row.opened_until
    ? Math.max(0, Math.ceil((new Date(row.opened_until).getTime() - Date.now()) / 1000))
    : 0;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/8">
      <ShieldX className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
        <p className="font-semibold">Circuit breaker is OPEN</p>
        <p>
          This provider is failing fast until the breaker resets.
          {secsLeft > 0 && ` Resets in ~${secsLeft}s.`}
          {row.failure_count > 0 && ` (${row.failure_count} failures recorded)`}
        </p>
      </div>
    </div>
  );
}

function ConfirmCard({
  modelId,
  onConfirm,
  onCancel,
}: {
  modelId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-3 mb-1 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
      <p className="text-xs font-medium text-foreground">Switch active model to:</p>
      <p className="text-xs font-mono text-primary truncate">{modelId}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function TestBanner({
  state,
  onRun,
}: {
  state: TestState;
  onRun: () => void;
}) {
  const loading = state.status === 'running';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live test</p>
        <button
          onClick={onRun}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Testing…</>
          ) : (
            <><PlayCircle className="w-3 h-3" />Test</>
          )}
        </button>
      </div>
      {state.status === 'done' && (
        <div className="p-2.5 rounded-lg border border-green-500/20 bg-green-500/5 space-y-1">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {state.latencyMs}ms · {state.model ?? 'ok'}
            </span>
          </div>
          {state.preview && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2">{state.preview}</p>
          )}
        </div>
      )}
      {state.status === 'error' && (
        <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/5">
          <p className="text-xs text-destructive">{state.error ?? 'Test failed'}</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-provider selector ─────────────────────────────────────────────────────

const SUB_PROVIDER_OPTIONS: { value: WiseresumeSubProvider; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'OpenRouter → Groq fallback' },
  { value: 'openrouter', label: 'OpenRouter', desc: 'Route all calls via OpenRouter' },
  { value: 'groq', label: 'Groq', desc: 'Route all calls via Groq' },
];

type SubProviderHealth = 'healthy' | 'degraded' | 'open' | 'unknown';

function rowHealth(row: BreakerRow | null | undefined): SubProviderHealth {
  if (!row) return 'unknown';
  if (row.is_open) return 'open';
  if ((row.failure_count ?? 0) > 0) return 'degraded';
  return 'healthy';
}

function combinedAutoHealth(or: SubProviderHealth, groq: SubProviderHealth): SubProviderHealth {
  const known = [or, groq].filter(h => h !== 'unknown') as Exclude<SubProviderHealth, 'unknown'>[];
  if (known.length === 0) return 'unknown';
  if (known.every(h => h === 'open')) return 'open';
  if (known.every(h => h === 'healthy')) return 'healthy';
  return 'degraded';
}

function HealthDot({ health }: { health: SubProviderHealth }) {
  const cls =
    health === 'healthy' ? 'bg-green-500'
    : health === 'degraded' ? 'bg-amber-500'
    : health === 'open' ? 'bg-red-500'
    : 'bg-muted-foreground/40';
  const title =
    health === 'healthy' ? 'Healthy'
    : health === 'degraded' ? 'Degraded — recent failures'
    : health === 'open' ? 'Breaker open'
    : 'No breaker data';
  return (
    <span
      className={cn('inline-block w-1.5 h-1.5 rounded-full', cls)}
      title={title}
      aria-label={title}
    />
  );
}

function SubProviderSelector({
  current,
  onChange,
  breakerRows,
}: {
  current: WiseresumeSubProvider;
  onChange: (sub: WiseresumeSubProvider) => void;
  breakerRows: BreakerRow[] | null;
}) {
  const [pending, setPending] = useState<WiseresumeSubProvider | null>(null);

  const orHealth = rowHealth(breakerRows?.find(r => r.provider === BREAKER_ID.openrouter));
  const groqHealth = rowHealth(breakerRows?.find(r => r.provider === BREAKER_ID.groq));
  const healthByOption: Record<WiseresumeSubProvider, SubProviderHealth> = {
    auto: combinedAutoHealth(orHealth, groqHealth),
    openrouter: orHealth,
    groq: groqHealth,
  };

  const handleSelect = (sub: WiseresumeSubProvider) => {
    if (sub === current) return;
    setPending(sub);
  };

  const handleConfirm = () => {
    if (!pending) return;
    onChange(pending);
    setPending(null);
  };

  const handleCancel = () => setPending(null);

  const pendingOpt = pending ? SUB_PROVIDER_OPTIONS.find(o => o.value === pending) : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Managed AI sub-provider</p>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {SUB_PROVIDER_OPTIONS.map((opt, i) => {
          const isActive = opt.value === current;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5',
                i !== 0 && 'border-l border-border',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <HealthDot health={healthByOption[opt.value]} />
              {opt.label}
            </button>
          );
        })}
      </div>
      {pending && pendingOpt && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <p className="text-xs font-medium text-foreground">
            Switch managed sub-provider to{' '}
            <span className="font-semibold text-primary">{pendingOpt.label}</span>?
          </p>
          <p className="text-[11px] text-muted-foreground">{pendingOpt.desc}</p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feature routing section ────────────────────────────────────────────────────

const FEATURES = [
  { name: 'Resume Analysis', fn: 'enhance-resume' },
  { name: 'Resume Tailoring', fn: 'tailor-resume' },
  { name: 'Cover Letter', fn: 'write-cover-letter' },
  { name: 'Interview Prep', fn: 'interview-*' },
  { name: 'Agentic Chat', fn: 'agentic-chat' },
];

function FeatureRoutingSection({ subProvider }: { subProvider: WiseresumeSubProvider }) {
  const [open, setOpen] = useState(false);

  const routeLabel =
    subProvider === 'groq'
      ? 'Groq (qwen/qwen3-32b)'
      : subProvider === 'openrouter'
      ? 'OpenRouter (configured model)'
      : 'OpenRouter → Groq fallback';

  const routeColor =
    subProvider === 'groq'
      ? 'text-green-600 dark:text-green-400'
      : subProvider === 'openrouter'
      ? 'text-violet-600 dark:text-violet-400'
      : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Map className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Feature routing</span>
          <span className={cn('text-[10px] font-semibold', routeColor)}>{routeLabel}</span>
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {FEATURES.map(f => (
            <div key={f.name} className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-foreground">{f.name}</span>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-mono text-muted-foreground">{f.fn}</code>
                <span className={cn('text-[10px] font-semibold', routeColor)}>{routeLabel}</span>
              </div>
            </div>
          ))}
          <div className="px-3 py-2 bg-muted/20 text-[10px] text-muted-foreground">
            BYOK users bypass this route and use their own configured provider.
          </div>
        </div>
      )}
    </div>
  );
}

// ── OpenRouter sub-panel ───────────────────────────────────────────────────────

function OpenRouterPanel({
  breakerRow,
  managedStatus,
  onManagedRefresh,
}: {
  breakerRow?: BreakerRow | null;
  managedStatus: ManagedORStatus | null;
  onManagedRefresh: () => void;
}) {
  const { openrouterModel, setOpenrouterModel } = useSettingsStore();

  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const hasFetched = useRef(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: ORModelRaw[] };
      const list: ORModel[] = (json.data ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        pricing: { prompt: m.pricing?.prompt ?? '1', completion: m.pricing?.completion ?? '1' },
        context_length: m.context_length ?? 0,
        isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
      }));
      list.sort((a, b) => {
        if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setModels(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchModels();
    }
  }, [fetchModels]);

  const runTest = useCallback(async () => {
    setTestState({ status: 'running' });
    try {
      const res = await edgeFunctions.functions.invoke('ai-test', {
        body: { wiseresumeSubProvider: 'openrouter', adminPassword: getDevKitToken() },
      });
      if (res.error) throw new Error(res.error instanceof Error ? res.error.message : String(res.error));
      const d = res.data as AITestResponse;
      if (!d?.success) throw new Error(d?.error ?? 'ai-test returned failure');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.response?.slice(0, 100),
      });
    } catch (e: unknown) {
      setTestState({ status: 'error', error: e instanceof Error ? e.message : 'Test failed' });
    }
  }, []);

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'free' ? m.isFree : !m.isFree);
    return matchSearch && matchFilter;
  });

  const mData = managedStatus?.data;

  return (
    <div className="space-y-4">
      <BreakerBanner row={breakerRow} />
      <div className="flex items-center gap-2 flex-wrap">
        <BreakerChip row={breakerRow} />
      </div>

      {/* Managed key status */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Platform key balance</p>
          <button onClick={onManagedRefresh} className="p-1 rounded hover:bg-muted transition-colors">
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        {managedStatus === null && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </p>
        )}
        {managedStatus?.configured === false && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            OPENROUTER_API_KEY not configured on server
          </p>
        )}
        {managedStatus?.error && (
          <p className="text-xs text-destructive">{managedStatus.error}</p>
        )}
        {mData && (
          <p className="text-xs text-muted-foreground">
            {mData.limit != null
              ? `$${((mData.limit - (mData.usage ?? 0))).toFixed(4)} remaining / $${mData.limit.toFixed(4)} limit`
              : `$${(mData.usage ?? 0).toFixed(4)} used`}
            {mData.is_free_tier && (
              <span className="ml-2 text-green-600 dark:text-green-400">· Free tier</span>
            )}
            {mData.rate_limit && (
              <span className="ml-2">
                · {mData.rate_limit.requests} req/{mData.rate_limit.interval}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Test */}
      <TestBanner state={testState} onRun={runTest} />

      {/* Active model + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active BYOK model</p>
          <p className="text-sm font-mono font-medium text-foreground truncate max-w-[260px]">
            {openrouterModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
        <button
          onClick={() => { hasFetched.current = false; void fetchModels(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh list
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(['all', 'free', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1.5 capitalize transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-muted-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading models…
        </div>
      )}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No models match your search.
              </div>
            )}
            {filtered.map(m => {
              const isActive = openrouterModel === m.id;
              const isPending = pending === m.id;
              return (
                <React.Fragment key={m.id}>
                  <button
                    onClick={() => setPending(isPending ? null : m.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                      isActive ? 'bg-primary/8' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('text-sm font-medium truncate', isActive && 'text-primary')}>
                          {m.name}
                        </span>
                        {m.isFree ? <FreeBadge /> : <PaidBadge />}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{m.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {formatCtx(m.context_length) && (
                        <span className="text-[10px] text-muted-foreground">{formatCtx(m.context_length)}</span>
                      )}
                      {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                  {isPending && (
                    <ConfirmCard
                      modelId={m.id}
                      onConfirm={() => { setOpenrouterModel(m.id); setPending(null); }}
                      onCancel={() => setPending(null)}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            {filtered.length} of {models.length} models
          </div>
        </div>
      )}
    </div>
  );
}

// ── Groq sub-panel ─────────────────────────────────────────────────────────────

function GroqUsageCard({ usage }: { usage: GroqUsage | null }) {
  if (usage === null) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">Loading usage stats…</p>
      </div>
    );
  }
  if (!usage.configured) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">GROQ_API_KEY not configured — usage unavailable.</p>
      </div>
    );
  }
  if (usage.error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <p className="text-xs text-destructive">Usage fetch error: {usage.error}</p>
      </div>
    );
  }
  const reqPct =
    usage.requests_limit && usage.requests_today != null
      ? Math.min(100, (usage.requests_today / usage.requests_limit) * 100)
      : null;
  const tokPct =
    usage.tokens_limit && usage.tokens_today != null
      ? Math.min(100, (usage.tokens_today / usage.tokens_limit) * 100)
      : null;
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Today's managed-key usage</p>
      {reqPct !== null && usage.requests_today != null && usage.requests_limit != null ? (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground">Requests</span>
            <span className="text-muted-foreground font-mono">{fmt(usage.requests_today)} / {fmt(usage.requests_limit)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', reqPct >= 90 ? 'bg-destructive' : reqPct >= 70 ? 'bg-yellow-500' : 'bg-green-500')}
              style={{ width: `${reqPct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Request usage not available.</p>
      )}
      {tokPct !== null && usage.tokens_today != null && usage.tokens_limit != null ? (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground">Tokens</span>
            <span className="text-muted-foreground font-mono">{fmt(usage.tokens_today)} / {fmt(usage.tokens_limit)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', tokPct >= 90 ? 'bg-destructive' : tokPct >= 70 ? 'bg-yellow-500' : 'bg-green-500')}
              style={{ width: `${tokPct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Token usage not available.</p>
      )}
    </div>
  );
}

function GroqPanel({
  breakerRow,
  managedStatus,
  groqUsage,
}: {
  breakerRow?: BreakerRow | null;
  managedStatus: ManagedGroqStatus | null;
  groqUsage: GroqUsage | null;
}) {
  const { groqModel, setGroqModel } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });

  const models: GroqModel[] =
    managedStatus?.models && managedStatus.models.length > 0
      ? managedStatus.models
      : GROQ_MODELS_FALLBACK;

  const isManagedList = !!managedStatus?.configured && managedStatus.models.length > 0;

  const runTest = useCallback(async () => {
    setTestState({ status: 'running' });
    try {
      const res = await edgeFunctions.functions.invoke('ai-test', {
        body: { wiseresumeSubProvider: 'groq', adminPassword: getDevKitToken() },
      });
      if (res.error) throw new Error(res.error instanceof Error ? res.error.message : String(res.error));
      const d = res.data as AITestResponse;
      if (!d?.success) throw new Error(d?.error ?? 'ai-test returned failure');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.response?.slice(0, 100),
      });
    } catch (e: unknown) {
      setTestState({ status: 'error', error: e instanceof Error ? e.message : 'Test failed' });
    }
  }, []);

  const filtered = models.filter(m => m.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <BreakerBanner row={breakerRow} />
      <div className="flex items-center gap-2 flex-wrap">
        <BreakerChip row={breakerRow} />
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
          <Zap className="w-2.5 h-2.5" />
          Free · rate limited
        </span>
      </div>

      <GroqUsageCard usage={groqUsage} />

      {managedStatus === null && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">Loading managed model list…</p>
        </div>
      )}
      {managedStatus?.configured === false && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Info className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            GROQ_API_KEY not on server — showing fallback list.
          </p>
        </div>
      )}
      {isManagedList && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300">
            Live model list from managed Groq key · {models.length} models
          </p>
        </div>
      )}

      <TestBanner state={testState} onRun={runTest} />

      <div>
        <p className="text-xs text-muted-foreground">Active BYOK model</p>
        <p className="text-sm font-mono font-medium text-foreground truncate">
          {groqModel || <span className="text-muted-foreground italic">none selected</span>}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No models match.</div>
          )}
          {filtered.map(m => {
            const isActive = groqModel === m.id;
            const isPending = pending === m.id;
            const ctx = m.context_window ?? GROQ_CONTEXT_FALLBACK[m.id];
            return (
              <React.Fragment key={m.id}>
                <button
                  onClick={() => setPending(isPending ? null : m.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/8' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-mono font-medium truncate', isActive && 'text-primary')}>
                        {m.id}
                      </span>
                      <FreeBadge />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ctx && <span className="text-[10px] text-muted-foreground">{formatCtx(ctx)}</span>}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
                {isPending && (
                  <ConfirmCard
                    modelId={m.id}
                    onConfirm={() => { setGroqModel(m.id); setPending(null); }}
                    onCancel={() => setPending(null)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
          {filtered.length} of {models.length} models
        </div>
      </div>
    </div>
  );
}

// ── Gemini sub-panel ───────────────────────────────────────────────────────────

function GeminiPanel({ breakerRow }: { breakerRow?: BreakerRow | null }) {
  const { geminiModel, geminiApiKey, geminiKeyValidated, geminiDailyUsage, setGeminiModel } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [managedStatus, setManagedStatus] = useState<ManagedGeminiStatus | null>(null);
  const hasFetched = useRef(false);

  const fetchManagedModels = useCallback(async () => {
    try {
      const res = await fetchWithToken('/api/admin/ai-provider/gemini-models');
      if (!res.ok) {
        setManagedStatus({ configured: false, models: [] });
        return;
      }
      const data = await res.json() as ManagedGeminiStatus;
      setManagedStatus(data);
    } catch {
      setManagedStatus({ configured: false, models: [] });
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchManagedModels();
    }
  }, [fetchManagedModels]);

  const runTest = useCallback(async () => {
    setTestState({ status: 'running' });
    try {
      const res = await fetchWithToken('/api/admin/ai-provider/gemini-test', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as GeminiTestResponse;
      if (!d.success) throw new Error(d.error ?? 'Gemini test failed');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.preview,
      });
    } catch (e: unknown) {
      setTestState({ status: 'error', error: e instanceof Error ? e.message : 'Test failed' });
    }
  }, []);

  const models: GeminiModel[] =
    managedStatus?.configured && managedStatus.models.length > 0
      ? managedStatus.models
      : GEMINI_MODELS_FALLBACK;

  const isManagedList = !!managedStatus?.configured && managedStatus.models.length > 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = geminiDailyUsage?.date === today ? geminiDailyUsage.count : 0;

  const filtered = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <BreakerBanner row={breakerRow} />
      <div className="flex items-center gap-2 flex-wrap">
        <BreakerChip row={breakerRow} />
      </div>

      {isManagedList ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <Check className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Live model list from managed Gemini key · {models.length} models
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {managedStatus === null
              ? 'Loading managed model list…'
              : managedStatus.configured === false
              ? 'GEMINI_API_KEY not on server — showing fallback list.'
              : 'Showing fallback model list.'}
          </p>
        </div>
      )}

      {geminiApiKey && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Today's BYOK usage</p>
            <p className="text-xs text-muted-foreground">{todayUsage} requests</p>
          </div>
          <span className={cn(
            'text-xs px-2 py-1 rounded-full border',
            geminiKeyValidated
              ? 'bg-green-500/10 text-green-600 border-green-500/20'
              : 'bg-muted text-muted-foreground border-border',
          )}>
            {geminiKeyValidated ? 'Key validated' : 'Key not validated'}
          </span>
        </div>
      )}
      {!geminiApiKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs">No BYOK Gemini key. Add one in AI Settings to use your own account.</p>
        </div>
      )}

      {/* Test via managed server proxy */}
      <TestBanner state={testState} onRun={runTest} />

      <div>
        <p className="text-xs text-muted-foreground">Active model</p>
        <p className="text-sm font-mono font-medium text-foreground">
          {geminiModel || <span className="text-muted-foreground italic">none selected</span>}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {filtered.map(m => {
            const isActive = geminiModel === m.id;
            const isPending = pending === m.id;
            return (
              <React.Fragment key={m.id}>
                <button
                  onClick={() => setPending(isPending ? null : m.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/8' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <span className={cn('text-sm font-medium', isActive && 'text-primary')}>{m.name}</span>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {formatCtx(m.context) && (
                      <span className="text-[10px] text-muted-foreground">{formatCtx(m.context)}</span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
                {isPending && (
                  <ConfirmCard
                    modelId={m.id}
                    onConfirm={() => { setGeminiModel(m.id); setPending(null); }}
                    onCancel={() => setPending(null)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Ollama sub-panel ───────────────────────────────────────────────────────────

function OllamaPanel({ breakerRow }: { breakerRow?: BreakerRow | null }) {
  const { ollamaModel, ollamaBaseUrl, setOllamaModel } = useSettingsStore();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const hasFetched = useRef(false);

  const base = ollamaBaseUrl || 'http://localhost:11434';

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as OllamaTagsResponse;
      setModels(json.models ?? []);
    } catch {
      setError('Cannot reach Ollama. Is it running locally?');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchModels();
    }
  }, [fetchModels]);

  const runTest = useCallback(async () => {
    if (!ollamaModel) {
      setTestState({ status: 'error', error: 'No model selected. Pick a model first.' });
      return;
    }
    setTestState({ status: 'running' });
    const start = Date.now();
    try {
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, prompt: 'Reply with one word: OK', stream: false }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as OllamaGenerateResponse;
      setTestState({
        status: 'done',
        latencyMs: Date.now() - start,
        model: ollamaModel,
        preview: (d.response ?? '').slice(0, 100),
      });
    } catch (e: unknown) {
      setTestState({ status: 'error', error: e instanceof Error ? e.message : 'Test failed' });
    }
  }, [base, ollamaModel]);

  const filtered = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Ollama is local — no breaker tracked, but show if a row happens to exist */}
      {breakerRow && <BreakerBanner row={breakerRow} />}
      <div className="flex items-center gap-2 flex-wrap">
        {breakerRow
          ? <BreakerChip row={breakerRow} />
          : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border">
              <ShieldCheck className="w-3 h-3" />
              Not tracked in breaker
            </span>
          )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Cpu className="w-3 h-3" />
          Local only
        </span>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <Cpu className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-700 dark:text-purple-300 space-y-0.5">
          <p className="font-medium">Local Ollama — privacy-first inference</p>
          <p className="font-mono opacity-70">{base}</p>
        </div>
      </div>

      <TestBanner state={testState} onRun={runTest} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active model</p>
          <p className="text-sm font-mono font-medium text-foreground">
            {ollamaModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
        <button
          onClick={() => { hasFetched.current = false; void fetchModels(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search installed models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Connecting to Ollama…
        </div>
      )}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {!loading && !error && models.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No models installed. Run{' '}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">ollama pull &lt;model&gt;</code>
          {' '}to add one.
        </div>
      )}
      {!loading && !error && models.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {filtered.map(m => {
              const isActive = ollamaModel === m.name;
              const isPending = pending === m.name;
              return (
                <React.Fragment key={m.name}>
                  <button
                    onClick={() => setPending(isPending ? null : m.name)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                      isActive ? 'bg-primary/8' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-3">
                      <span className={cn('text-sm font-mono font-medium truncate', isActive && 'text-primary')}>
                        {m.name}
                      </span>
                      <FreeBadge />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.size && (
                        <span className="text-[10px] text-muted-foreground">
                          {(m.size / 1e9).toFixed(1)} GB
                        </span>
                      )}
                      {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                  {isPending && (
                    <ConfirmCard
                      modelId={m.name}
                      onConfirm={() => { setOllamaModel(m.name); setPending(null); }}
                      onCancel={() => setPending(null)}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            {filtered.length} of {models.length} installed models
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AIProviderPanel ───────────────────────────────────────────────────────

export function AIProviderPanel() {
  const { aiProvider, wiseresumeSubProvider, setWiseresumeSubProvider } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<ProviderTab>('openrouter');

  // Breaker status fetched from ai-breaker-status edge function
  const [breakerRows, setBreaker] = useState<BreakerRow[] | null>(null);
  const [breakerLoading, setBreakerLoading] = useState(false);

  // Managed provider data fetched from server proxy
  const [managedOR, setManagedOR] = useState<ManagedORStatus | null>(null);
  const [managedGroq, setManagedGroq] = useState<ManagedGroqStatus | null>(null);
  const [groqUsage, setGroqUsage] = useState<GroqUsage | null>(null);

  const fetchBreakerStatus = useCallback(async () => {
    setBreakerLoading(true);
    try {
      const res = await edgeFunctions.functions.invoke('ai-breaker-status', {
        body: { password: getDevKitToken() },
      });
      if (!res.error) {
        const body = res.data as BreakerStatusResponse | null;
        setBreaker(Array.isArray(body?.providers) ? body!.providers : []);
      } else {
        setBreaker([]);
      }
    } catch {
      setBreaker([]);
    } finally {
      setBreakerLoading(false);
    }
  }, []);

  const fetchManagedOR = useCallback(async () => {
    setManagedOR(null);
    try {
      const res = await fetchWithToken('/api/admin/ai-provider/openrouter-status');
      if (!res.ok) { setManagedOR({ configured: true, error: `HTTP ${res.status}` }); return; }
      const data = await res.json() as ManagedORStatus;
      setManagedOR(data);
    } catch (e: unknown) {
      setManagedOR({ configured: true, error: e instanceof Error ? e.message : 'Fetch failed' });
    }
  }, []);

  const fetchManagedGroq = useCallback(async () => {
    setManagedGroq(null);
    try {
      const res = await fetchWithToken('/api/admin/ai-provider/groq-models');
      if (!res.ok) { setManagedGroq({ configured: true, models: [], error: `HTTP ${res.status}` }); return; }
      const data = await res.json() as ManagedGroqStatus;
      setManagedGroq(data);
    } catch (e: unknown) {
      setManagedGroq({ configured: true, models: [], error: e instanceof Error ? e.message : 'Fetch failed' });
    }
  }, []);

  const fetchGroqUsage = useCallback(async () => {
    setGroqUsage(null);
    try {
      const res = await fetchWithToken('/api/admin/ai-provider/groq-usage');
      if (!res.ok) { setGroqUsage({ configured: true, error: `HTTP ${res.status}` }); return; }
      const data = await res.json() as GroqUsage;
      setGroqUsage(data);
    } catch (e: unknown) {
      setGroqUsage({ configured: true, error: e instanceof Error ? e.message : 'Fetch failed' });
    }
  }, []);

  useEffect(() => {
    void fetchBreakerStatus();
    void fetchManagedOR();
    void fetchManagedGroq();
    void fetchGroqUsage();
  }, [fetchBreakerStatus, fetchManagedOR, fetchManagedGroq, fetchGroqUsage]);

  // Look up a breaker row by the canonical table key (e.g. 'wiseresume/openrouter')
  const getBreakerRow = (tab: ProviderTab): BreakerRow | null => {
    const key = BREAKER_ID[tab];
    if (!key || !breakerRows) return null;
    return breakerRows.find(r => r.provider === key) ?? null;
  };

  const TABS: { id: ProviderTab; label: string }[] = [
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'groq', label: 'Groq' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'ollama', label: 'Ollama' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Provider</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Managed platform keys, circuit breaker status, and BYOK model selection.
          </p>
        </div>
        <button
          onClick={() => { void fetchBreakerStatus(); void fetchManagedOR(); void fetchManagedGroq(); void fetchGroqUsage(); }}
          disabled={breakerLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', breakerLoading && 'animate-spin')} />
          Refresh all
        </button>
      </div>

      {/* Feature routing */}
      <FeatureRoutingSection subProvider={wiseresumeSubProvider} />

      {/* Sub-provider selector */}
      <SubProviderSelector current={wiseresumeSubProvider} onChange={setWiseresumeSubProvider} breakerRows={breakerRows} />

      {/* Active provider mode */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
        <Info className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Current provider mode:{' '}
          <span className="font-semibold text-foreground">{aiProvider}</span>
          {aiProvider === 'wiseresume' && (
            <span className="ml-1">
              (sub-provider:{' '}
              <span className="font-mono text-foreground">{wiseresumeSubProvider}</span>)
            </span>
          )}
        </p>
      </div>

      {/* Provider tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-border">
          {TABS.map(t => {
            const bRow = getBreakerRow(t.id);
            const isOpen = bRow?.is_open ?? false;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'relative px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === t.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {isOpen && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {activeTab === 'openrouter' && (
            <OpenRouterPanel
              breakerRow={getBreakerRow('openrouter')}
              managedStatus={managedOR}
              onManagedRefresh={() => { void fetchManagedOR(); }}
            />
          )}
          {activeTab === 'groq' && (
            <GroqPanel
              breakerRow={getBreakerRow('groq')}
              managedStatus={managedGroq}
              groqUsage={groqUsage}
            />
          )}
          {activeTab === 'gemini' && (
            <GeminiPanel breakerRow={getBreakerRow('gemini')} />
          )}
          {activeTab === 'ollama' && (
            <OllamaPanel breakerRow={getBreakerRow('ollama')} />
          )}
        </div>
      </div>
    </div>
  );
}
