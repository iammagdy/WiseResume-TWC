import { useCallback, useEffect, useState } from 'react';
import { Cpu, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMounted } from '@/lib/devkit/hooks';
import { formatEdgeError } from '@/lib/devkit/edgeResponse';
import {
  AI_TEST_PROVIDERS,
  AI_TEST_SLOTS,
  fetchAITestSlotModels,
  getAITestSlotModel,
  isAITestSlotUsingDefault,
  providerDisplayName,
  type AITestSlotMap,
} from '@/lib/devkit/aiTestSlotModels';
import { cn } from '@/lib/utils';

/**
 * Compact, read-only view of the active model for each AI test slot.
 *
 * Lets an admin answer "what model is `openrouter:1` testing against?"
 * without opening the DevKit AI Keys panel. Sourced from the same
 * `app_settings.ai_test_slot_models` row that DevKit writes into, via the
 * shared {@link fetchAITestSlotModels} helper, so the three views can
 * never disagree.
 *
 * Pass `onNavigateToKeys` to render a "Manage" deep-link in the header
 * (Mission Control uses this to jump to the AI Keys tab).
 */
interface AITestSlotModelsCardProps {
  onNavigateToKeys?: (provider: 'openrouter' | 'groq' | 'deepseek') => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function AITestSlotModelsCard({
  onNavigateToKeys,
  className,
  title = 'AI Test Slot Models',
  subtitle = 'Active model each slot tests against — sourced from app_settings.ai_test_slot_models.',
}: AITestSlotModelsCardProps) {
  const isMounted = useIsMounted();
  const [map, setMap] = useState<AITestSlotMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAITestSlotModels();
      if (!isMounted()) return;
      setMap(data);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load AI test slot models'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 px-2 text-xs">
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{subtitle}</p>

      {error && (
        <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!map && loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      )}

      {map && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AI_TEST_PROVIDERS.map(provider => (
            <div key={provider} className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{providerDisplayName(provider)}</p>
                {onNavigateToKeys && (
                  <button
                    onClick={() => onNavigateToKeys(provider)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Manage
                  </button>
                )}
              </div>
              <ul className="space-y-1.5">
                {AI_TEST_SLOTS.map(slot => {
                  const model = getAITestSlotModel(map, provider, slot);
                  const isDefault = isAITestSlotUsingDefault(map, provider, slot);
                  return (
                    <li
                      key={slot}
                      className="flex items-start gap-2 text-[11px]"
                      title={isDefault ? 'Using provider default — no per-slot override saved' : 'Per-slot override saved in app_settings'}
                    >
                      <span className="font-mono text-muted-foreground shrink-0 pt-0.5">{slot}.</span>
                      <span className="font-mono text-foreground break-all flex-1 leading-snug">{model}</span>
                      {isDefault ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/40 text-muted-foreground border-border shrink-0">
                          default
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20 shrink-0">
                          custom
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
