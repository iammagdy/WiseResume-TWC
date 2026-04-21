import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Check, Zap, DollarSign, RefreshCw, Cpu, ChevronDown, ChevronRight,
  Info, AlertTriangle, PlayCircle, Loader2, ShieldCheck, ShieldAlert, ShieldX,
  Map as MapIcon, Clock, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore, WiseresumeSubProvider } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import {
  GROQ_DEFAULT_MODEL,
  OPENROUTER_CURATED_MODELS,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_AUTO_SENTINEL,
} from '@/lib/aiDefaults';
import { cn } from '@/lib/utils';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';

// ── Types ──────────────────────────────────────────────────────────────────────

type ProviderTab = 'openrouter' | 'openrouter2' | 'groq' | 'gemini' | 'ollama';

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
  // Task #18: server echoes back the sub-provider actually used (and the one
  // the admin requested via body). Clients assert these match the tab they
  // fired from, so a misrouted response never shows up as a success card on
  // the wrong tab.
  wiseresumeSubProvider?: 'openrouter' | 'openrouter2' | 'groq' | 'auto';
  requestedSubProvider?: 'openrouter' | 'openrouter2' | 'groq' | 'auto' | null;
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

/**
 * Task #18: Defence-in-depth — even with per-panel keyed remounts and
 * AbortController cancellation, a slow in-flight `ai-test` request could
 * previously resolve with a result for a DIFFERENT sub-provider than the tab
 * the admin is currently viewing (e.g. server silently fell back to the
 * global engine when the admin-auth check flaked). This helper throws if the
 * server's response doesn't match what the tab requested, turning any
 * silent cross-tab bleed into an explicit error instead of a misleading
 * green card.
 */
function assertSubProviderMatches(
  d: AITestResponse,
  expected: 'openrouter' | 'openrouter2' | 'groq',
): void {
  if (d.requestedSubProvider != null && d.requestedSubProvider !== expected) {
    throw new Error(
      `Server handled request as '${d.requestedSubProvider}' but tab requested '${expected}'. ` +
      `Admin override may have been rejected — verify ADMIN_EMAILS and re-auth.`,
    );
  }
  if (d.wiseresumeSubProvider != null && d.wiseresumeSubProvider !== expected) {
    throw new Error(
      `Server routed test through '${d.wiseresumeSubProvider}' instead of '${expected}'.`,
    );
  }
}

// ── Provider ID constants (match ai_provider_breaker table keys) ───────────────

const BREAKER_ID = {
  openrouter: 'wiseresume/openrouter',
  openrouter2: 'wiseresume/openrouter2',
  groq: 'wiseresume/groq',
  // A1: Gemini breaker is a single global row keyed `gemini_global` — there are
  // no per-user Gemini breaker rows in the schema today (verified in
  // `ai_provider_breaker` migrations). If per-user rows are added later, the
  // panel will need to merge any `gemini_*` rows alongside this global one.
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

/**
 * Authenticated fetch helper.
 *
 * S3: throws "Session expired — please re-login to the DevKit." synchronously
 * when no Supabase token is available, so callers see a clear error instead of
 * silently sending an unauthenticated request that the server will reject as
 * an opaque 401.
 */
async function fetchWithToken(url: string, options?: RequestInit): Promise<Response> {
  const token = await getSupabaseToken();
  if (!token) {
    throw new Error('Session expired — please re-login to the DevKit.');
  }
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/** P4: simple in-flight request deduper keyed by URL+method. */
const inflight = new Map<string, Promise<Response>>();
async function fetchWithTokenDedup(
  url: string,
  options?: RequestInit & { dedupKey?: string },
): Promise<Response> {
  const key = options?.dedupKey ?? `${(options?.method ?? 'GET').toUpperCase()} ${url}`;
  const existing = inflight.get(key);
  if (existing) {
    // Multiple callers share the same Response — clone before reading.
    return (await existing).clone();
  }
  // Task #10 / Step 6: release the dedup slot the moment the request settles.
  // The previous 250ms post-settle hold was meant to coalesce double-clicks,
  // but in practice it also forced legitimate user-driven re-fetches (filter
  // changes, "Refresh", retries after failure) to see a stale cached Response
  // for up to a quarter-second. Coalescing concurrent in-flight callers — the
  // primary win — still works without the post-settle delay.
  const p = fetchWithToken(url, options).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return (await p).clone();
}

/** Audit log helper — best-effort fire-and-forget. Failures are logged only. */
function logAdminModelSwitch(provider: string, model: string, previousModel: string | null) {
  void fetchWithToken('/api/admin/ai-provider/audit-model-switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, previousModel }),
  }).catch((e) => console.warn('[ai-provider-panel] audit log write failed', e));
}

/**
 * A3: Best-effort audit log for provider tests (OpenRouter / Groq / Ollama).
 * Posts to the dedicated `/audit-test` endpoint so test events are recorded
 * with `action='provider-test'` and a structured payload — distinct from
 * model-switch events. Fire-and-forget; failures are logged only.
 *
 * Note: Gemini tests are audited server-side inside `/gemini-test` itself, so
 * the Gemini sub-panel does NOT call this helper (avoids duplicate rows).
 */
function logAdminProviderTest(
  provider: string,
  model: string | null,
  ok: boolean,
  latencyMs: number | null,
  errorMessage: string | null,
) {
  void fetchWithToken('/api/admin/ai-provider/audit-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, ok, latencyMs, error: errorMessage }),
  }).catch((e) => console.warn('[ai-provider-panel] test audit write failed', e));
}

/**
 * F1: re-render hook that ticks once per second while `enabled` is true.
 * Used by breaker chips/banners to count down `opened_until` in real time
 * without polling the breaker-status endpoint at 1 Hz.
 */
function useTick(enabled: boolean, intervalMs = 1000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return tick;
}

/** P2: debounce a string value (used for search inputs). */
function useDebounced<T>(value: T, delay = 120): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
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
  // F1: tick once per second so the countdown updates without re-fetching.
  useTick(!!row?.is_open);
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
  useTick(!!row?.is_open);
  if (!row?.is_open) return null;
  const secsLeft = row.opened_until
    ? Math.max(0, Math.ceil((new Date(row.opened_until).getTime() - Date.now()) / 1000))
    : 0;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
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

/**
 * U1: keyboard-friendly confirm card. Mounting attaches a window-level
 * keydown listener — Enter confirms, Esc cancels. The listener is removed on
 * unmount so only the visible confirm card listens at any time.
 */
