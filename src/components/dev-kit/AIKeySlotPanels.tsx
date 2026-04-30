import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Send, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError, EdgeFunctionError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
import { cn } from '@/lib/utils';

type Provider = 'openrouter' | 'groq' | 'deepseek';
type Slot = 1 | 2 | 3;

interface KeyEntry {
  provider: Provider;
  slot: Slot;
  configured: boolean;
  masked: string | null;
  model: string;
  /** The actual env-var name for this slot (may differ for DeepSeek slot 1). */
  envName?: string;
}

interface InspectResponse {
  keys?: KeyEntry[];
  modelOptions?: Partial<Record<Provider, string[]>>;
  defaultModels?: Partial<Record<Provider, string>>;
}

interface TestResult {
  ok: boolean;
  latencyMs: number;
  providerUsed?: string;
  model?: string;
  response?: string;
  error?: string;
  testedAt: number;
}

interface KeySlotViewProps {
  entry: KeyEntry;
  result: TestResult | null;
  testing: boolean;
  modelOptions: string[];
  saving: boolean;
  saveError: string | null;
  onTest: () => void;
  onModelChange: (model: string) => void;
}

function defaultEnvName(provider: Provider, slot: Slot): string {
  if (provider === 'openrouter') return `OPENROUTER_KEY_${slot}`;
  if (provider === 'groq') return `GROQ_KEY_${slot}`;
  return slot === 1 ? 'DEEPSEEK_KEY' : `DEEPSEEK_KEY_${slot}`;
}

function providerDisplayName(provider: Provider): string {
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'groq') return 'Groq';
  return 'DeepSeek';
}

function defaultModelForProvider(provider: Provider): string {
  if (provider === 'openrouter') return 'meta-llama/llama-3.3-70b-instruct:free';
  if (provider === 'groq') return 'llama-3.3-70b-versatile';
  // `deepseek-chat` is deprecated 2026/07/24 — switched to the v4-flash alias.
  return 'deepseek-v4-flash';
}

