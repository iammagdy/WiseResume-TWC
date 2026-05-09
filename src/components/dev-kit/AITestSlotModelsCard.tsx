import { useState, useEffect } from 'react';
import { BrainCircuit, ExternalLink, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchAITestSlotModels,
  getAITestSlotModel,
  isAITestSlotUsingDefault,
  providerDisplayName,
  AI_TEST_PROVIDERS,
  AI_TEST_SLOTS,
  type AITestSlotMap,
  type AITestProvider,
  type AITestSlot,
} from '@/lib/devkit/aiTestSlotModels';

interface AITestSlotModelsCardProps {
  onNavigateToKeys: (tab: string) => void;
}

const PROVIDER_COLOR: Record<AITestProvider, string> = {
  openrouter: 'text-blue-400',
  groq:       'text-orange-400',
  deepseek:   'text-purple-400',
  nvidia:     'text-green-400',
};

const PROVIDER_BG: Record<AITestProvider, string> = {
  openrouter: 'bg-blue-500/10 border-blue-500/20',
  groq:       'bg-orange-500/10 border-orange-500/20',
  deepseek:   'bg-purple-500/10 border-purple-500/20',
  nvidia:     'bg-green-500/10 border-green-500/20',
};

export function AITestSlotModelsCard({ onNavigateToKeys }: AITestSlotModelsCardProps) {
  const [map, setMap]         = useState<AITestSlotMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAITestSlotModels();
      setMap(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load AI slot models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">AI Test Slot Models</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted/30 text-muted-foreground border-border">
            12 slots
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="ghost"
            onClick={load} disabled={loading}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => onNavigateToKeys('ai')}
            className="h-7 px-3 text-xs gap-1.5"
          >
            <ExternalLink className="w-3 h-3" /> Manage in AI Radar
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading slot models…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {map && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AI_TEST_PROVIDERS.map(provider => (
            <div key={provider} className={`rounded-lg border p-3 space-y-2 ${PROVIDER_BG[provider]}`}>
              <p className={`text-[11px] font-black uppercase tracking-wider ${PROVIDER_COLOR[provider]}`}>
                {providerDisplayName(provider)}
              </p>
              {(AI_TEST_SLOTS as readonly AITestSlot[]).map(slot => {
                const model    = getAITestSlotModel(map, provider, slot);
                const isDefault = isAITestSlotUsingDefault(map, provider, slot);
                return (
                  <div key={slot} className="flex items-start gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground mt-0.5 w-4 flex-shrink-0">
                      #{slot}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-foreground truncate" title={model}>
                        {model || '—'}
                      </p>
                      {isDefault && (
                        <span className="text-[9px] text-muted-foreground">default</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
