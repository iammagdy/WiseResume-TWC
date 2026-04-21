import { useState, useCallback, useEffect, useRef } from 'react';
import { Zap, AlertTriangle, WifiOff, Settings, RefreshCw } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useAIHealth, AIHealthStatus } from '@/hooks/useAIHealth';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { cn } from '@/lib/utils';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { apiFnUrl } from '@/lib/apiFnUrl';

type PingState = 'idle' | 'pinging' | 'done';

interface PingResult {
  latencyMs: number | null;
  status: AIHealthStatus;
  errorCode: number | null;
  // True when the 429 came from our OWN ai-health endpoint throttling
  // the badge (too many pings from this user across tabs), as opposed
  // to a real upstream provider 429. Used to render an honest label
  // instead of a misleading "Rate limited" pill.
  selfThrottled?: boolean;
}

const STATUS_CONFIG: Record<AIHealthStatus, {
  label: string;
  icon: typeof Zap;
  dotClass: string;
  textClass: string;
  badgeBg: string;
}> = {
  healthy: {
    label: 'AI Online',
    icon: Zap,
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15',
  },
  degraded: {
    label: 'AI Slow',
    icon: AlertTriangle,
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15',
  },
  down: {
    label: 'AI Unavailable',
    icon: WifiOff,
    dotClass: 'bg-red-400',
    textClass: 'text-red-400',
    badgeBg: 'bg-red-500/10 border-red-500/25 hover:bg-red-500/15',
  },
};

function latencyQuality(ms: number | null): { label: string; fraction: number; colorClass: string } {
  if (ms === null) return { label: '—', fraction: 0, colorClass: 'bg-muted-foreground/30' };
  if (ms < 3000) return { label: 'Fast', fraction: ms / 3000, colorClass: 'bg-emerald-400' };
  if (ms < 8000) return { label: 'Moderate', fraction: 0.5 + (ms - 3000) / 10000, colorClass: 'bg-amber-400' };
  return { label: 'Slow', fraction: 1, colorClass: 'bg-red-400' };
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

function errorLabel(code: number | null, selfThrottled?: boolean): string {
  if (code === null) return '';
  // Distinguish a self-throttled health endpoint (badge pinging too often
  // across tabs/reloads) from a real upstream provider 429 so the user
  // doesn't see "Rate limited" when the AI itself is fine.
  if (code === 429) return selfThrottled ? 'Health check throttled' : 'Rate limited';
  if (code === 402) return 'Credits exhausted';
  if (code === 408) return 'Request timed out';
  return `Error ${code}`;
}

function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    wiseresume: 'WiseResume AI',
    gemini: 'Gemini',
    ollama: 'Ollama',
    openrouter: 'OpenRouter',
  };
  return map[provider] ?? provider;
}