function ConfirmCard({
  modelId,
  onConfirm,
  onCancel,
}: {
  modelId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onCancel]);

  return (
    <div
      className="mx-3 mb-1 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2"
      role="dialog"
      aria-label={`Confirm switching active model to ${modelId}`}
    >
      <p className="text-xs font-medium text-foreground">Switch active model to:</p>
      <p className="text-xs font-mono text-primary truncate">{modelId}</p>
      <p className="text-[10px] text-muted-foreground">Press Enter to confirm · Esc to cancel</p>
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
        <div className="p-2.5 rounded-lg border border-green-500/20 bg-green-500/5 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {state.latencyMs}ms
            </span>
            {state.model && (
              <span className="text-[11px] font-mono text-muted-foreground">
                · answered by <span className="text-foreground">{state.model}</span>
              </span>
            )}
          </div>
          {state.preview && (
            // Task #24: render the full upstream response (no 100-char slice,
            // no line-clamp). Long responses scroll inside a bounded box so
            // the panel layout stays stable.
            <pre className="text-[11px] text-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto bg-background/40 rounded p-2 border border-border/40 font-mono">{state.preview}</pre>
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
  { value: 'auto', label: 'Auto', desc: 'OpenRouter → OpenRouter 2 → Groq fallback' },
  { value: 'openrouter', label: 'OpenRouter', desc: 'Route all calls via OpenRouter' },
  { value: 'openrouter2', label: 'OpenRouter 2', desc: 'Route all calls via OpenRouter 2 (openrouter/elephant-alpha)' },
  { value: 'groq', label: 'Groq', desc: 'Route all calls via Groq' },
];

type SubProviderHealth = 'healthy' | 'degraded' | 'open' | 'unknown';

function rowHealth(row: BreakerRow | null | undefined): SubProviderHealth {
  if (!row) return 'unknown';
  if (row.is_open) return 'open';
  if ((row.failure_count ?? 0) > 0) return 'degraded';
  return 'healthy';
}

function combinedAutoHealth(...inputs: SubProviderHealth[]): SubProviderHealth {
  const known = inputs.filter(h => h !== 'unknown') as Exclude<SubProviderHealth, 'unknown'>[];
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
  const or2Health = rowHealth(breakerRows?.find(r => r.provider === BREAKER_ID.openrouter2));
  const groqHealth = rowHealth(breakerRows?.find(r => r.provider === BREAKER_ID.groq));
  const healthByOption: Record<WiseresumeSubProvider, SubProviderHealth> = {
    auto: combinedAutoHealth(orHealth, or2Health, groqHealth),
    openrouter: orHealth,
    openrouter2: or2Health,
    groq: groqHealth,
  };

  const handleSelect = (sub: WiseresumeSubProvider) => {
    if (sub === current) return;
    setPending(sub);
  };

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    onChange(pending);
    logAdminModelSwitch('wiseresume-sub', pending, current);
    setPending(null);
  }, [pending, current, onChange]);

  const handleCancel = useCallback(() => setPending(null), []);

  // U1: Enter confirms / Esc cancels at the selector level too.
  useEffect(() => {
    if (!pending) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pending, handleConfirm, handleCancel]);

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
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2" role="dialog">
          <p className="text-xs font-medium text-foreground">
            Switch managed sub-provider to{' '}
            <span className="font-semibold text-primary">{pendingOpt.label}</span>?
          </p>
          <p className="text-[11px] text-muted-foreground">{pendingOpt.desc}</p>
          <p className="text-[10px] text-muted-foreground">Press Enter to confirm · Esc to cancel</p>
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
      ? `Groq (${GROQ_DEFAULT_MODEL})`
      : subProvider === 'openrouter'
      ? 'OpenRouter (configured model)'
      : subProvider === 'openrouter2'
      ? 'OpenRouter 2 (openrouter/elephant-alpha)'
      : 'OpenRouter → OpenRouter 2 → Groq fallback';

  const routeColor =
    subProvider === 'groq'
      ? 'text-green-600 dark:text-green-400'
      : subProvider === 'openrouter'
      ? 'text-violet-600 dark:text-violet-400'
      : subProvider === 'openrouter2'
      ? 'text-fuchsia-600 dark:text-fuchsia-400'
      : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <MapIcon className="w-3.5 h-3.5 text-muted-foreground" />
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
  registerRefresh,
}: {
  breakerRow?: BreakerRow | null;
  managedStatus: ManagedORStatus | null;
  onManagedRefresh: () => Promise<void> | void;
  registerRefresh: (fn: () => Promise<void>) => void;
}) {
  // Task #24: subscribe to openrouterModel + openrouterAuto so changes
  // anywhere in the app (AI Settings sheet, other DevKit instances, store
  // hydration) propagate live without a reload. Zustand selectors handle
  // the re-render.
  const openrouterModel = useSettingsStore((s) => s.openrouterModel);
  const openrouterAuto = useSettingsStore((s) => s.openrouterAuto);
  const setOpenrouterModel = useSettingsStore((s) => s.setOpenrouterModel);
  const setOpenrouterAuto = useSettingsStore((s) => s.setOpenrouterAuto);

  const [pending, setPending] = useState<string | null>(null); // candidate slug awaiting confirm
  const [pendingAuto, setPendingAuto] = useState<boolean>(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const testAbortRef = useRef<AbortController | null>(null);

  // Task #24: discovery has been replaced with a curated 8-model allow-list.
  // The list is a hard-coded constant mirrored across aiDefaults.ts (browser),
  // aiClient.ts (edge), and manage-api-keys/index.ts (server enforcement).
  const curatedModels = OPENROUTER_CURATED_MODELS;

  // Header "Refresh all" still has a hook here for managed-key balance only.
  // The model list itself is static so there is nothing else to fetch.
  useEffect(() => {
    registerRefresh(async () => {
      try {
        await Promise.resolve().then(() => onManagedRefresh());
        return true;
      } catch (e) {
        console.error('[ai-provider-panel] OR managed refresh failed:', e);
        return false;
      }
    });
  }, [registerRefresh, onManagedRefresh]);

  const runTest = useCallback(async () => {
    // P5: cancel any prior test (and the underlying upstream call) before starting a new one.
    testAbortRef.current?.abort();
    const ctrl = new AbortController();
    testAbortRef.current = ctrl;

    setTestState({ status: 'running' });
    try {
      // Task #24: forward the live curated-model + Auto-fallback selection
      // so the test exercises exactly what the admin currently has wired,
      // not the server-side default chain. Read directly from the store at
      // call time (the surrounding selectors update the UI; this read is the
      // source of truth at the moment the admin clicked Test).
      const liveOpenrouterModel = useSettingsStore.getState().openrouterModel;
      const liveOpenrouterAuto = useSettingsStore.getState().openrouterAuto;
      const res = await edgeFunctions.functions.invoke('ai-test', {
        body: {
          wiseresumeSubProvider: 'openrouter',
          openrouterModel: liveOpenrouterModel || OPENROUTER_DEFAULT_MODEL,
          openrouterAuto: liveOpenrouterAuto,
        },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (res.error) throw new Error(res.error instanceof Error ? res.error.message : String(res.error));
      const d = res.data as AITestResponse;
      if (!d?.success) throw new Error(d?.error ?? 'ai-test returned failure');
      assertSubProviderMatches(d, 'openrouter');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model, // answering-model surfaced verbatim from the upstream response
        preview: d.response, // Task #24: full response, no 100-char slice
      });
      logAdminProviderTest('openrouter', d.model ?? null, true, d.latencyMs ?? null, null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestState({ status: 'error', error: msg });
      logAdminProviderTest('openrouter', null, false, null, msg);
    }
  }, []);

  // P5: abort any in-flight test on unmount (cancels underlying fetch via signal).
  useEffect(() => () => { testAbortRef.current?.abort(); }, []);

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
          <button onClick={() => onManagedRefresh()} className="p-1 rounded hover:bg-muted transition-colors">
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

      {/* Auto fallback toggle */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
        <button
          onClick={() => setPendingAuto(true)}
          aria-pressed={openrouterAuto}
          className={cn(
            'mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            openrouterAuto ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform',
              openrouterAuto ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">Auto fallback</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            On failure, walk the curated list in order until a model succeeds. Off pins requests to the single selected slug.
          </p>
        </div>
      </div>
      {pendingAuto && (
        <ConfirmCard
          modelId={openrouterAuto ? 'Disable Auto fallback' : 'Enable Auto fallback'}
          onConfirm={async () => {
            const next = !openrouterAuto;
            const prev = openrouterAuto ? OPENROUTER_AUTO_SENTINEL : (openrouterModel || null);
            setOpenrouterAuto(next);
            // Persist to app_settings so the managed openrouter sub-engine
            // picks up the new flag for ALL users, not just this admin.
            try {
              await edgeFunctions.functions.invoke('admin-update-settings', {
                headers: devKitAuthHeaders(),
                body: { key: 'openrouter_auto_fallback', value: next },
              });
            } catch (err) {
              console.error('[OpenRouterPanel] failed to persist auto flag:', err);
            }
            logAdminModelSwitch('openrouter', next ? OPENROUTER_AUTO_SENTINEL : (openrouterModel || OPENROUTER_DEFAULT_MODEL), prev);
            setPendingAuto(false);
          }}
          onCancel={() => setPendingAuto(false)}
        />
      )}

      {/* Active model */}
      <div>
        <p className="text-xs text-muted-foreground">Primary model</p>
        <p className="text-sm font-mono font-medium text-foreground truncate max-w-full">
          {openrouterModel || <span className="text-muted-foreground italic">none selected</span>}
          {openrouterAuto && (
            <span className="ml-2 text-[11px] text-primary font-sans font-normal">
              · Auto fallback active (will iterate {curatedModels.length} curated models on failure)
            </span>
          )}
        </p>
      </div>

      {/* Curated model list */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b border-border">
          <p className="text-[11px] font-medium text-foreground">Curated allow-list</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Server-enforced. Off-list slugs are rejected by manage-api-keys.
          </p>
        </div>
        <div className="divide-y divide-border">
          {curatedModels.map((id, idx) => {
            const isActive = openrouterModel === id;
            const isDefault = idx === 0;
            const isPending = pending === id;
            return (
              <React.Fragment key={id}>
                <button
                  onClick={() => setPending(isPending ? null : id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/10' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-sm font-mono truncate', isActive && 'text-primary font-medium')}>
                        {id}
                      </span>
                      <FreeBadge />
                      {isDefault && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                          default
                        </span>
                      )}
                      {isActive && openrouterAuto && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide">
                          primary · auto
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
                {isPending && (
                  <ConfirmCard
                    modelId={id}
                    onConfirm={async () => {
                      const prev = openrouterAuto ? OPENROUTER_AUTO_SENTINEL : (openrouterModel || null);
                      setOpenrouterModel(id);
                      // Persist to app_settings so the managed openrouter
                      // sub-engine routes ALL users to the new primary slug.
                      try {
                        await edgeFunctions.functions.invoke('admin-update-settings', {
                          headers: devKitAuthHeaders(),
                          body: { key: 'openrouter_curated_model', value: id },
                        });
                      } catch (err) {
                        console.error('[OpenRouterPanel] failed to persist primary model:', err);
                      }
                      logAdminModelSwitch('openrouter', id, prev);
                      setPending(null);
                    }}
                    onCancel={() => setPending(null)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
          {curatedModels.length} curated models · default: <span className="font-mono">{OPENROUTER_DEFAULT_MODEL}</span>
        </div>
      </div>
    </div>
  );
}

// ── OpenRouter 2 sub-panel ────────────────────────────────────────────────────

/**
 * OpenRouter 2 is a secondary OpenRouter managed account pinned to one model
 * (`openrouter/elephant-alpha`). The slug is fixed in `aiClient.ts` — there is
 * no model picker, no live `/models` discovery, and no "active model" state to
 * persist. The panel shows balance + breaker + a Test connection button.
 */
type OR2Status = {
  configured: boolean;
  data?: {
    label?: string;
    usage?: number;
    limit?: number | null;
    is_free_tier?: boolean;
    rate_limit?: { requests?: number; interval?: string } | null;
  } | null;
  pinnedModel?: string;
  error?: string;
};

function OpenRouter2Panel({
  breakerRow,
  registerRefresh,
}: {
  breakerRow?: BreakerRow | null;
  registerRefresh: (fn: () => Promise<boolean>) => void;
}) {
  const [status, setStatus] = useState<OR2Status | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const testAbortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetchWithTokenDedup('/api/admin/ai-provider/openrouter2-status');
      if (!res.ok) {
        setStatus({ configured: true, error: `HTTP ${res.status}` });
        return false;
      }
      const data = await res.json() as OR2Status;
      setStatus(data);
      return true;
    } catch (e: unknown) {
      setStatus({ configured: true, error: e instanceof Error ? e.message : 'Fetch failed' });
      return false;
    }
  }, []);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);
  useEffect(() => {
    registerRefresh(async () => {
      const r = await fetchStatus();
      return r;
    });
  }, [registerRefresh, fetchStatus]);

  const runTest = useCallback(async () => {
    testAbortRef.current?.abort();
    const ctrl = new AbortController();
    testAbortRef.current = ctrl;
    setTestState({ status: 'running' });
    try {
      const res = await edgeFunctions.functions.invoke('ai-test', {
        body: { wiseresumeSubProvider: 'openrouter2' },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (res.error) throw new Error(res.error instanceof Error ? res.error.message : String(res.error));
      const d = res.data as AITestResponse;
      if (!d?.success) throw new Error(d?.error ?? 'ai-test returned failure');
      assertSubProviderMatches(d, 'openrouter2');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.response?.slice(0, 100),
      });
      logAdminProviderTest('openrouter2', d.model ?? null, true, d.latencyMs ?? null, null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestState({ status: 'error', error: msg });
      logAdminProviderTest('openrouter2', null, false, null, msg);
    }
  }, []);

  useEffect(() => () => { testAbortRef.current?.abort(); }, []);

  const sData = status?.data;
  return (
    <div className="space-y-4">
      <BreakerBanner row={breakerRow} />
      <div className="flex items-center gap-2 flex-wrap">
        <BreakerChip row={breakerRow} />
      </div>

      {/* Pinned model card */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
        <p className="text-xs font-medium text-foreground">Pinned model</p>
        <code className="text-xs font-mono text-fuchsia-600 dark:text-fuchsia-400">
          {status?.pinnedModel ?? 'openrouter/elephant-alpha'}
        </code>
        <p className="text-[11px] text-muted-foreground">
          OpenRouter 2 always routes to this model; live model discovery is intentionally disabled.
        </p>
      </div>

      {/* Managed key status */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Platform key balance</p>
          <button onClick={() => { void fetchStatus(); }} className="p-1 rounded hover:bg-muted transition-colors">
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        {status === null && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </p>
        )}
        {status?.configured === false && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            OPENROUTER2_API_KEY not configured on server
          </p>
        )}
        {status?.error && <p className="text-xs text-destructive">{status.error}</p>}
        {sData && (
          <p className="text-xs text-muted-foreground">
            {sData.limit != null
              ? `$${((sData.limit - (sData.usage ?? 0))).toFixed(4)} remaining / $${sData.limit.toFixed(4)} limit`
              : `$${(sData.usage ?? 0).toFixed(4)} used`}
            {sData.is_free_tier && (
              <span className="ml-2 text-green-600 dark:text-green-400">· Free tier</span>
            )}
            {sData.rate_limit && (
              <span className="ml-2">
                · {sData.rate_limit.requests} req/{sData.rate_limit.interval}
              </span>
            )}
          </p>
        )}
      </div>

      <TestBanner state={testState} onRun={runTest} />
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
  registerRefresh,
  onManagedRefresh,
  onUsageRefresh,
}: {
  breakerRow?: BreakerRow | null;
  managedStatus: ManagedGroqStatus | null;
  groqUsage: GroqUsage | null;
  registerRefresh: (fn: () => Promise<void>) => void;
  onManagedRefresh: () => Promise<void> | void;
  onUsageRefresh: () => Promise<void> | void;
}) {
  const { groqModel, setGroqModel } = useSettingsStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 120);
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const testAbortRef = useRef<AbortController | null>(null);

  const models: GroqModel[] =
    managedStatus?.models && managedStatus.models.length > 0
      ? managedStatus.models
      : GROQ_MODELS_FALLBACK;

  const isManagedList = !!managedStatus?.configured && managedStatus.models.length > 0;

  // F8 + U3 wiring — surfaces sub-panel refresh failures up to header toast.
  useEffect(() => {
    registerRefresh(async () => {
      const results = await Promise.allSettled([
        Promise.resolve().then(() => onManagedRefresh()),
        Promise.resolve().then(() => onUsageRefresh()),
      ]);
      return results.every(r => r.status === 'fulfilled');
    });
  }, [registerRefresh, onManagedRefresh, onUsageRefresh]);

  const runTest = useCallback(async () => {
    testAbortRef.current?.abort();
    const ctrl = new AbortController();
    testAbortRef.current = ctrl;

    setTestState({ status: 'running' });
    try {
      const res = await edgeFunctions.functions.invoke('ai-test', {
        body: { wiseresumeSubProvider: 'groq' },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (res.error) throw new Error(res.error instanceof Error ? res.error.message : String(res.error));
      const d = res.data as AITestResponse;
      if (!d?.success) throw new Error(d?.error ?? 'ai-test returned failure');
      assertSubProviderMatches(d, 'groq');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.response?.slice(0, 100),
      });
      logAdminProviderTest('groq', d.model ?? null, true, d.latencyMs ?? null, null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestState({ status: 'error', error: msg });
      logAdminProviderTest('groq', null, false, null, msg);
    }
  }, []);

  useEffect(() => () => { testAbortRef.current?.abort(); }, []);

  // P2: memoise filter
  const filtered = useMemo(
    () => models.filter(m => m.id.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [models, debouncedSearch],
  );

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
          {groqModel
            ? groqModel
            : (
              // U5: when no BYOK override, show what the routing layer actually
              // uses (shared default from `aiClient.ts`) — never "none selected".
              <>
                <span className="text-foreground">{GROQ_DEFAULT_MODEL}</span>
                <span className="ml-1 text-[10px] text-muted-foreground italic">
                  (managed default)
                </span>
              </>
            )}
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
                    isActive ? 'bg-primary/10' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
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
                    onConfirm={() => {
                      const prev = groqModel || null;
                      setGroqModel(m.id);
                      logAdminModelSwitch('groq', m.id, prev);
                      setPending(null);
                    }}
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

function GeminiPanel({
  breakerRow,
  registerRefresh,
}: {
  breakerRow?: BreakerRow | null;
  registerRefresh: (fn: () => Promise<void>) => void;
}) {
  const { geminiModel, geminiApiKey, geminiKeyValidated, geminiDailyUsage, setGeminiModel } = useSettingsStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 120);
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [managedStatus, setManagedStatus] = useState<ManagedGeminiStatus | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  const fetchManagedModels = useCallback(async () => {
    try {
      const res = await fetchWithTokenDedup('/api/admin/ai-provider/gemini-models');
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

  // F6-equivalent for Gemini: refetch on mount via standard useEffect.
  useEffect(() => { void fetchManagedModels(); }, [fetchManagedModels]);

  // F8 wiring
  useEffect(() => {
    registerRefresh(async () => {
      try { await fetchManagedModels(); return true; } catch { return false; }
    });
  }, [registerRefresh, fetchManagedModels]);

  const runTest = useCallback(async () => {
    testAbortRef.current?.abort();
    const ctrl = new AbortController();
    testAbortRef.current = ctrl;

    setTestState({ status: 'running' });
    try {
      // F2: pass the admin's selected model so the test exercises that one.
      // P5: pass the abort signal through so unmount/rerun cancels the request.
      const res = await fetchWithToken('/api/admin/ai-provider/gemini-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: geminiModel || undefined }),
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as GeminiTestResponse;
      if (!d.success) throw new Error(d.error ?? 'Gemini test failed');
      setTestState({
        status: 'done',
        latencyMs: d.latencyMs,
        model: d.model,
        preview: d.preview,
      });
      // NOTE: Gemini tests are audited server-side inside `/gemini-test`
      // (writeAdminAudit with action='gemini-test'). Do NOT call
      // logAdminProviderTest here — that would create a duplicate row.
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestState({ status: 'error', error: msg });
      // Server already audits failures inside `/gemini-test`; nothing to log here.
    }
  }, [geminiModel]);

  useEffect(() => () => { testAbortRef.current?.abort(); }, []);

  const models: GeminiModel[] =
    managedStatus?.configured && managedStatus.models.length > 0
      ? managedStatus.models
      : GEMINI_MODELS_FALLBACK;

  const isManagedList = !!managedStatus?.configured && managedStatus.models.length > 0;

  // U4: use the admin's local timezone (en-CA gives YYYY-MM-DD) so the daily
  // counter rolls over at local midnight, not UTC midnight.
  const today = new Date().toLocaleDateString('en-CA');
  const todayUsage = geminiDailyUsage?.date === today ? geminiDailyUsage.count : 0;

  // P2: memoise filtered list
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return models.filter(m =>
      m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
    );
  }, [models, debouncedSearch]);

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
                    isActive ? 'bg-primary/10' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
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
                    onConfirm={() => {
                      const prev = geminiModel || null;
                      setGeminiModel(m.id);
                      logAdminModelSwitch('gemini', m.id, prev);
                      setPending(null);
                    }}
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

function OllamaPanel({
  breakerRow,
  registerRefresh,
}: {
  breakerRow?: BreakerRow | null;
  registerRefresh: (fn: () => Promise<void>) => void;
}) {
  const { ollamaModel, ollamaBaseUrl, setOllamaModel } = useSettingsStore();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 120);
  const [pending, setPending] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const testAbortRef = useRef<AbortController | null>(null);

  const base = ollamaBaseUrl || 'http://localhost:11434';

  const fetchModels = useCallback(async () => {
    setError(null);
    if (models.length === 0) setLoading(true); else setIsRefreshing(true);
    try {
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as OllamaTagsResponse;
      setModels(json.models ?? []);
    } catch {
      setError('Cannot reach Ollama. Is it running locally?');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [base, models.length]);

  // F6: refetch whenever the base URL changes (e.g. user updates settings).
  useEffect(() => { void fetchModels(); }, [fetchModels]);

  useEffect(() => {
    registerRefresh(async () => {
      try { await fetchModels(); return true; } catch { return false; }
    });
  }, [registerRefresh, fetchModels]);

  const runTest = useCallback(async () => {
    if (!ollamaModel) {
      setTestState({ status: 'error', error: 'No model selected. Pick a model first.' });
      return;
    }
    testAbortRef.current?.abort();
    const ctrl = new AbortController();
    testAbortRef.current = ctrl;

    // F7: Safari/iOS pre-17.4 lacks AbortSignal.timeout — use AbortController + setTimeout.
    const timeoutId = window.setTimeout(() => ctrl.abort(), 20_000);

    setTestState({ status: 'running' });
    const start = Date.now();
    try {
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, prompt: 'Reply with one word: OK', stream: false }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as OllamaGenerateResponse;
      const latencyMs = Date.now() - start;
      setTestState({
        status: 'done',
        latencyMs,
        model: ollamaModel,
        preview: (d.response ?? '').slice(0, 100),
      });
      logAdminProviderTest('ollama', ollamaModel, true, latencyMs, null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted) {
        // Treat aborted-from-unmount as silent; aborted-from-timeout as error.
        // Heuristic: if test was in flight long enough we report timeout.
        if (Date.now() - start >= 20_000) {
          const msg = 'Test timed out after 20s.';
          setTestState({ status: 'error', error: msg });
          logAdminProviderTest('ollama', ollamaModel, false, null, msg);
        }
        return;
      }
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestState({ status: 'error', error: msg });
      logAdminProviderTest('ollama', ollamaModel, false, null, msg);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [base, ollamaModel]);

  useEffect(() => () => { testAbortRef.current?.abort(); }, []);

  const filtered = useMemo(
    () => models.filter(m => m.name.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [models, debouncedSearch],
  );

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
          onClick={() => { void fetchModels(); }}
          disabled={loading || isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', (loading || isRefreshing) && 'animate-spin')} />
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
                      isActive ? 'bg-primary/10' : isPending ? 'bg-muted/70' : 'hover:bg-muted/50',
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
                      onConfirm={() => {
                        const prev = ollamaModel || null;
                        setOllamaModel(m.name);
                        logAdminModelSwitch('ollama', m.name, prev);
                        setPending(null);
                      }}
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

// ── Recent activity (admin audit log) ─────────────────────────────────────────

interface AuditEntry {
  id: string;
  actorEmail: string;
  action: 'model-switch' | 'provider-test' | string;
  payload: {
    provider?: string;
    model?: string | null;
    previousModel?: string | null;
    ok?: boolean;
    latencyMs?: number | null;
    error?: string | null;
  } | null;
  at: string;
}

interface AuditResponse {
  entries?: AuditEntry[];
  nextCursor?: string | null;
  error?: string;
}

type AuditProviderFilter = '' | 'openrouter' | 'groq' | 'gemini' | 'ollama' | 'wiseresume-sub';
type AuditActionFilter = '' | 'model-switch' | 'provider-test';

const AUDIT_PROVIDER_OPTIONS: { id: AuditProviderFilter; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'groq', label: 'Groq' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'wiseresume-sub', label: 'wiseresume-sub' },
];

const AUDIT_ACTION_OPTIONS: { id: AuditActionFilter; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'model-switch', label: 'Switch' },
  { id: 'provider-test', label: 'Test' },
];

const AUDIT_PAGE_SIZE = 50;

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return iso;
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const isSwitch = entry.action === 'model-switch';
  const isTest = entry.action === 'provider-test';
  const provider = entry.payload?.provider ?? '—';
  const model = entry.payload?.model ?? null;
  const ok = entry.payload?.ok;
  const latency = entry.payload?.latencyMs ?? null;
  const errMsg = entry.payload?.error ?? null;
  const previousModel = entry.payload?.previousModel ?? null;
  const fullTime = new Date(entry.at).toLocaleString();

  return (
    <div className="flex items-start gap-3 py-2 px-3 text-xs border-b border-border last:border-b-0">
      <div
        className="w-20 shrink-0 text-muted-foreground tabular-nums"
        title={fullTime}
      >
        {formatRelativeTime(entry.at)}
      </div>
      <div className="w-24 shrink-0">
        {isSwitch ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-2.5 h-2.5" />
            switch
          </span>
        ) : isTest ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <PlayCircle className="w-2.5 h-2.5" />
            test
          </span>
        ) : (
          <span className="text-muted-foreground">{entry.action}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-foreground truncate">{entry.actorEmail}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-foreground">{provider}</span>
          {model && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-muted-foreground truncate">{model}</span>
            </>
          )}
        </div>
        {isSwitch && previousModel && (
          <div className="text-[10px] text-muted-foreground truncate">
            previous: <span className="font-mono">{previousModel}</span>
          </div>
        )}
        {isTest && (
          <div className="text-[10px] truncate">
            {ok === true ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ ok{latency != null ? ` · ${latency}ms` : ''}
              </span>
            ) : ok === false ? (
              <span className="text-red-600 dark:text-red-400" title={errMsg ?? undefined}>
                ✗ failed{errMsg ? ` · ${errMsg}` : ''}
              </span>
            ) : (
              <span className="text-muted-foreground">unknown outcome</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentActivitySection({
  registerRefresh,
}: {
  registerRefresh: (fn: () => Promise<boolean>) => void;
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monotonic request id used to drop stale responses. Rapid filter/search
  // changes can issue overlapping fetches; without this, an older request
  // resolving after a newer one would clobber the up-to-date list.
  const fetchSeqRef = useRef(0);

  // Task #10 / Step 5: cancel the prior in-flight audit request when filters
  // change or the section unmounts. Stale-response dropping via `fetchSeqRef`
  // keeps the UI correct, but the underlying network call still completes —
  // wasting bandwidth and a server round-trip every time the admin types
  // another character into the actor-email box. AbortController stops the
  // request itself, not just the state update.
  const abortRef = useRef<AbortController | null>(null);

  // Filter state
  const [providerFilter, setProviderFilter] = useState<AuditProviderFilter>('');
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>('');
  const [failedOnly, setFailedOnly] = useState(false);
  const [actorEmail, setActorEmail] = useState('');
  const [debouncedActorEmail, setDebouncedActorEmail] = useState('');

  // Debounce the actor-email search so we don't fire a request on every
  // keystroke. 300ms feels responsive without spamming the server.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedActorEmail(actorEmail.trim()), 300);
    return () => window.clearTimeout(t);
  }, [actorEmail]);

  const buildUrl = useCallback(
    (cursor: string | null): string => {
      const params = new URLSearchParams();
      if (providerFilter) params.set('provider', providerFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (failedOnly) params.set('okOnly', 'failed');
      if (debouncedActorEmail) params.set('actorEmail', debouncedActorEmail);
      if (cursor) params.set('before', cursor);
      params.set('limit', String(AUDIT_PAGE_SIZE));
      return `/api/admin/ai-provider/audit-recent?${params.toString()}`;
    },
    [providerFilter, actionFilter, failedOnly, debouncedActorEmail],
  );

  // Fetch the first page (used on mount, filter change, and "Refresh all").
  // Each call bumps `fetchSeqRef`; older responses that resolve after a newer
  // request was issued are dropped so we never overwrite the list with stale
  // results (e.g. user types "ali" then quickly clears the search).
  const fetchEntries = useCallback(async (): Promise<boolean> => {
    const mySeq = ++fetchSeqRef.current;
    // Cancel any prior in-flight request before starting the new one.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      // Bypass the dedup helper here so each filter-change actually issues
      // (and can cancel) its own request — the deduper would coalesce
      // successive filter URLs into a single shared Response that ignores
      // our per-call AbortController.
      const res = await fetchWithToken(buildUrl(null), { signal: ctrl.signal });
      if (mySeq !== fetchSeqRef.current) return false;
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return false;
      }
      const body = (await res.json()) as AuditResponse;
      if (mySeq !== fetchSeqRef.current) return false;
      if (body.error) {
        setError(body.error);
        setEntries(body.entries ?? []);
        setNextCursor(body.nextCursor ?? null);
        return false;
      }
      setEntries(body.entries ?? []);
      setNextCursor(body.nextCursor ?? null);
      return true;
    } catch (e) {
      // Aborted requests are expected — don't surface them as errors.
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      if (mySeq !== fetchSeqRef.current) return false;
      setError(e instanceof Error ? e.message : 'Fetch failed');
      return false;
    } finally {
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  }, [buildUrl]);

  // Append the next page using the current cursor. Also tagged with the
  // current `fetchSeqRef` so a filter change mid-load-more discards the
  // appended page instead of mixing it into a fresh result set.
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const mySeq = fetchSeqRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchWithTokenDedup(buildUrl(nextCursor));
      if (mySeq !== fetchSeqRef.current) return;
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as AuditResponse;
      if (mySeq !== fetchSeqRef.current) return;
      if (body.error) {
        setError(body.error);
        return;
      }
      const more = body.entries ?? [];
      setEntries((prev) => (prev ? [...prev, ...more] : more));
      setNextCursor(body.nextCursor ?? null);
    } catch (e) {
      if (mySeq !== fetchSeqRef.current) return;
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, nextCursor, loadingMore]);

  // Reload from the top whenever any filter changes.
  useEffect(() => { void fetchEntries(); }, [fetchEntries]);
  useEffect(() => { registerRefresh(fetchEntries); }, [registerRefresh, fetchEntries]);

  // Task #10 / Step 5: cancel any in-flight audit request on unmount so
  // unmounting the panel mid-fetch doesn't leak a request.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const anyFilterActive =
    providerFilter !== '' ||
    actionFilter !== '' ||
    failedOnly ||
    debouncedActorEmail !== '';

  const clearFilters = () => {
    setProviderFilter('');
    setActionFilter('');
    setFailedOnly(false);
    setActorEmail('');
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
          {entries && (
            <span className="text-[10px] text-muted-foreground">
              ({entries.length}
              {nextCursor ? '+' : ''}
              {anyFilterActive ? ' · filtered' : ''})
            </span>
          )}
        </div>
        <button
          onClick={() => { void fetchEntries(); }}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter controls */}
      <div className="px-4 py-3 border-b border-border space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
            Provider
          </span>
          {AUDIT_PROVIDER_OPTIONS.map((opt) => (
            <button
              key={opt.id || 'all-provider'}
              type="button"
              onClick={() => setProviderFilter(opt.id)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded-full border transition-colors',
                providerFilter === opt.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
            Action
          </span>
          {AUDIT_ACTION_OPTIONS.map((opt) => (
            <button
              key={opt.id || 'all-action'}
              type="button"
              onClick={() => setActionFilter(opt.id)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded-full border transition-colors',
                actionFilter === opt.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-2 text-[11px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={failedOnly}
              onChange={(e) => setFailedOnly(e.target.checked)}
              className="h-3 w-3 rounded border-border"
            />
            Failed tests only
          </label>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              placeholder="Search actor email…"
              className="w-full pl-7 pr-2 py-1 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {anyFilterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="px-1">
        {error && (
          <div className="m-3 flex items-start gap-2 p-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Failed to load audit log: {error}</span>
          </div>
        )}
        {entries === null && loading && (
          <div className="flex items-center gap-2 py-6 px-3 text-xs text-muted-foreground justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading…
          </div>
        )}
        {entries && entries.length === 0 && !loading && (
          <div className="flex items-center gap-2 py-6 px-3 text-xs text-muted-foreground justify-center">
            <Clock className="w-3.5 h-3.5" />
            {anyFilterActive
              ? 'No entries match the current filters.'
              : 'No admin activity recorded yet.'}
          </div>
        )}
        {entries && entries.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {entries.map((e) => <AuditEntryRow key={e.id} entry={e} />)}
            <div className="flex items-center justify-center py-2">
              {nextCursor ? (
                <button
                  type="button"
                  onClick={() => { void loadMore(); }}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  End of activity log
                </span>
              )}
            </div>
          </div>
        )}
      </div>
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
  const [headerRefreshing, setHeaderRefreshing] = useState(false);

  // F8: each sub-panel registers its own refresh function on mount; the header
  // "Refresh all" button awaits them all (Promise.allSettled, U3).
  const subPanelRefreshRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerSubPanelRefresh = useCallback((fn: () => Promise<boolean>) => {
    subPanelRefreshRef.current = fn;
  }, []);

  // The Recent activity section also registers a refresh callback so the
  // header "Refresh all" button reloads the audit log together with the rest
  // of the panel (per task acceptance: "Entries refresh together with the
  // rest of the panel").
  const auditRefreshRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerAuditRefresh = useCallback((fn: () => Promise<boolean>) => {
    auditRefreshRef.current = fn;
  }, []);

  // U3: each top-level fetcher returns a boolean indicating success so
  // `handleRefreshAll` can surface a single consolidated toast on failure
  // while still updating inline UI state with error details.
  const fetchBreakerStatus = useCallback(async (): Promise<boolean> => {
    setBreakerLoading(true);
    try {
      const res = await edgeFunctions.functions.invoke('ai-breaker-status', {
        headers: devKitAuthHeaders(),
        body: {},
      });
      if (!res.error) {
        const body = res.data as BreakerStatusResponse | null;
        setBreaker(Array.isArray(body?.providers) ? body!.providers : []);
        return true;
      }
      setBreaker([]);
      return false;
    } catch {
      setBreaker([]);
      return false;
    } finally {
      setBreakerLoading(false);
    }
  }, []);

  // Task #24: refresh tasks now report a structured outcome via a shared
  // ref so handleRefreshAll can dedupe identical failure classes (the most
  // common one being a stale session triggering a 401 across every admin
  // endpoint at once — previously surfaced as "5 of 6 failed").
  const refreshOutcomesRef = useRef<{ task: string; status: number | 'network' | 'ok' }[]>([]);
  const recordOutcome = (task: string, status: number | 'network' | 'ok') => {
    refreshOutcomesRef.current.push({ task, status });
  };

  const fetchManagedOR = useCallback(async (): Promise<boolean> => {
    // P3: keep prior data on screen during refresh
    setManagedOR(prev => prev ?? null);
    try {
      const res = await fetchWithTokenDedup('/api/admin/ai-provider/openrouter-status');
      if (!res.ok) {
        setManagedOR({ configured: true, error: `HTTP ${res.status}` });
        recordOutcome('openrouter-status', res.status);
        return false;
      }
      const data = await res.json() as ManagedORStatus;
      setManagedOR(data);
      recordOutcome('openrouter-status', 'ok');
      return true;
    } catch (e: unknown) {
      setManagedOR({ configured: true, error: e instanceof Error ? e.message : 'Fetch failed' });
      recordOutcome('openrouter-status', 'network');
      return false;
    }
  }, []);

  const fetchManagedGroq = useCallback(async (): Promise<boolean> => {
    setManagedGroq(prev => prev ?? null);
    try {
      const res = await fetchWithTokenDedup('/api/admin/ai-provider/groq-models');
      if (!res.ok) {
        setManagedGroq({ configured: true, models: [], error: `HTTP ${res.status}` });
        recordOutcome('groq-models', res.status);
        return false;
      }
      const data = await res.json() as ManagedGroqStatus;
      setManagedGroq(data);
      recordOutcome('groq-models', 'ok');
      return true;
    } catch (e: unknown) {
      setManagedGroq({ configured: true, models: [], error: e instanceof Error ? e.message : 'Fetch failed' });
      recordOutcome('groq-models', 'network');
      return false;
    }
  }, []);

  const fetchGroqUsage = useCallback(async (): Promise<boolean> => {
    setGroqUsage(prev => prev ?? null);
    try {
      const res = await fetchWithTokenDedup('/api/admin/ai-provider/groq-usage');
      if (!res.ok) {
        setGroqUsage({ configured: true, error: `HTTP ${res.status}` });
        recordOutcome('groq-usage', res.status);
        return false;
      }
      const data = await res.json() as GroqUsage;
      setGroqUsage(data);
      // groq-usage upstream is a known-stub (returns `error` even when HTTP 200);
      // do not penalise refresh-all when the wrapper itself succeeded.
      recordOutcome('groq-usage', 'ok');
      return true;
    } catch (e: unknown) {
      setGroqUsage({ configured: true, error: e instanceof Error ? e.message : 'Fetch failed' });
      recordOutcome('groq-usage', 'network');
      return false;
    }
  }, []);

  useEffect(() => {
    void fetchBreakerStatus();
    void fetchManagedOR();
    void fetchManagedGroq();
    void fetchGroqUsage();
  }, [fetchBreakerStatus, fetchManagedOR, fetchManagedGroq, fetchGroqUsage]);

  // U2: poll breaker status every 20s while the page is visible.
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id != null) return;
      id = window.setInterval(() => { void fetchBreakerStatus(); }, 20_000);
    };
    const stop = () => {
      if (id != null) { window.clearInterval(id); id = null; }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [fetchBreakerStatus]);

  // A2: memoise the lookup so each render doesn't allocate a fresh closure
  // and child panels keep referential equality on `breakerRow` props.
  const getBreakerRow = useMemo(() => {
    return (tab: ProviderTab): BreakerRow | null => {
      const key = BREAKER_ID[tab];
      if (!key || !breakerRows) return null;
      return breakerRows.find(r => r.provider === key) ?? null;
    };
  }, [breakerRows]);

  const TABS: { id: ProviderTab; label: string }[] = [
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'openrouter2', label: 'OpenRouter 2' },
    { id: 'groq', label: 'Groq' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'ollama', label: 'Ollama' },
  ];

  // Task #10 / Step 4: throttle the header "Refresh all" button to at most
  // one fan-out per 3 seconds. The button already disables itself while a
  // refresh is in flight, but a long-running task (slow upstream, etc.) can
  // resolve and re-enable mid-rage-click; this guard catches the rapid
  // sequential case so we don't fire 6+ duplicate fan-outs in a couple
  // seconds against managed-OR / Groq / Gemini / breaker / audit endpoints.
  const REFRESH_ALL_THROTTLE_MS = 3000;
  const lastRefreshAllAtRef = useRef(0);

  // F8 + U3: header button refreshes EVERYTHING currently visible —
  // breaker status + the active sub-panel's own data — and surfaces any
  // failures in a single toast instead of swallowing them.
  const handleRefreshAll = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshAllAtRef.current < REFRESH_ALL_THROTTLE_MS) {
      // Silently swallow — the disabled state already conveys "in progress",
      // and a toast on every spurious click would be noisier than helpful.
      return;
    }
    lastRefreshAllAtRef.current = now;
    setHeaderRefreshing(true);
    // Reset the per-task outcome buffer so we only see THIS run's results
    // when classifying failures into a single, accurate toast below.
    refreshOutcomesRef.current = [];
    // Each task resolves to `true` on success, `false` on a handled error,
    // or rejects on an unexpected throw — all three count toward `failures`.
    const tasks: Promise<boolean>[] = [
      fetchBreakerStatus(),
      fetchManagedOR(),
      fetchManagedGroq(),
      fetchGroqUsage(),
    ];
    if (subPanelRefreshRef.current) tasks.push(subPanelRefreshRef.current());
    if (auditRefreshRef.current) tasks.push(auditRefreshRef.current());
    const results = await Promise.allSettled(tasks);
    setHeaderRefreshing(false);

    // Task #24: classify failures so the toast tells the user something
    // actionable instead of "5 of 6 failed". The most common cause is a
    // stale session: every admin-gated endpoint returns 401/403 at once,
    // which used to surface as N-of-N failures even though there was
    // really only ONE problem (re-login).
    let failures = 0;
    results.forEach((r) => {
      if (r.status === 'rejected') {
        failures += 1;
        console.error('[ai-provider-panel] refresh task threw:', r.reason);
      } else if (r.value === false) {
        failures += 1;
      }
    });
    if (failures === 0) return;

    const outcomes = refreshOutcomesRef.current;
    const authFailures = outcomes.filter(o => o.status === 401 || o.status === 403);
    if (authFailures.length > 0 && authFailures.length === outcomes.filter(o => o.status !== 'ok').length) {
      // EVERY non-ok task is auth-class — single, clear message.
      toast.error('Session expired — please re-authenticate to refresh DevKit data.');
      return;
    }
    if (authFailures.length > 0) {
      toast.error(`Session expired for ${authFailures.length} task${authFailures.length === 1 ? '' : 's'}; ${failures - authFailures.length} other failure${failures - authFailures.length === 1 ? '' : 's'} — check inline errors.`);
      return;
    }
    toast.error(`${failures} of ${results.length} refresh task${results.length === 1 ? '' : 's'} failed — check inline errors for details.`);
  }, [fetchBreakerStatus, fetchManagedOR, fetchManagedGroq, fetchGroqUsage]);

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
          onClick={() => { void handleRefreshAll(); }}
          disabled={breakerLoading || headerRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', (breakerLoading || headerRefreshing) && 'animate-spin')} />
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

        {/* F4: keying the rendered sub-panel by `activeTab` remounts it on tab
            switch, which discards stale `testState` from the previous panel. */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {activeTab === 'openrouter' && (
            <OpenRouterPanel
              key="openrouter"
              breakerRow={getBreakerRow('openrouter')}
              managedStatus={managedOR}
              onManagedRefresh={() => fetchManagedOR()}
              registerRefresh={registerSubPanelRefresh}
            />
          )}
          {activeTab === 'openrouter2' && (
            <OpenRouter2Panel
              key="openrouter2"
              breakerRow={getBreakerRow('openrouter2')}
              registerRefresh={registerSubPanelRefresh}
            />
          )}
          {activeTab === 'groq' && (
            <GroqPanel
              key="groq"
              breakerRow={getBreakerRow('groq')}
              managedStatus={managedGroq}
              groqUsage={groqUsage}
              registerRefresh={registerSubPanelRefresh}
              onManagedRefresh={() => fetchManagedGroq()}
              onUsageRefresh={() => fetchGroqUsage()}
            />
          )}
          {activeTab === 'gemini' && (
            <GeminiPanel
              key="gemini"
              breakerRow={getBreakerRow('gemini')}
              registerRefresh={registerSubPanelRefresh}
            />
          )}
          {activeTab === 'ollama' && (
            <OllamaPanel
              key="ollama"
              breakerRow={getBreakerRow('ollama')}
              registerRefresh={registerSubPanelRefresh}
            />
          )}
        </div>
      </div>

      {/* Recent activity — admin model-switch and provider-test audit log */}
      <RecentActivitySection registerRefresh={registerAuditRefresh} />
    </div>
  );
}
