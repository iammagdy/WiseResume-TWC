import { useState, useEffect, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { KeyRound, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Save, ChevronDown, Play, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import {
  AI_TEST_PROVIDERS,
  AI_KEY_SLOT_MAP,
  DROPDOWN_PROVIDERS,
  fetchLiveProviderModels,
  resolveModelsForProvider,
  providerDisplayName,
  type AITestProvider,
  type AITestSlot,
  type CuratedLLMModel,
  type LiveProviderModels,
} from '@/lib/devkit/aiTestSlotModels';
import type { SlotTestResult, SlotTestResultsMap, BackendSlotTestStatus, FrontendSlotTestState } from '@/lib/devkit/aiTestTypes';

const DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'openrouter/free',
  groq: 'openai/gpt-oss-120b',
  deepseek: 'deepseek-chat',
  nvidia: 'stepfun-ai/step-3.7-flash',
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
  testResults?: SlotTestResultsMap;
  result?: SlotTestResult;
  results?: SlotTestResult[];
  modelCatalogRefreshedAt?: string | null;
}

type SlotKey = `${AITestProvider}:${AITestSlot}`;

function slotKey(provider: AITestProvider, slot: AITestSlot): SlotKey {
  return `${provider}:${slot}`;
}

function getModelTier(provider: AITestProvider, modelValue: string, live: LiveProviderModels): CuratedLLMModel['tier'] | null {
  const list = resolveModelsForProvider(provider, live);
  return list.find(m => m.value === modelValue)?.tier ?? null;
}

export function AIKeysPanel() {
  const [entries, setEntries] = useState<KeyEntry[]>([]);
  const [defaults, setDefaults] = useState<Record<AITestProvider, string>>(DEFAULT_MODELS);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<SlotTestResultsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftModels, setDraftModels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'ok' | 'err'>>({});
  const [testingSlots, setTestingSlots] = useState<Record<string, boolean>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [testingProvider, setTestingProvider] = useState<Partial<Record<AITestProvider, boolean>>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [liveModels, setLiveModels] = useState<LiveProviderModels>({ openrouter: [], groq: [], nvidia: [], deepseek: [], cachedAt: null });

  const load = useCallback(async (forceRefreshModels = false) => {
    setLoading(true);
    setError(null);
    try {
      const [tuple, live] = await Promise.all([
        appwriteFunctions.invoke<InspectResponse>('inspect-ai-keys', { headers: devKitAuthHeaders() }),
        fetchLiveProviderModels(forceRefreshModels),
      ]);
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      const keyList: KeyEntry[] = data.keys ?? [];
      setEntries(keyList);
      setLiveModels(live);

      if (data.testResults && typeof data.testResults === 'object') {
        setTestResults(data.testResults);
      }

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
        const raw = overrides[k] ?? merged[entry.provider as AITestProvider] ?? '';
        const prov = entry.provider as AITestProvider;
        if (DROPDOWN_PROVIDERS.has(prov)) {
          const modelList = resolveModelsForProvider(prov, live);
          const valid = new Set(modelList.map(m => m.value));
          drafts[k] = raw && valid.has(raw) ? raw : (modelList[0]?.value ?? raw);
        } else {
          drafts[k] = raw;
        }
      }
      setDraftModels(drafts);
    } catch (e) {
      setError(formatEdgeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSlot = async (provider: AITestProvider, slot: AITestSlot) => {
    const k = slotKey(provider, slot);
    const model = (draftModels[k] ?? '').trim();
    if (!model) return;

    setSaving(prev => ({ ...prev, [k]: true }));
    setSaveStatus(prev => { const n = { ...prev }; delete n[k]; return n; });
    try {
      const tuple = await appwriteFunctions.invoke<InspectResponse>('inspect-ai-keys', {
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

  const testSlot = async (provider: AITestProvider, slot: AITestSlot) => {
    const k = slotKey(provider, slot);
    const model = (draftModels[k] ?? '').trim();
    if (!model) return;

    setTestingSlots(prev => ({ ...prev, [k]: true }));
    try {
      const tuple = await appwriteFunctions.invoke<InspectResponse>('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
        body: { action: 'test-ai-key-slot', provider, slot, model },
      });
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      if (data.testResults) setTestResults(data.testResults);
      else if (data.result) setTestResults(prev => ({ ...prev, [k]: data.result! }));
    } catch (e) {
      console.error(`Test slot failed for ${k}:`, e);
    } finally {
      setTestingSlots(prev => ({ ...prev, [k]: false }));
    }
  };

  const testProvider = async (provider: AITestProvider) => {
    setTestingProvider(prev => ({ ...prev, [provider]: true }));
    const slots = AI_KEY_SLOT_MAP[provider];
    setTestingSlots(prev => {
      const next = { ...prev };
      for (const s of slots) next[slotKey(provider, s)] = true;
      return next;
    });

    try {
      const overrides: Record<string, string> = {};
      for (const s of slots) {
        const k = slotKey(provider, s);
        if (draftModels[k]?.trim()) overrides[k] = draftModels[k].trim();
      }

      const tuple = await appwriteFunctions.invoke<InspectResponse>('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
        body: { action: 'test-ai-provider', provider, modelOverrides: overrides },
      });
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      if (data.testResults) setTestResults(data.testResults);
    } catch (e) {
      console.error(`Test provider failed for ${provider}:`, e);
    } finally {
      setTestingProvider(prev => ({ ...prev, [provider]: false }));
      setTestingSlots(prev => {
        const next = { ...prev };
        for (const s of slots) next[slotKey(provider, s)] = false;
        return next;
      });
    }
  };

  const testAllKeys = async () => {
    setTestingAll(true);
    setTestingSlots(prev => {
      const next = { ...prev };
      for (const p of AI_TEST_PROVIDERS) {
        for (const s of AI_KEY_SLOT_MAP[p]) {
          next[slotKey(p, s)] = true;
        }
      }
      return next;
    });

    try {
      const overrides: Record<string, string> = {};
      for (const p of AI_TEST_PROVIDERS) {
        for (const s of AI_KEY_SLOT_MAP[p]) {
          const k = slotKey(p, s);
          if (draftModels[k]?.trim()) overrides[k] = draftModels[k].trim();
        }
      }

      const tuple = await appwriteFunctions.invoke<InspectResponse>('inspect-ai-keys', {
        headers: devKitAuthHeaders(),
        body: { action: 'test-all-ai-keys', modelOverrides: overrides },
      });
      const data = unwrapAdminResponse<InspectResponse>(tuple, 'inspect-ai-keys');
      if (data.testResults) setTestResults(data.testResults);
    } catch (e) {
      console.error('Test all keys failed:', e);
    } finally {
      setTestingAll(false);
      setTestingSlots({});
    }
  };

  const getEntry = (provider: AITestProvider, slot: AITestSlot): KeyEntry | undefined =>
    entries.find(e => e.provider === provider && e.slot === slot);

  const isDirty = (provider: AITestProvider, slot: AITestSlot): boolean => {
    const k = slotKey(provider, slot);
    const current = savedOverrides[k] ?? defaults[provider];
    return (draftModels[k] ?? '').trim() !== current;
  };

  const renderStatusBadge = (provider: AITestProvider, slot: AITestSlot) => {
    const k = slotKey(provider, slot);
    const isTesting = testingSlots[k] ?? false;
    const result = testResults[k];

    if (isTesting) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[9px] font-bold">
          <MiniSpinner size={10} /> Testing…
        </span>
      );
    }

    if (!result) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground text-[9px] font-medium">
          Untested
        </span>
      );
    }

    const status: BackendSlotTestStatus = result.status;
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-bold">
            <CheckCircle2 className="w-2.5 h-2.5" /> Healthy {result.latencyMs ? `(${result.latencyMs}ms)` : ''}
          </span>
        );
      case 'missing_key':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-400/80 text-[9px] font-bold">
            <XCircle className="w-2.5 h-2.5" /> Missing Key
          </span>
        );
      case 'invalid_key':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[9px] font-bold">
            <XCircle className="w-2.5 h-2.5" /> Invalid Key
          </span>
        );
      case 'model_not_found':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-bold">
            <AlertTriangle className="w-2.5 h-2.5" /> Model Not Found
          </span>
        );
      case 'rate_limited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[9px] font-bold">
            <Zap className="w-2.5 h-2.5" /> Rate Limited
          </span>
        );
      case 'timeout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 text-[9px] font-bold">
            <AlertTriangle className="w-2.5 h-2.5" /> Timeout
          </span>
        );
      case 'provider_error':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[9px] font-bold">
            <XCircle className="w-2.5 h-2.5" /> Provider Error
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5">
            <KeyRound className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">AI Keys & Model Tester</h2>
            <p className="text-xs text-muted-foreground">
              Key slot status · real provider completion ping · per-slot model overrides
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              3 OpenRouter + 3 Groq + 3 NVIDIA + 1 DeepSeek = 10 cards
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {liveModels.cachedAt && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Models: {new Date(liveModels.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => void testAllKeys()}
            disabled={loading || testingAll}
            className="h-8 gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 font-bold"
          >
            {testingAll ? <MiniSpinner size={14} /> : <Play className="w-3.5 h-3.5" />}
            Test All Keys
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => load(true)} disabled={loading || testingAll}
            className="h-8 gap-1.5 text-xs"
          >
            {loading ? <MiniSpinner size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm justify-center">
          <MiniSpinner size={16} />
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
          {(AI_TEST_PROVIDERS as readonly AITestProvider[]).map(provider => {
            const isProvTesting = testingProvider[provider] ?? false;

            return (
              <div
                key={provider}
                className={`rounded-2xl border bg-card p-4 space-y-4 ${PROVIDER_BORDER[provider]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${PROVIDER_BADGE_BG[provider]} ${PROVIDER_COLOR[provider]}`}>
                    {providerDisplayName(provider)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void testProvider(provider)}
                    disabled={isProvTesting || testingAll}
                    className="h-6 px-2 text-[9px] font-bold text-muted-foreground hover:text-foreground gap-1 border border-white/10 rounded-md"
                  >
                    {isProvTesting ? <MiniSpinner size={10} /> : <Play className="w-2.5 h-2.5" />}
                    Test Provider
                  </Button>
                </div>

                <div className="space-y-3">
                  {AI_KEY_SLOT_MAP[provider].map(slot => {
                    const entry = getEntry(provider, slot);
                    const k = slotKey(provider, slot);
                    const present = entry?.present ?? false;
                    const hint = entry?.hint ?? null;
                    const draft = draftModels[k] ?? '';
                    const dirty = isDirty(provider, slot);
                    const isSaving = saving[k] ?? false;
                    const isSlotTesting = testingSlots[k] ?? false;
                    const status = saveStatus[k];
                    const modelList = resolveModelsForProvider(provider, liveModels);
                    const useDropdown = DROPDOWN_PROVIDERS.has(provider);
                    const selectedTier = useDropdown ? getModelTier(provider, draft, liveModels) : null;
                    const selectedModel = modelList.find(m => m.value === draft);
                    const result = testResults[k];
                    const detailsOpen = expandedDetails[k] ?? false;

                    return (
                      <div
                        key={slot}
                        className="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${PROVIDER_COLOR[provider]}`}>
                              Slot {slot}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(provider, slot)}
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
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                              <ChevronDown className="w-2.5 h-2.5" /> Test model
                            </label>
                            {dirty && (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                Testing unsaved model selection
                              </span>
                            )}
                          </div>

                          {useDropdown ? (
                            <>
                              <select
                                value={draft}
                                onChange={e => setDraftModels(prev => ({ ...prev, [k]: e.target.value }))}
                                className="w-full text-[10px] font-mono bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-foreground outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                              >
                                {modelList.map(m => (
                                  <option key={m.value} value={m.value}>
                                    {m.deprecated ? `(deprecated) ${m.label}` : m.label}
                                    {' '}[{m.tier === 'free' ? 'Free' : 'Paid'}]
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1.5 min-h-[14px]">
                                {selectedTier === 'free' && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400 text-[8px] font-black uppercase tracking-wider">
                                    Free
                                  </span>
                                )}
                                {selectedTier === 'paid' && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[8px] font-black uppercase tracking-wider">
                                    Paid
                                  </span>
                                )}
                                {selectedModel?.deprecated && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400/70 text-[8px] font-mono">
                                    deprecated
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <input
                              type="text"
                              value={draft}
                              onChange={e => setDraftModels(prev => ({ ...prev, [k]: e.target.value }))}
                              placeholder={defaults[provider]}
                              className="w-full text-[10px] font-mono bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-white/20 transition-colors"
                            />
                          )}

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => void saveSlot(provider, slot)}
                              disabled={!dirty || isSaving || !draft.trim()}
                              className={`h-6 px-2 text-[9px] font-bold flex-1 border rounded-lg transition-all ${PROVIDER_SAVE_BTN[provider]} ${(!dirty || !draft.trim()) ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {isSaving ? (
                                <MiniSpinner size={10} />
                              ) : (
                                <><Save className="w-2.5 h-2.5" /> Save</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void testSlot(provider, slot)}
                              disabled={isSlotTesting || testingAll || !present}
                              className="h-6 px-2 text-[9px] font-bold bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 rounded-lg transition-all gap-1"
                            >
                              {isSlotTesting ? (
                                <MiniSpinner size={10} />
                              ) : (
                                <><Play className="w-2.5 h-2.5" /> Test</>
                              )}
                            </Button>
                            {status === 'ok' && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            )}
                            {status === 'err' && (
                              <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                            )}
                          </div>

                          {/* Test Result Summary & Details */}
                          {result && (
                            <div className="pt-1.5 border-t border-white/5 space-y-1">
                              <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                                <span>Tested: {new Date(result.testedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {result.message && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedDetails(prev => ({ ...prev, [k]: !detailsOpen }))}
                                    className="text-muted-foreground/80 hover:text-foreground underline flex items-center gap-0.5"
                                  >
                                    <Info className="w-2 h-2" /> {detailsOpen ? 'hide' : 'details'}
                                  </button>
                                )}
                              </div>
                              {detailsOpen && result.message && (
                                <div className="p-1.5 rounded bg-black/40 border border-white/5 text-[8px] font-mono text-muted-foreground/90 break-words leading-relaxed">
                                  {result.message}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Keys are read from Appwrite Function Variables — set <code className="font-mono">NVIDIA_KEY_1/2/3</code>,{' '}
        <code className="font-mono">OPENROUTER_KEY_1/2/3</code>, <code className="font-mono">GROQ_KEY_1/2/3</code>,{' '}
        <code className="font-mono">DEEPSEEK_KEY</code> in the Appwrite Console.
        Model overrides are saved to <code className="font-mono">app_settings.ai_test_slot_models</code> and test results to <code className="font-mono">app_settings.ai_key_test_results</code>.
      </p>
    </div>
  );
}
