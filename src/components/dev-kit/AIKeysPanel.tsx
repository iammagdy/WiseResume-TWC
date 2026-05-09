import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Save, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import {
  AI_TEST_PROVIDERS,
  AI_TEST_SLOTS,
  providerDisplayName,
  type AITestProvider,
  type AITestSlot,
} from '@/lib/devkit/aiTestSlotModels';

const DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
  nvidia: 'nvidia/llama-3.1-nemotron-70b-instruct',
};

const PROVIDER_COLOR: Record<AITestProvider, string> = {
  openrouter: 'text-blue-400',
  groq: 'text-orange-400',
  deepseek: 'text-purple-400',
  nvidia: 'text-green-400',
};

const PROVIDER_BORDER: Record<AITestProvider, string> = {
  openrouter: 'border-blue-500/30',
  groq: 'border-orange-500/30',
  deepseek: 'border-purple-500/30',
  nvidia: 'border-green-500/30',
};

const PROVIDER_BADGE_BG: Record<AITestProvider, string> = {
  openrouter: 'bg-blue-500/10',
  groq: 'bg-orange-500/10',
  deepseek: 'bg-purple-500/10',
  nvidia: 'bg-green-500/10',
};

const PROVIDER_SAVE_BTN: Record<AITestProvider, string> = {
  openrouter: 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/30',
  groq: 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border-orange-500/30',
  deepseek: 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border-purple-500/30',
  nvidia: 'bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-500/30',
};

interface KeyEntry {
  provider: string;
  slot: number;
  hint: string | null;
  present: boolean;
  model: string;
}

interface InspectResponse {
  success?: boolean;
  keys?: KeyEntry[];
  defaultModels?: Partial<Record<AITestProvider, string>>;
  slotModels?: Record<string, string>;
  modelCatalogRefreshedAt?: string | null;
}

type SlotKey = `${AITestProvider}:${AITestSlot}`;

function slotKey(provider: AITestProvider, slot: AITestSlot): SlotKey {
  return `${provider}:${slot}`;
}

