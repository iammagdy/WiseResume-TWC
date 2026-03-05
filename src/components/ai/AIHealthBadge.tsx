import { useState } from 'react';
import { Activity, Zap, AlertTriangle, WifiOff, Key } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useAIHealth, AIHealthStatus } from '@/hooks/useAIHealth';
import { cn } from '@/lib/utils';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';

const STATUS_CONFIG: Record<AIHealthStatus, {
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
  const { status, latencyMs, provider, errorCode } = useAIHealth();
  const [showSettings, setShowSettings] = useState(false);

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

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
          <span className={cn('w-2 h-2 rounded-full', status !== 'healthy' && 'animate-pulse', config.dot)} />
          <span className="text-foreground/80">{config.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end" sideOffset={8}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-foreground/70" />
            <span className="text-sm font-semibold">{config.label}</span>
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
                {provider === 'wiseresume' ? 'WiseResume AI' : provider === 'ollama' ? 'Ollama' : 'Gemini'}
              </span>
            </div>
            {errorCode ? (
              <div className="col-span-2">
                <span className="block text-foreground/50">Error</span>
                <span className="font-medium text-foreground">
                  {errorCode === 429 ? 'Rate Limited' : errorCode === 402 ? 'Credits Exhausted' : `HTTP ${errorCode}`}
                </span>
              </div>
            ) : null}
          </div>

          <div className="pt-2 mt-1 border-t border-border">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 w-full text-xs text-primary hover:underline"
            >
              <Key className="w-3 h-3" />
              Use Your Own API Key
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground hover:underline mt-1"
            >
              Open AI Settings
            </button>
          </div>
        </div>
      </PopoverContent>

      <AISettingsSheet open={showSettings} onOpenChange={setShowSettings} />
    </Popover>
  );
}