function KeySlotView({
  entry,
  result,
  testing,
  modelOptions,
  saving,
  saveError,
  onTest,
  onModelChange,
}: KeySlotViewProps) {
  const providerLabel = providerDisplayName(entry.provider);
  const envName = entry.envName ?? defaultEnvName(entry.provider, entry.slot);

  // Always include the current model in the options list so a previously-saved
  // value that's no longer in the curated allow-list still renders correctly.
  const dropdownOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of [entry.model, ...modelOptions]) {
      if (m && !seen.has(m)) { seen.add(m); out.push(m); }
    }
    return out;
  }, [entry.model, modelOptions]);

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {entry.configured ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                <XCircle className="w-3 h-3 mr-1" />
                Not configured
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono">{envName}</span>
          </div>
          <Button size="sm" onClick={onTest} disabled={!entry.configured || testing}>
            {testing ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
            ) : (
              <><Send className="w-3.5 h-3.5 mr-1.5" />Send test request</>
            )}
          </Button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground mb-0.5">Key preview</dt>
            <dd className="font-mono text-foreground">
              {entry.masked ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-0.5 flex items-center gap-1.5">
              Model
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            </dt>
            <dd>
              <Select
                value={entry.model}
                onValueChange={onModelChange}
                disabled={saving || dropdownOptions.length === 0}
              >
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder="Select a model…" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs font-mono">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saveError && (
                <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Used for the test request; saved per slot in Supabase.
              </p>
            </dd>
          </div>
        </dl>

        {!entry.configured && (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            Set <span className="font-mono">{envName}</span> in Supabase Edge Function Secrets to enable this slot.
          </p>
        )}
      </div>

      {/* Last test result */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground">Last test result</h4>
          {result && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {new Date(result.testedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {!result && (
          <p className="text-xs text-muted-foreground">
            No test run yet. Click <span className="font-medium">Send test request</span> to ping {providerLabel} with this key.
          </p>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {result.ok ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Success
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {result.latencyMs}ms
              </span>
              {result.providerUsed && (
                <span className="text-[11px] font-mono text-muted-foreground">{result.providerUsed}</span>
              )}
              {result.model && (
                <span
                  className="text-[11px] font-mono text-muted-foreground break-all"
                  title="Model the function actually called"
                >
                  → {result.model}
                </span>
              )}
            </div>

            {result.ok && result.response && (
              <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-foreground whitespace-pre-wrap break-words">
                {result.response}
              </div>
            )}

            {!result.ok && result.error && (
              <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-words">
                {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProviderPanelProps {
  provider: Provider;
}

function ProviderPanel({ provider }: ProviderPanelProps) {
  const isMounted = useIsMounted();
  const { isUnlocked, lock } = useDevKitSession();
  const [activeSlot, setActiveSlot] = useState<Slot>(1);
  const [keys, setKeys] = useState<KeyEntry[] | null>(null);
  const [modelOptionsByProvider, setModelOptionsByProvider] =
    useState<Partial<Record<Provider, string[]>>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [serverErrorDetail, setServerErrorDetail] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const fetchKeys = useCallback(async () => {
    if (!isUnlocked) return;
    setLoading(true);
    setLoadError(null);
    setSessionExpired(false);
    setServerErrorDetail(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
      });
      const result = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      if (!isMounted()) return;
      setKeys(result.keys ?? []);
      if (result.modelOptions) setModelOptionsByProvider(result.modelOptions);
    } catch (e) {
      if (!isMounted()) return;
      if (e instanceof EdgeFunctionError && e.status === 401) {
        setSessionExpired(true);
        setServerErrorDetail(e.message || 'Unauthorized');
        setLoadError('Your DevKit session is no longer valid on the server. Sign in again with your full credentials to issue a new session token.');
      } else {
        setLoadError(formatEdgeError(e, 'Failed to load AI key status'));
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted, isUnlocked]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleResignIn = useCallback(() => {
    lock();
  }, [lock]);

  const providerKeys = useMemo(
    () => (keys ?? []).filter(k => k.provider === provider).sort((a, b) => a.slot - b.slot),
    [keys, provider],
  );

  const activeEntry = providerKeys.find(k => k.slot === activeSlot)
    ?? {
      provider,
      slot: activeSlot,
      configured: false,
      masked: null,
      model: defaultModelForProvider(provider),
      envName: defaultEnvName(provider, activeSlot),
    };

  const resultKey = `${provider}:${activeSlot}`;

  const runTest = useCallback(async () => {
    setTestingKey(resultKey);
    const startedAt = Date.now();
    try {
      const tuple = await edgeFunctions.functions.invoke('ai-test', {
        headers: devKitAuthHeaders(),
        body: {
          provider,
          keyIndex: activeSlot,
          prompt: 'Say hello in one short sentence.',
          // Per-slot model is stored on the entry; the edge function validates
          // it against the curated allow-list and falls back to the default
          // when missing or unknown.
          model: activeEntry.model,
        },
      });
      if (tuple.error) {
        if (!isMounted()) return;
        setResults(prev => ({
          ...prev,
          [resultKey]: {
            ok: false,
            latencyMs: Date.now() - startedAt,
            error: tuple.error?.message ?? 'Edge function error',
            testedAt: Date.now(),
          },
        }));
        return;
      }
      const data = (tuple.data ?? {}) as {
        success?: boolean;
        providerUsed?: string;
        model?: string;
        latencyMs?: number;
        response?: string;
        error?: string;
      };
      if (!isMounted()) return;
      if (data.success) {
        setResults(prev => ({
          ...prev,
          [resultKey]: {
            ok: true,
            latencyMs: data.latencyMs ?? (Date.now() - startedAt),
            providerUsed: data.providerUsed,
            model: data.model,
            response: data.response,
            testedAt: Date.now(),
          },
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [resultKey]: {
            ok: false,
            latencyMs: data.latencyMs ?? (Date.now() - startedAt),
            providerUsed: data.providerUsed,
            error: data.error || 'Unknown failure',
            testedAt: Date.now(),
          },
        }));
      }
    } catch (e) {
      if (!isMounted()) return;
      setResults(prev => ({
        ...prev,
        [resultKey]: {
          ok: false,
          latencyMs: Date.now() - startedAt,
          error: formatEdgeError(e, 'Test request failed'),
          testedAt: Date.now(),
        },
      }));
    } finally {
      if (isMounted()) setTestingKey(null);
    }
  }, [provider, activeSlot, resultKey, isMounted, activeEntry.model]);

  const handleModelChange = useCallback(async (newModel: string) => {
    if (!newModel || newModel === activeEntry.model) return;
    const slotKey = `${provider}:${activeSlot}`;
    const previous = activeEntry.model;

    // Optimistic update so the dropdown reflects the new value immediately.
    setKeys(prev => (prev ?? []).map(k =>
      k.provider === provider && k.slot === activeSlot ? { ...k, model: newModel } : k
    ));
    setSavingSlotKey(slotKey);
    setSaveErrors(prev => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });

    try {
      const tuple = await edgeFunctions.functions.invoke('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
        body: { provider, slot: activeSlot, model: newModel },
      });
      const data = unwrapAdminResponse<{ slotModels?: Record<string, string> }>(tuple, 'inspect-ai-keys');
      // Reconcile against canonical server state — picks up concurrent edits
      // to OTHER slots that landed between our last fetch and this save.
      if (data?.slotModels && isMounted()) {
        setKeys(prev => (prev ?? []).map(k => {
          const saved = data.slotModels?.[`${k.provider}:${k.slot}`];
          return saved ? { ...k, model: saved } : k;
        }));
      }
    } catch (e) {
      if (!isMounted()) return;
      // Roll back the optimistic update and surface the error inline.
      setKeys(prev => (prev ?? []).map(k =>
        k.provider === provider && k.slot === activeSlot ? { ...k, model: previous } : k
      ));
      setSaveErrors(prev => ({
        ...prev,
        [slotKey]: formatEdgeError(e, 'Failed to save model selection'),
      }));
    } finally {
      if (isMounted()) setSavingSlotKey(curr => (curr === slotKey ? null : curr));
    }
  }, [provider, activeSlot, activeEntry.model, isMounted]);

  const configuredCount = providerKeys.filter(k => k.configured).length;
  const slotKeyForActive = `${provider}:${activeSlot}`;
  const modelOptionsForProvider = modelOptionsByProvider[provider] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${configuredCount} of 3 keys configured`}
        </div>
        <Button variant="outline" size="sm" onClick={fetchKeys} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loadError && (
        <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 space-y-2">
          <p>{loadError}</p>
          {sessionExpired && serverErrorDetail && (
            <p className="font-mono text-[11px] opacity-70">
              Server response: {serverErrorDetail}
            </p>
          )}
          {sessionExpired && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleResignIn}
              className="gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in again
            </Button>
          )}
        </div>
      )}

      {/* Sub-tabs: Key 1 / Key 2 / Key 3 */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {([1, 2, 3] as Slot[]).map((slot) => {
            const entry = providerKeys.find(k => k.slot === slot);
            const isActive = activeSlot === slot;
            return (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className={cn(
                  'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                Key {slot}
                {entry?.configured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <KeySlotView
        entry={activeEntry}
        result={results[resultKey] ?? null}
        testing={testingKey === resultKey}
        modelOptions={modelOptionsForProvider}
        saving={savingSlotKey === slotKeyForActive}
        saveError={saveErrors[slotKeyForActive] ?? null}
        onTest={runTest}
        onModelChange={handleModelChange}
      />
    </div>
  );
}

export function OpenRouterPanel() {
  return <ProviderPanel provider="openrouter" />;
}

export function GroqPanel() {
  return <ProviderPanel provider="groq" />;
}

export function DeepSeekPanel() {
  return <ProviderPanel provider="deepseek" />;
}