export function AIKeysPanel() {
  const [entries, setEntries] = useState<KeyEntry[]>([]);
  const [defaults, setDefaults] = useState<Record<AITestProvider, string>>(DEFAULT_MODELS);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftModels, setDraftModels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'ok' | 'err'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.invoke<InspectResponse>('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
      });
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      const keyList: KeyEntry[] = data.keys ?? [];
      setEntries(keyList);

      const merged: Record<AITestProvider, string> = { ...DEFAULT_MODELS };
      if (data.defaultModels) {
        for (const p of AI_TEST_PROVIDERS) {
          const v = data.defaultModels[p];
          if (typeof v === 'string' && v.trim()) merged[p] = v.trim();
        }
      }
      setDefaults(merged);

      const overrides: Record<string, string> = {};
      if (data.slotModels && typeof data.slotModels === 'object') {
        for (const [k, v] of Object.entries(data.slotModels)) {
          if (typeof v === 'string' && v.trim()) overrides[k] = v.trim();
        }
      }
      setSavedOverrides(overrides);

      const drafts: Record<string, string> = {};
      for (const entry of keyList) {
        const k = `${entry.provider}:${entry.slot}`;
        drafts[k] = overrides[k] ?? merged[entry.provider as AITestProvider] ?? '';
      }
      setDraftModels(drafts);
    } catch (e) {
      setError(formatEdgeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSlot = async (provider: AITestProvider, slot: AITestSlot) => {
    const k = slotKey(provider, slot);
    const model = (draftModels[k] ?? '').trim();
    if (!model) return;

    setSaving(prev => ({ ...prev, [k]: true }));
    setSaveStatus(prev => { const n = { ...prev }; delete n[k]; return n; });
    try {
      const tuple = await edgeFunctions.invoke<InspectResponse>('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
        body: { provider, slot, model },
      });
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      const confirmedOverrides: Record<string, string> = {};
      if (data.slotModels && typeof data.slotModels === 'object') {
        for (const [ky, v] of Object.entries(data.slotModels)) {
          if (typeof v === 'string' && v.trim()) confirmedOverrides[ky] = v.trim();
        }
      }
      setSavedOverrides(confirmedOverrides);
      setDraftModels(prev => ({ ...prev, [k]: confirmedOverrides[k] ?? model }));
      setSaveStatus(prev => ({ ...prev, [k]: 'ok' }));
    } catch (e) {
      setSaveStatus(prev => ({ ...prev, [k]: 'err' }));
      console.error('Save failed', e);
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  };

  const getEntry = (provider: AITestProvider, slot: AITestSlot): KeyEntry | undefined =>
    entries.find(e => e.provider === provider && e.slot === slot);

  const isDirty = (provider: AITestProvider, slot: AITestSlot): boolean => {
    const k = slotKey(provider, slot);
    const current = savedOverrides[k] ?? defaults[provider];
    return (draftModels[k] ?? '').trim() !== current;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5">
            <KeyRound className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">AI Keys</h2>
            <p className="text-xs text-muted-foreground">
              Key slot status · per-slot model overrides · saved to app_settings
            </p>
          </div>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={load} disabled={loading}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading key slots…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Failed to load key slots</p>
            <p className="text-xs mt-0.5 text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(AI_TEST_PROVIDERS as readonly AITestProvider[]).map(provider => (
            <div
              key={provider}
              className={`rounded-2xl border bg-card p-4 space-y-4 ${PROVIDER_BORDER[provider]}`}
            >
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${PROVIDER_BADGE_BG[provider]} ${PROVIDER_COLOR[provider]}`}>
                {providerDisplayName(provider)}
              </div>

              <div className="space-y-3">
                {(AI_TEST_SLOTS as readonly AITestSlot[]).map(slot => {
                  const entry = getEntry(provider, slot);
                  const k = slotKey(provider, slot);
                  const present = entry?.present ?? false;
                  const hint = entry?.hint ?? null;
                  const draft = draftModels[k] ?? '';
                  const dirty = isDirty(provider, slot);
                  const isSaving = saving[k] ?? false;
                  const status = saveStatus[k];

                  return (
                    <div
                      key={slot}
                      className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${PROVIDER_COLOR[provider]}`}>
                            Slot {slot}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {present ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400/60" />
                          )}
                          <span className={`text-[9px] font-mono ${present ? 'text-emerald-400' : 'text-red-400/60'}`}>
                            {present ? hint ?? 'set' : 'not set'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                          <ChevronDown className="w-2.5 h-2.5" /> Test model
                        </label>
                        <input
                          type="text"
                          value={draft}
                          onChange={e => setDraftModels(prev => ({ ...prev, [k]: e.target.value }))}
                          placeholder={defaults[provider]}
                          className="w-full text-[10px] font-mono bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-white/20 transition-colors"
                        />
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => saveSlot(provider, slot)}
                            disabled={!dirty || isSaving || !draft.trim()}
                            className={`h-6 px-2.5 text-[9px] font-bold flex-1 border rounded-lg transition-all ${PROVIDER_SAVE_BTN[provider]} ${(!dirty || !draft.trim()) ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {isSaving ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <><Save className="w-2.5 h-2.5" /> Save</>
                            )}
                          </Button>
                          {status === 'ok' && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          )}
                          {status === 'err' && (
                            <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                          )}
                          {!savedOverrides[k] && (
                            <span className="text-[8px] text-muted-foreground/50 flex-shrink-0">default</span>
                          )}
                          {savedOverrides[k] && (
                            <span className="text-[8px] text-emerald-400/70 flex-shrink-0">custom</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Keys are read from Appwrite Function Variables — set <code className="font-mono">NVIDIA_KEY_1/2/3</code>,{' '}
        <code className="font-mono">OPENROUTER_KEY_1/2/3</code>, <code className="font-mono">GROQ_KEY_1/2/3</code>,{' '}
        <code className="font-mono">DEEPSEEK_KEY</code> in the Appwrite Console.
        Model overrides are saved to <code className="font-mono">app_settings.ai_test_slot_models</code>.
      </p>
    </div>
  );
}