export function AIHealthBadge() {
  const { status: storeStatus, provider } = useAIHealth();
  const { recordSuccess, recordFailure, recordProvider } = useAIHealthStore();
  const storeResults = useAIHealthStore((s) => s.results);
  const lastStoreEventAt = storeResults.length > 0 ? storeResults[storeResults.length - 1].timestamp : 0;
  const [showSettings, setShowSettings] = useState(false);
  const [pingState, setPingState] = useState<PingState>('idle');
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pingResultAt, setPingResultAt] = useState<number>(0);

  const runPing = useCallback(async () => {
    setPingState('pinging');
    try {
      const token = await getSupabaseToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiFnUrl(`ai-health`), {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const code = res.status;
        // Try to read body — a 429 from ai-health itself returns
        // `{ error: 'health_throttled' }` which is NOT an upstream issue.
        // We label and tally these differently so the badge stops shouting
        // "Rate limited" when the AI is actually fine.
        let selfThrottled = false;
        try {
          const body = await res.json();
          if (code === 429 && body?.error === 'health_throttled') {
            selfThrottled = true;
          }
        } catch {
          // body wasn't JSON — leave selfThrottled false
        }
        if (!selfThrottled) {
          recordFailure(code);
        }
        // For self-throttle, keep status as the previous known state
        // (don't slam to 'down') — we just couldn't probe right now.
        setPingResult({
          latencyMs: null,
          status: selfThrottled ? (storeStatus ?? 'healthy') : 'down',
          errorCode: code,
          selfThrottled,
        });
        setPingResultAt(Date.now());
        setPingState('done');
        return;
      }

      const data = await res.json();
      const latency: number = data.latencyMs ?? 0;
      const pingStatus: AIHealthStatus = data.status ?? 'healthy';
      const pingErrorCode: number | null = data.errorCode ?? null;
      const pingProvider: string = data.provider ?? 'wiseresume';

      recordProvider(pingProvider);
      if (pingStatus === 'down') {
        recordFailure(pingErrorCode ?? 0);
      } else {
        recordSuccess(latency);
      }

      setPingResult({ latencyMs: latency > 0 ? latency : null, status: pingStatus, errorCode: pingErrorCode });
      setPingResultAt(Date.now());
      setPingState('done');
    } catch {
      recordFailure(0);
      setPingResult({ latencyMs: null, status: 'down', errorCode: 0 });
      setPingResultAt(Date.now());
      setPingState('done');
    }
  }, [recordSuccess, recordFailure, recordProvider, storeStatus]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open && pingState !== 'pinging') {
      setPingResult(null);
      runPing();
    }
  }, [pingState, runPing]);

  // Auto-probe on mount, then every 90 seconds, and when the window regains
  // focus. Polling is paused while the tab is hidden — there's no point
  // probing AI health for a user who isn't looking, and it wastes both our
  // health-endpoint quota and the user's network/CPU. When the tab becomes
  // visible again we ping immediately (subject to the 30s debounce) and
  // restart the interval.
  const runPingRef = useRef(runPing);
  const lastPingAtRef = useRef(0);
  useEffect(() => { runPingRef.current = runPing; }, [runPing]);
  useEffect(() => {
    let intervalId: number | null = null;

    const ping = () => {
      const now = Date.now();
      // Debounce: never ping more than once per 30s regardless of trigger
      if (now - lastPingAtRef.current < 30_000) return;
      lastPingAtRef.current = now;
      runPingRef.current();
    };

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(ping, 90_000);
    };
    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        ping();
        startPolling();
      }
    };

    // Initial probe + interval — only if the tab is visible right now.
    if (document.visibilityState !== 'hidden') {
      ping();
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', ping);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', ping);
    };
  }, []);

  // Status precedence: whichever signal (real chat outcome via store, or
  // explicit ping) is more recent wins. Ensures recent chat failures
  // immediately flip the badge instead of being masked by a stale "healthy"
  // ping snapshot.
  const useStoreStatus = lastStoreEventAt > 0 && lastStoreEventAt > pingResultAt;
  const displayStatus: AIHealthStatus =
    useStoreStatus ? storeStatus : (pingResult ? pingResult.status : storeStatus);
  const config = STATUS_CONFIG[displayStatus];
  const Icon = config.icon;

  const displayLatency = pingResult?.latencyMs ?? null;
  const quality = latencyQuality(displayLatency);
  const displayError = pingResult?.errorCode ?? null;

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold',
            'transition-all duration-150 active:scale-95 cursor-pointer select-none min-h-[30px]',
            config.badgeBg
          )}
          aria-label={`AI Status: ${config.label}`}
        >
          <span className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            config.dotClass,
            displayStatus !== 'healthy' && 'animate-pulse shadow-[0_0_6px_2px_currentColor]'
          )} />
          <span className={cn('leading-none', config.textClass)}>{config.label}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[260px] p-0 overflow-hidden border border-border/60 shadow-xl"
        align="end"
        sideOffset={10}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 border-b border-border/40',
          displayStatus === 'healthy' ? 'bg-emerald-500/5' :
          displayStatus === 'degraded' ? 'bg-amber-500/5' : 'bg-red-500/5'
        )}>
          <Icon className={cn('w-4 h-4 flex-shrink-0', config.textClass)} />
          <span className="text-sm font-semibold text-foreground leading-none">{config.label}</span>
          <span className={cn(
            'ml-auto w-2 h-2 rounded-full flex-shrink-0',
            config.dotClass,
            displayStatus !== 'healthy' && 'animate-pulse'
          )} />
        </div>

        {/* Latency section */}
        <div className="px-4 py-3 space-y-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Response Time</span>
            <button
              onClick={() => { setPingResult(null); runPing(); }}
              disabled={pingState === 'pinging'}
              className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary disabled:opacity-40 transition-colors"
              aria-label="Ping again"
            >
              <RefreshCw className={cn('w-3 h-3', pingState === 'pinging' && 'animate-spin')} />
              <span>{pingState === 'pinging' ? 'Pinging…' : 'Ping'}</span>
            </button>
          </div>

          {/* Large latency number */}
          <div className="flex items-baseline gap-1.5">
            {pingState === 'pinging' ? (
              <span className="text-2xl font-bold text-foreground/30 tabular-nums animate-pulse">—</span>
            ) : (
              <span className={cn(
                'text-2xl font-bold tabular-nums',
                displayLatency === null ? 'text-foreground/30' : config.textClass
              )}>
                {formatLatency(displayLatency)}
              </span>
            )}
            {pingState === 'done' && displayLatency !== null && (
              <span className="text-xs text-muted-foreground">{quality.label}</span>
            )}
          </div>

          {/* Quality bar */}
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                pingState === 'pinging' ? 'bg-muted-foreground/20 w-1/3 animate-pulse' : quality.colorClass
              )}
              style={pingState !== 'pinging' ? { width: `${quality.fraction * 100}%` } : undefined}
            />
          </div>

          {/* Error label if any */}
          {pingState === 'done' && displayError && (
            <p className="text-[11px] text-red-400/80">{errorLabel(displayError, pingResult?.selfThrottled)}</p>
          )}
        </div>

        {/* Provider row */}
        <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Engine</span>
          <span className="text-[11px] font-medium text-foreground">{providerLabel(provider)}</span>
        </div>

        {/* Settings button */}
        <div className="px-3 py-2.5">
          <button
            onClick={() => setShowSettings(true)}
            className={cn(
              'flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg',
              'text-xs font-medium text-foreground/70 hover:text-foreground',
              'bg-muted/40 hover:bg-muted/70 transition-colors'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Open AI Settings
          </button>
        </div>
      </PopoverContent>

      <AISettingsSheet open={showSettings} onOpenChange={setShowSettings} />
    </Popover>
  );
}
