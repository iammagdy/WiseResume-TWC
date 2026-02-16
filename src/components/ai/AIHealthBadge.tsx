import { useEffect, useRef } from 'react';
import { Activity, Zap, AlertTriangle, WifiOff, RefreshCw, Key } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIHealth, AIHealthStatus } from '@/hooks/useAIHealth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<Exclude<AIHealthStatus, 'checking'>, {
  dot: string;
  label: string;
  icon: typeof Activity;
  bg: string;
}> = {
  healthy: {
    dot: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]',
    label: 'AI Online',
    icon: Zap,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  degraded: {
    dot: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.4)]',
    label: 'AI Slow',
    icon: AlertTriangle,
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  down: {
    dot: 'bg-red-400 shadow-[0_0_8px_2px_rgba(248,113,113,0.4)]',
    label: 'AI Unavailable',
    icon: WifiOff,
    bg: 'bg-red-500/10 border-red-500/20',
  },
};

export function AIHealthBadge() {
  const { status, latencyMs, lastChecked, provider, errorCode, refetch, prevStatusRef } = useAIHealth();
  const navigate = useNavigate();
  const hasSeenHealthyRef = useRef(false);

  // Track if we've ever seen healthy
  useEffect(() => {
    if (status === 'healthy') {
      hasSeenHealthyRef.current = true;
    }
  }, [status]);

  // Only toast on transitions FROM healthy to degraded/down
  useEffect(() => {
    if (!hasSeenHealthyRef.current) return;
    const prev = prevStatusRef.current;
    if (prev === 'healthy' || prev === 'checking') {
      if (status === 'degraded') {
        toast.warning('AI services are running slower than usual', { duration: 4000 });
      } else if (status === 'down') {
        toast.error('AI services are currently unavailable', { duration: 4000 });
      }
    }
  }, [status, prevStatusRef]);

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass-elevated">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="w-12 h-3" />
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const lastCheckedLabel = lastChecked
    ? `${Math.round((Date.now() - lastChecked.getTime()) / 1000)}s ago`
    : 'Never';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium',
            'transition-all active:scale-95 min-h-[28px]',
            config.bg
          )}
          aria-label={`AI Status: ${config.label}`}
        >
          <span className={cn('w-2 h-2 rounded-full animate-pulse', config.dot)} />
          <span className="text-foreground/80">{config.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end" sideOffset={8}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-foreground/70" />
              <span className="text-sm font-semibold">{config.label}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="p-1 rounded-md hover:bg-muted active:scale-95 transition-all"
              aria-label="Refresh health check"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block text-foreground/50">Latency</span>
              <span className="font-medium text-foreground">
                {latencyMs !== null ? `${latencyMs}ms` : '—'}
              </span>
            </div>
            <div>
              <span className="block text-foreground/50">Provider</span>
              <span className="font-medium text-foreground">
                {provider === 'wiseresume' ? 'WiseResume AI' : 'Gemini'}
              </span>
            </div>
            <div>
              <span className="block text-foreground/50">Last Check</span>
              <span className="font-medium text-foreground">{lastCheckedLabel}</span>
            </div>
            {errorCode ? (
              <div>
                <span className="block text-foreground/50">Error</span>
                <span className="font-medium text-foreground">
                  {errorCode === 429 ? 'Rate Limited' : errorCode === 402 ? 'Credits Exhausted' : `HTTP ${errorCode}`}
                </span>
              </div>
            ) : null}
          </div>

          {provider === 'wiseresume' && status !== 'healthy' && (
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 w-full text-xs text-primary hover:underline mt-1"
            >
              <Key className="w-3 h-3" />
              Use Your Own API Key
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
