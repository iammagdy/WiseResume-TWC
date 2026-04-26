import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Send, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError, EdgeFunctionError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
import { cn } from '@/lib/utils';

type Provider = 'openrouter' | 'groq';
type Slot = 1 | 2 | 3;

interface KeyEntry {
  provider: Provider;
  slot: Slot;
  configured: boolean;
  masked: string | null;
  model: string;
}

interface InspectResponse {
  keys?: KeyEntry[];
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
  onTest: () => void;
}

function KeySlotView({ entry, result, testing, onTest }: KeySlotViewProps) {
  const providerLabel = entry.provider === 'openrouter' ? 'OpenRouter' : 'Groq';
  const envName = `${entry.provider === 'openrouter' ? 'OPENROUTER' : 'GROQ'}_KEY_${entry.slot}`;

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
            <dt className="text-muted-foreground mb-0.5">Free model</dt>
            <dd className="font-mono text-foreground break-all">{entry.model}</dd>
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
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [serverErrorDetail, setServerErrorDetail] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

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
    // lock() clears the in-memory token AND the remembered token in
    // localStorage, then sets isUnlocked=false so the DevKit lock screen
    // re-appears with the full email/password/TOTP form. This is the only
    // way to recover from a server-side 401: the existing token is bad and
    // a brand-new one must be issued by verify-dev-kit.
    lock();
  }, [lock]);

  const providerKeys = useMemo(
    () => (keys ?? []).filter(k => k.provider === provider).sort((a, b) => a.slot - b.slot),
    [keys, provider],
  );

  const activeEntry = providerKeys.find(k => k.slot === activeSlot)
    ?? { provider, slot: activeSlot, configured: false, masked: null, model: provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct:free' : 'llama-3.3-70b-versatile' };

  const resultKey = `${provider}:${activeSlot}`;

  const runTest = useCallback(async () => {
    setTestingKey(resultKey);
    const startedAt = Date.now();
    try {
      const tuple = await edgeFunctions.functions.invoke('ai-test', {
        headers: devKitAuthHeaders(),
        body: { provider, keyIndex: activeSlot, prompt: 'Say hello in one short sentence.' },
      });
      // ai-test returns { success, providerUsed, model, latencyMs, response } on
      // success or { success: false, error, latencyMs } on failure. The latter
      // can come back via the tuple's `data` payload (transport ok, app failure)
      // or the `error` field when the function returned a non-2xx. We surface
      // both as a Failed result without throwing.
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
  }, [provider, activeSlot, resultKey, isMounted]);

  const configuredCount = providerKeys.filter(k => k.configured).length;

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
        onTest={runTest}
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
