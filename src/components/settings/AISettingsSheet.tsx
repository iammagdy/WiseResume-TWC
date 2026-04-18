import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openExternal } from '@/lib/openExternal';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Brain,
  Key,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Server,
  History,
  ChevronDown,
  Play,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, AIProvider } from '@/store/settingsStore';
import { resetFallbackToast } from '@/lib/aiFallbackToast';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getUserId } from '@/lib/supabaseBridge';
import { supabase } from '@/integrations/supabase/safeClient';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/auditLogger';
import { formatDistanceToNow } from 'date-fns';
import { useAIHealthStore } from '@/store/aiHealthStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AISettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TestResult {
  status: 'success' | 'error';
  providerUsed: string;
  displayProvider?: string;
  displayModel?: string;
  latencyMs: number;
  error?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  response?: string;
  model?: string;
}

interface KeyHistoryEntry {
  id: string;
  action: string;
  metadata: { provider?: string; tier?: string; model?: string } | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────
// BYOK Provider Configuration
// ──────────────────────────────────────────────────────────────

type ByokProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'openrouter' | 'ollama';

interface ByokProviderConfig {
  label: string;
  keyHint: string;
  docsUrl: string;
  docsLabel: string;
  iconColor: string;
  defaultModel: string;
  models: readonly string[];
  requiresUrl: boolean;
}

const BYOK_PROVIDERS: Record<ByokProviderId, ByokProviderConfig> = {
  openai: {
    label: 'OpenAI',
    keyHint: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Get key at platform.openai.com',
    iconColor: 'text-emerald-400',
    defaultModel: 'gpt-4o-mini',
    models: ['o3', 'o4-mini', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
    requiresUrl: false,
  },
  anthropic: {
    label: 'Claude (Anthropic)',
    keyHint: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Get key at Anthropic Console',
    iconColor: 'text-orange-400',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    requiresUrl: false,
  },
  gemini: {
    label: 'Google Gemini',
    keyHint: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/apikey',
    docsLabel: 'Get key at Google AI Studio',
    iconColor: 'text-blue-400',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    requiresUrl: false,
  },
  groq: {
    label: 'Groq',
    keyHint: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'Get key at Groq Console',
    iconColor: 'text-amber-400',
    defaultModel: 'qwen/qwen3-32b',
    models: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    requiresUrl: false,
  },
  mistral: {
    label: 'Mistral AI',
    keyHint: 'API key',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    docsLabel: 'Get key at Mistral Console',
    iconColor: 'text-indigo-400',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
    requiresUrl: false,
  },
  xai: {
    label: 'xAI (Grok)',
    keyHint: 'xai-...',
    docsUrl: 'https://console.x.ai',
    docsLabel: 'Get key at xAI Console',
    iconColor: 'text-zinc-300',
    defaultModel: 'grok-2-mini',
    models: ['grok-3', 'grok-3-mini', 'grok-2-latest', 'grok-2-mini'],
    requiresUrl: false,
  },
  cohere: {
    label: 'Cohere',
    keyHint: 'API key',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    docsLabel: 'Get key at Cohere Dashboard',
    iconColor: 'text-violet-400',
    defaultModel: 'command-r',
    models: ['command-r-plus', 'command-r', 'command-nightly'],
    requiresUrl: false,
  },
  openrouter: {
    label: 'OpenRouter',
    keyHint: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/keys',
    docsLabel: 'Get key at openrouter.ai',
    iconColor: 'text-purple-400',
    defaultModel: '',
    models: [],
    requiresUrl: false,
  },
  ollama: {
    label: 'Ollama',
    keyHint: 'Optional API key',
    docsUrl: 'https://ollama.com',
    docsLabel: 'Visit ollama.com',
    iconColor: 'text-green-400',
    defaultModel: '',
    models: [],
    requiresUrl: true,
  },
};

const BYOK_PROVIDER_ORDER: ByokProviderId[] = [
  'openai', 'anthropic', 'gemini', 'groq', 'mistral', 'xai', 'cohere', 'openrouter', 'ollama',
];

const maskKey = (key: string) => {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

/** Returns true when the model likely does not support tool/function calling. */
const hasNoToolCalling = (provider: ByokProviderId, model: string, baseUrl?: string): boolean => {
  if (!model) return false;
  if (provider === 'cohere' && (model === 'command' || model === 'command-light')) return true;
  // Ollama Cloud (ollama.com / api.ollama.com) uses the native /api/chat + /api/tags endpoints
  // which do not support tool calling.  Self-hosted Ollama native API URLs also contain an /api
  // path prefix (e.g. http://localhost:11434/api) — these differ from the OpenAI-compatible /v1/
  // path and equally lack tool-call support.
  if (provider === 'ollama' && baseUrl) {
    const url = baseUrl.toLowerCase();
    if (/ollama\.com/i.test(url) || /\/api(?:\/|$)/.test(url)) return true;
  }
  const m = model.toLowerCase();
  return m.includes('instruct-lite') || m.includes('base');
};

export function AISettingsSheet({ open, onOpenChange }: AISettingsSheetProps) {
  const {
    aiProvider,
    setAIProvider,
    // Gemini
    geminiApiKey,
    setGeminiApiKey,
    geminiKeyTier,
    setGeminiKeyTier,
    geminiKeyValidated,
    setGeminiKeyValidated,
    geminiDailyUsage,
    geminiModel,
    setGeminiModel,
    // Ollama
    ollamaBaseUrl,
    setOllamaBaseUrl,
    ollamaModel,
    setOllamaModel,
    ollamaKeyValidated,
    setOllamaKeyValidated,
    // OpenRouter
    openrouterModel,
    setOpenrouterModel,
    openrouterKeyValidated,
    setOpenrouterKeyValidated,
    // New providers
    openaiKeyValidated, setOpenaiKeyValidated, openaiModel, setOpenaiModel,
    anthropicKeyValidated, setAnthropicKeyValidated, anthropicModel, setAnthropicModel,
    groqKeyValidated, setGroqKeyValidated, groqModel, setGroqModel,
    mistralKeyValidated, setMistralKeyValidated, mistralModel, setMistralModel,
    xaiKeyValidated, setXaiKeyValidated, xaiModel, setXaiModel,
    cohereKeyValidated, setCohereKeyValidated, cohereModel, setCohereModel,
  } = useSettingsStore();
  const queryClient = useQueryClient();

  // ── UI mode (decoupled from aiProvider so first-time BYOK setup is accessible) ──
  const [uiMode, setUiMode] = useState<'wiseresume' | 'byok'>(
    aiProvider !== 'wiseresume' ? 'byok' : 'wiseresume'
  );

  // ── BYOK state ──
  const defaultByokProvider: ByokProviderId = (aiProvider !== 'wiseresume' ? aiProvider : 'openai') as ByokProviderId;
  const [byokProvider, setByokProvider] = useState<ByokProviderId>(defaultByokProvider);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  // Generic key/model inputs (reset when byokProvider changes from picker)
  const [byokKeyInput, setByokKeyInput] = useState('');
  const [byokShowKey, setByokShowKey] = useState(false);
  const [byokIsValidating, setByokIsValidating] = useState(false);

  // Per-provider model inputs
  const [byokModelInputs, setByokModelInputs] = useState<Record<string, string>>({
    openai: openaiModel || 'gpt-4o-mini',
    anthropic: anthropicModel || 'claude-3-5-haiku-20241022',
    gemini: geminiModel || 'gemini-2.5-flash',
    groq: groqModel || 'qwen/qwen3-32b',
    mistral: mistralModel || 'mistral-small-latest',
    xai: xaiModel || 'grok-2-mini',
    cohere: cohereModel || 'command-r',
    openrouter: openrouterModel || '',
    ollama: ollamaModel || '',
  });

  // Dynamic model lists (Gemini, OpenRouter, Ollama)
  const [byokAvailableModels, setByokAvailableModels] = useState<Record<string, string[]>>({});
  const [openrouterModelSearch, setOpenrouterModelSearch] = useState('');

  // Connected timestamps per provider
  const [byokConnectedAt, setByokConnectedAt] = useState<Record<string, string | null>>({});

  // Masked key display per provider
  const [byokMaskedKey, setByokMaskedKey] = useState<Record<string, string>>({});

  // Ollama-specific
  const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaBaseUrl || '');
  const [ollamaKeyInput, setOllamaKeyInput] = useState('');
  const [ollamaShowKey, setOllamaShowKey] = useState(false);
  const [ollamaCorsError, setOllamaCorsError] = useState(false);

  // Dynamic model fetch state per provider (session cache)
  const [dynamicModelsCache, setDynamicModelsCache] = useState<Record<string, { models: string[]; fetched: boolean }>>({});
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // ── Test & Cooldown state ──
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // ── Usage & Key history ──
  interface UsageLog {
    id: string;
    action_type: string;
    metadata: { provider?: string; section?: string; action?: string } | null;
    created_at: string;
  }
  const [usageHistory, setUsageHistory] = useState<UsageLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyHistoryOpen, setKeyHistoryOpen] = useState(false);
  const [keyHistory, setKeyHistory] = useState<KeyHistoryEntry[]>([]);
  const [loadingKeyHistory, setLoadingKeyHistory] = useState(false);

  // ── Revert on close ──
  const originalProviderRef = useRef<AIProvider>(aiProvider);
  useEffect(() => {
    if (open) originalProviderRef.current = aiProvider;
  }, [open]);
  useEffect(() => {
    if (!open) {
      const current = useSettingsStore.getState();
      const validatedMap: Record<string, boolean> = {
        gemini: current.geminiKeyValidated,
        ollama: current.ollamaKeyValidated,
        openrouter: current.openrouterKeyValidated,
        openai: current.openaiKeyValidated,
        anthropic: current.anthropicKeyValidated,
        groq: current.groqKeyValidated,
        mistral: current.mistralKeyValidated,
        xai: current.xaiKeyValidated,
        cohere: current.cohereKeyValidated,
      };
      const p = current.aiProvider;
      if (p !== 'wiseresume' && !validatedMap[p]) {
        current.setAIProvider(
          validatedMap[originalProviderRef.current] ? originalProviderRef.current : 'wiseresume'
        );
      }
    }
  }, [open]);

  // ── Sync byokProvider when aiProvider changes externally ──
  useEffect(() => {
    if (aiProvider !== 'wiseresume') {
      setByokProvider(aiProvider as ByokProviderId);
    }
  }, [aiProvider]);

  // ── Fetch dynamic models when byokProvider changes and provider is validated ──
  useEffect(() => {
    const dynamicProviders: ByokProviderId[] = ['openai', 'anthropic', 'groq', 'openrouter'];
    if (dynamicProviders.includes(byokProvider) && isValidated(byokProvider) && !dynamicModelsCache[byokProvider]?.fetched) {
      fetchDynamicModels(byokProvider);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byokProvider]);

  // ── Cooldown timer ──
  useEffect(() => {
    let interval: number | undefined;
    if (secondsRemaining > 0) {
      interval = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [secondsRemaining > 0]);

  // ── Sync uiMode when sheet opens (keeps it in sync with actual provider) ──
  useEffect(() => {
    if (open) {
      setUiMode(aiProvider !== 'wiseresume' ? 'byok' : 'wiseresume');
    }
  }, [open]);

  // ── Hydrate on sheet open ──
  const refreshUsageHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('ai_usage_logs')
      .select('id, action_type, metadata, created_at')
      .neq('action_type', 'score')
      .order('created_at', { ascending: false })
      .limit(10);
    const logs = (data as UsageLog[]) || [];
    setUsageHistory(logs);
    setLoadingHistory(false);
    if (logs.length > 0) {
      const lastProvider = (logs[0].metadata as any)?.provider;
      if (lastProvider && lastProvider !== 'deterministic') {
        useAIHealthStore.getState().recordProvider(lastProvider);
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    refreshUsageHistory();
    setTestResult(null);

    // Sync local model inputs from store
    setByokModelInputs({
      openai: openaiModel || 'gpt-4o-mini',
      anthropic: anthropicModel || 'claude-3-5-haiku-20241022',
      gemini: geminiModel || 'gemini-2.5-flash',
      groq: groqModel || 'qwen/qwen3-32b',
      mistral: mistralModel || 'mistral-small-latest',
      xai: xaiModel || 'grok-2-mini',
      cohere: cohereModel || 'command-r',
      openrouter: openrouterModel || '',
      ollama: ollamaModel || '',
    });

    // Sync ollama URL
    if (ollamaBaseUrl) {
      const corrected = ollamaBaseUrl.replace(/api\.ollama\.com/i, 'ollama.com');
      setOllamaUrlInput(corrected);
    }

    // Hydrate connection times + masked keys from server
    edgeFunctions.functions.invoke('manage-api-keys', {
      body: { action: 'get' },
    }).then(({ data: keysData }) => {
      if (!keysData?.keys) return;
      const keys = keysData.keys as Array<{
        provider: string;
        key_tier: string;
        base_url: string | null;
        model: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      const newConnectedAt: Record<string, string | null> = {};
      for (const key of keys) {
        const ts = key.updated_at || key.created_at || null;
        newConnectedAt[key.provider] = ts;
        // Sync models from DB if store doesn't have them
        if (key.model) {
          setByokModelInputs(prev => ({
            ...prev,
            [key.provider]: key.model!,
          }));
        }
        if (key.provider === 'ollama' && key.base_url) {
          setOllamaUrlInput(key.base_url);
        }
      }
      setByokConnectedAt(newConnectedAt);

      // Fetch dynamic model lists for connected special providers
      const openrouterKey = keys.find(k => k.provider === 'openrouter');
      if (openrouterKey && openrouterKeyValidated) {
        edgeFunctions.functions.invoke('validate-api-key', {
          body: { provider: 'openrouter', modelsOnly: true },
        }).then(({ data }) => {
          if (data?.availableModels?.length) {
            setByokAvailableModels(prev => ({ ...prev, openrouter: data.availableModels }));
          }
        }).catch(() => {});
      }

      const ollamaKey = keys.find(k => k.provider === 'ollama');
      if (ollamaKey && ollamaKeyValidated && ollamaKey.base_url) {
        edgeFunctions.functions.invoke('validate-api-key', {
          body: { provider: 'ollama', apiKey: 'ollama-no-key', baseUrl: ollamaKey.base_url, model: ollamaKey.model || '' },
        }).then(({ data }) => {
          if (data?.availableModels?.length) {
            setByokAvailableModels(prev => ({ ...prev, ollama: data.availableModels }));
          }
        }).catch(() => {});
      }

      // Fetch dynamic model lists for providers that support it
      const dynamicProviders: Array<{ id: ByokProviderId; validated: boolean }> = [
        { id: 'openai', validated: openaiKeyValidated },
        { id: 'anthropic', validated: anthropicKeyValidated },
        { id: 'groq', validated: groqKeyValidated },
      ];
      for (const { id, validated } of dynamicProviders) {
        if (validated && !dynamicModelsCache[id]?.fetched) {
          edgeFunctions.functions.invoke('validate-api-key', {
            body: { provider: id, modelsOnly: true },
          }).then(({ data }) => {
            if (data?.availableModels?.length) {
              setByokAvailableModels(prev => ({ ...prev, [id]: data.availableModels }));
              setDynamicModelsCache(prev => ({ ...prev, [id]: { models: data.availableModels, fetched: true } }));
            } else {
              setDynamicModelsCache(prev => ({ ...prev, [id]: { models: [], fetched: true } }));
            }
          }).catch(() => {
            setDynamicModelsCache(prev => ({ ...prev, [id]: { models: [], fetched: true } }));
          });
        }
      }
    }).catch(() => {});

    // Check WiseResume cooldown
    if (aiProvider === 'wiseresume') {
      edgeFunctions.functions.invoke('ai-test', { body: { checkOnly: true } }).then(({ data, error }) => {
        const result = data || (error?.message?.includes('{')
          ? (() => { try { return JSON.parse(error.message.replace(/^Edge function returned \d+: /, '')); } catch { return null; } })()
          : null);
        if (result?.reason === 'cooldown' && result.secondsRemaining > 0) {
          setSecondsRemaining(result.secondsRemaining);
          setCooldownEndsAt(result.cooldownEndsAt);
        }
      }).catch(() => {});
    }
  }, [open]);

  // ── Reactive validation state map (updates on store changes) ──
  const providerValidatedMap: Record<string, boolean> = {
    gemini: geminiKeyValidated,
    ollama: ollamaKeyValidated,
    openrouter: openrouterKeyValidated,
    openai: openaiKeyValidated,
    anthropic: anthropicKeyValidated,
    groq: groqKeyValidated,
    mistral: mistralKeyValidated,
    xai: xaiKeyValidated,
    cohere: cohereKeyValidated,
  };

  // Non-reactive snapshot helper for use in event handlers
  const isValidated = (provider: string): boolean => {
    const store = useSettingsStore.getState();
    const map: Record<string, boolean> = {
      gemini: store.geminiKeyValidated,
      ollama: store.ollamaKeyValidated,
      openrouter: store.openrouterKeyValidated,
      openai: store.openaiKeyValidated,
      anthropic: store.anthropicKeyValidated,
      groq: store.groqKeyValidated,
      mistral: store.mistralKeyValidated,
      xai: store.xaiKeyValidated,
      cohere: store.cohereKeyValidated,
    };
    return map[provider] ?? false;
  };

  // ── Fetch dynamic models for a provider (cached per session) ──
  const fetchDynamicModels = async (provider: ByokProviderId) => {
    const cached = dynamicModelsCache[provider];
    if (cached?.fetched) return;
    setIsFetchingModels(true);
    try {
      const { data } = await edgeFunctions.functions.invoke('validate-api-key', {
        body: { provider, modelsOnly: true },
      });
      if (data?.availableModels?.length) {
        setByokAvailableModels(prev => ({ ...prev, [provider]: data.availableModels }));
        setDynamicModelsCache(prev => ({ ...prev, [provider]: { models: data.availableModels, fetched: true } }));
      } else {
        setDynamicModelsCache(prev => ({ ...prev, [provider]: { models: [], fetched: true } }));
      }
    } catch {
      setDynamicModelsCache(prev => ({ ...prev, [provider]: { models: [], fetched: true } }));
    } finally {
      setIsFetchingModels(false);
    }
  };

  // ── Handle switching to WiseResume AI ──
  const handleSwitchToWiseresume = async () => {
    haptics.selection();
    setUiMode('wiseresume');
    setAIProvider('wiseresume');
    setTestResult(null);
    try {
      const uid = getUserId();
      if (uid) {
        await supabase.from('user_preferences').update({ ai_provider: 'wiseresume' }).eq('user_id', uid);
      }
    } catch {}
  };

  // ── Handle switching to BYOK mode ──
  const handleSwitchToBYOK = () => {
    haptics.selection();
    setUiMode('byok');
    const firstValidated = BYOK_PROVIDER_ORDER.find(p => isValidated(p));
    if (firstValidated) {
      // Activate the first already-validated provider
      setByokProvider(firstValidated as ByokProviderId);
      setAIProvider(firstValidated as AIProvider);
      try {
        const uid = getUserId();
        if (uid) {
          supabase.from('user_preferences').update({ ai_provider: firstValidated }).eq('user_id', uid).then(() => {});
        }
      } catch {}
    } else {
      // No validated BYOK provider yet — open picker to let user choose and configure
      setShowProviderPicker(true);
    }
  };

  // ── Pick a provider from the picker dialog ──
  const handlePickProvider = (provider: ByokProviderId) => {
    setByokProvider(provider);
    setByokKeyInput('');
    setByokShowKey(false);
    setOllamaCorsError(false);
    setShowProviderPicker(false);
    // If this provider is already validated, activate it immediately
    if (isValidated(provider)) {
      setAIProvider(provider);
      try {
        const uid = getUserId();
        if (uid) {
          supabase.from('user_preferences').update({ ai_provider: provider }).eq('user_id', uid).then(() => {});
        }
      } catch {}
      // Fetch dynamic models for validated providers
      const dynamicProviders: ByokProviderId[] = ['openai', 'anthropic', 'groq', 'openrouter'];
      if (dynamicProviders.includes(provider)) {
        fetchDynamicModels(provider);
      }
    }
  };

  // ── Generic BYOK validation handler ──
  const handleValidateBYOK = async () => {
    const provider = byokProvider;
    const config = BYOK_PROVIDERS[provider];
    const keyValue = provider === 'ollama' ? ollamaKeyInput.trim() : byokKeyInput.trim();
    const modelValue = byokModelInputs[provider] || config.defaultModel;

    if (provider !== 'ollama' && !keyValue) {
      toast.error(`Please enter your ${config.label} API key`);
      return;
    }
    if (provider === 'ollama' && !ollamaUrlInput.trim()) {
      toast.error('Please enter your Ollama server URL');
      return;
    }

    setByokIsValidating(true);
    setOllamaCorsError(false);
    haptics.light();

    try {
      const validationBody: Record<string, any> = {
        provider,
        apiKey: keyValue || 'ollama-no-key',
        model: modelValue,
      };
      if (provider === 'ollama') {
        validationBody.baseUrl = ollamaUrlInput.trim();
      }

      const { data: result, error: valError } = await edgeFunctions.functions.invoke('validate-api-key', {
        body: validationBody,
      });

      if (valError || !result?.isValid) {
        haptics.error();
        const errMsg = result?.error || valError?.message || '';
        // Detect Ollama CORS errors: "Failed to fetch" with no response means browser blocked the request
        if (provider === 'ollama' && (errMsg.includes('Failed to fetch') || errMsg.includes('CORS') || errMsg.includes('cors') || errMsg.includes('NetworkError') || (!errMsg && valError))) {
          setOllamaCorsError(true);
        } else {
          toast.error(errMsg || `${config.label} validation failed`);
        }
        return;
      }

      // Save to server
      const savedModel = result.model || modelValue;
      const saveBody: Record<string, any> = {
        action: 'save',
        provider,
        apiKey: keyValue || 'ollama-no-key',
        keyTier: result.tier || 'paid',
        model: savedModel,
      };
      if (provider === 'ollama') {
        saveBody.baseUrl = ollamaUrlInput.trim();
      }

      const { error: saveError } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: saveBody,
      });

      if (saveError) {
        toast.error('Validated but could not save. Please try again.');
        return;
      }

      // Refresh the shared ai-keys cache so any summary UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });

      // Update store
      const store = useSettingsStore.getState();
      switch (provider) {
        case 'gemini':
          store.setGeminiKeyValidated(true);
          store.setGeminiKeyTier(result.tier || 'unknown');
          store.setGeminiModel(savedModel);
          break;
        case 'ollama':
          store.setOllamaKeyValidated(true);
          store.setOllamaBaseUrl(ollamaUrlInput.trim());
          store.setOllamaModel(savedModel);
          break;
        case 'openrouter':
          store.setOpenrouterKeyValidated(true);
          store.setOpenrouterModel(savedModel);
          break;
        case 'openai': store.setOpenaiKeyValidated(true); store.setOpenaiModel(savedModel); break;
        case 'anthropic': store.setAnthropicKeyValidated(true); store.setAnthropicModel(savedModel); break;
        case 'groq': store.setGroqKeyValidated(true); store.setGroqModel(savedModel); break;
        case 'mistral': store.setMistralKeyValidated(true); store.setMistralModel(savedModel); break;
        case 'xai': store.setXaiKeyValidated(true); store.setXaiModel(savedModel); break;
        case 'cohere': store.setCohereKeyValidated(true); store.setCohereModel(savedModel); break;
      }

      // Update local state
      setByokConnectedAt(prev => ({ ...prev, [provider]: new Date().toISOString() }));
      if (keyValue) setByokMaskedKey(prev => ({ ...prev, [provider]: maskKey(keyValue) }));
      if (result.availableModels?.length) {
        setByokAvailableModels(prev => ({ ...prev, [provider]: result.availableModels }));
        setDynamicModelsCache(prev => ({ ...prev, [provider]: { models: result.availableModels, fetched: true } }));
      } else {
        // Mark as fetched so we don't re-fetch immediately
        setDynamicModelsCache(prev => ({ ...prev, [provider]: { models: [], fetched: true } }));
      }
      setByokModelInputs(prev => ({ ...prev, [provider]: savedModel }));

      // Activate provider
      setAIProvider(provider);
      try {
        const uid = getUserId();
        if (uid) {
          await supabase.from('user_preferences').update({ ai_provider: provider }).eq('user_id', uid);
        }
      } catch {}

      logAudit('api_key', 'key_saved', { provider, tier: result.tier, model: savedModel });
      resetFallbackToast();
      haptics.success();

      const modelCount = result.availableModels?.length;
      const modelInfo = modelCount ? ` · ${modelCount} models available` : savedModel ? ` · ${savedModel}` : '';
      toast.success(`${config.label} connected!${modelInfo}`);
    } catch {
      haptics.error();
      toast.error(`Failed to connect to ${config.label}. Please try again.`);
    } finally {
      setByokIsValidating(false);
    }
  };

  // ── Remove a BYOK key ──
  const handleClearBYOK = async (provider: ByokProviderId) => {
    haptics.light();
    const config = BYOK_PROVIDERS[provider];
    try {
      await edgeFunctions.functions.invoke('manage-api-keys', { body: { action: 'delete', provider } });
      logAudit('api_key', 'key_deleted', { provider });
      // Refresh the shared ai-keys cache so any summary UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
    } catch {}

    // Update store
    const store = useSettingsStore.getState();
    switch (provider) {
      case 'gemini': store.setGeminiKeyValidated(false); store.setGeminiKeyTier('unknown'); break;
      case 'ollama': store.setOllamaKeyValidated(false); store.setOllamaBaseUrl(''); store.setOllamaModel(''); break;
      case 'openrouter': store.setOpenrouterKeyValidated(false); store.setOpenrouterModel(''); break;
      case 'openai': store.setOpenaiKeyValidated(false); break;
      case 'anthropic': store.setAnthropicKeyValidated(false); break;
      case 'groq': store.setGroqKeyValidated(false); break;
      case 'mistral': store.setMistralKeyValidated(false); break;
      case 'xai': store.setXaiKeyValidated(false); break;
      case 'cohere': store.setCohereKeyValidated(false); break;
    }
    setByokConnectedAt(prev => ({ ...prev, [provider]: null }));
    setByokMaskedKey(prev => ({ ...prev, [provider]: '' }));
    setByokKeyInput('');
    setOllamaKeyInput('');
    setByokAvailableModels(prev => ({ ...prev, [provider]: [] }));

    if (aiProvider === provider) {
      // Find another validated provider, or fall back to wiseresume
      const next = BYOK_PROVIDER_ORDER.find(p => p !== provider && isValidated(p));
      const fallback: AIProvider = next || 'wiseresume';
      setAIProvider(fallback);
      try {
        const uid = getUserId();
        if (uid) {
          await supabase.from('user_preferences').update({ ai_provider: fallback }).eq('user_id', uid);
        }
      } catch {}
    }
    toast.success(`${config.label} key removed`);
  };

  // ── Update model for an already-connected provider ──
  const handleModelChange = async (provider: ByokProviderId, model: string) => {
    setByokModelInputs(prev => ({ ...prev, [provider]: model }));
    const store = useSettingsStore.getState();
    switch (provider) {
      case 'gemini': store.setGeminiModel(model); break;
      case 'ollama': store.setOllamaModel(model); break;
      case 'openrouter': store.setOpenrouterModel(model); break;
      case 'openai': store.setOpenaiModel(model); break;
      case 'anthropic': store.setAnthropicModel(model); break;
      case 'groq': store.setGroqModel(model); break;
      case 'mistral': store.setMistralModel(model); break;
      case 'xai': store.setXaiModel(model); break;
      case 'cohere': store.setCohereModel(model); break;
    }
    try {
      await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'update_model', provider, model },
      });
      toast.success(`Model set to ${model}`);
    } catch {
      toast.error('Failed to save model selection');
    }
  };

  // ── Test AI Connection ──
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    haptics.light();
    try {
      const { data, error } = await edgeFunctions.functions.invoke('ai-test', {
        body: {},
      });
      if (error) {
        if ((error as any).status === 429 || error.message?.includes('cooldown')) {
          try {
            const jsonText = error.message.replace(/^Edge function returned \d+: /, '');
            const errData = JSON.parse(jsonText);
            if (errData.reason === 'cooldown') {
              setSecondsRemaining(errData.secondsRemaining);
              setCooldownEndsAt(errData.cooldownEndsAt);
              haptics.error();
              toast.error(errData.message || 'Cooldown active');
              return;
            }
          } catch {}
        }
        haptics.error();
        setTestResult({ status: 'error', providerUsed: aiProvider, latencyMs: 0, error: error.message || 'Failed to reach AI service' });
        return;
      }
      if (data?.success) {
        haptics.success();
        setTestResult({
          status: 'success',
          providerUsed: data.providerUsed || aiProvider,
          displayProvider: data.displayProvider,
          displayModel: data.displayModel,
          latencyMs: data.latencyMs || 0,
          fallbackUsed: data.fallbackUsed,
          fallbackReason: data.fallbackReason,
          response: data.response,
          model: data.model,
        });
        if (aiProvider === 'wiseresume') setSecondsRemaining(300);
      } else {
        if (data?.reason === 'cooldown') {
          setSecondsRemaining(data.secondsRemaining);
          setCooldownEndsAt(data.cooldownEndsAt);
          haptics.error();
          return;
        }
        haptics.error();
        setTestResult({ status: 'error', providerUsed: aiProvider, latencyMs: data?.latencyMs || 0, error: data?.error || 'Test failed' });
      }
    } catch (err) {
      haptics.error();
      setTestResult({ status: 'error', providerUsed: aiProvider, latencyMs: 0, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsTesting(false);
      setTimeout(() => refreshUsageHistory(), 1500);
    }
  };

  // ── Key history ──
  const loadKeyHistory = async () => {
    setLoadingKeyHistory(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, metadata, created_at')
        .eq('category', 'api_key')
        .order('created_at', { ascending: false })
        .limit(30);
      setKeyHistory((data as KeyHistoryEntry[]) || []);
    } catch {
      setKeyHistory([]);
    } finally {
      setLoadingKeyHistory(false);
    }
  };

  // ── Render the BYOK form for the current provider ──
  const config = BYOK_PROVIDERS[byokProvider];
  const providerValidated = providerValidatedMap[byokProvider] ?? false;
  const connectedAt = byokConnectedAt[byokProvider];
  const maskedKey = byokMaskedKey[byokProvider];
  const availableModels = byokAvailableModels[byokProvider] || [];
  const currentModel = byokModelInputs[byokProvider] || config.defaultModel;
  const staticModels = config.models as string[];

  // Model list to display (dynamic > static)
  const modelList = availableModels.length > 0 ? availableModels : staticModels;
  const filteredModels = byokProvider === 'openrouter'
    ? modelList.filter(m => m.toLowerCase().includes(openrouterModelSearch.toLowerCase()))
    : modelList;

  // ── Provider display name helpers ──
  const getProviderDisplayName = (p: string): string => {
    const conf = BYOK_PROVIDERS[p as ByokProviderId];
    return conf?.label || p;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-sm sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4 text-primary" />
              AI Settings
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-4 py-3 space-y-4">

              {/* ── Two-Option AI Mode Selector ── */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">AI Provider</Label>

                {/* WiseResume AI Card */}
                <button
                  type="button"
                  onClick={handleSwitchToWiseresume}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-all',
                    uiMode === 'wiseresume'
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      uiMode === 'wiseresume' ? 'border-primary' : 'border-muted-foreground/50'
                    )}>
                      {uiMode === 'wiseresume' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">WiseResume AI</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Built-in AI · No setup needed</p>
                    </div>
                  </div>

                </button>

                {/* Bring Your Own Key Card */}
                <button
                  type="button"
                  onClick={handleSwitchToBYOK}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-all',
                    uiMode === 'byok'
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      uiMode === 'byok' ? 'border-primary' : 'border-muted-foreground/50'
                    )}>
                      {uiMode === 'byok' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Bring Your Own Key</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Use your own API key · 9 providers</p>
                    </div>
                    {uiMode === 'byok' && providerValidated && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                </button>
              </div>

              {/* ── BYOK Configuration Section ── */}
              <AnimatePresence>
                {uiMode === 'byok' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    {/* Active provider header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold', config.iconColor)}>
                          {config.label}
                        </span>
                        {providerValidated && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 px-2"
                        onClick={() => setShowProviderPicker(true)}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {providerValidated ? 'Change' : 'Choose Provider'}
                      </Button>
                    </div>

                    {/* Connected state or setup form */}
                    {providerValidated ? (
                      /* ── Connected Card ── */
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-400">Connected</span>
                          </div>
                          {byokProvider === 'gemini' && (
                            <Badge className={cn(
                              'text-[10px] px-1.5 py-0',
                              geminiKeyTier === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            )}>
                              {geminiKeyTier === 'paid' ? 'Paid' : 'Free'}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          {maskedKey && (
                            <div className="flex items-center gap-2">
                              <Key className="w-3 h-3 shrink-0" />
                              <span className="font-mono">{maskedKey}</span>
                            </div>
                          )}
                          {byokProvider === 'ollama' && (
                            <div className="flex items-center gap-2">
                              <Server className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ollamaUrlInput || ollamaBaseUrl}</span>
                            </div>
                          )}
                          {connectedAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Connected {formatDistanceToNow(new Date(connectedAt), { addSuffix: true })}</span>
                            </div>
                          )}
                        </div>

                        {/* Model selector */}
                        {byokProvider === 'gemini' && geminiKeyTier === 'free' && (
                          <div className="p-2 rounded-md bg-muted/50 text-xs flex justify-between">
                            <span className="text-muted-foreground">Requests today</span>
                            <span className="font-medium">{geminiDailyUsage.count}</span>
                          </div>
                        )}

                        {modelList.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              Model{modelList.length > 1 ? ` · ${modelList.length} available` : ''}
                              {isFetchingModels && <Loader2 className="w-3 h-3 animate-spin" />}
                            </Label>
                            {byokProvider === 'openrouter' ? (
                              <div className="space-y-1">
                                <Input
                                  placeholder="Search models..."
                                  value={openrouterModelSearch}
                                  onChange={e => setOpenrouterModelSearch(e.target.value)}
                                  className="h-7 text-xs"
                                />
                                <Select
                                  value={currentModel}
                                  onValueChange={v => handleModelChange(byokProvider, v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select a model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <ScrollArea className="max-h-[200px]">
                                      {filteredModels.slice(0, 100).map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                      ))}
                                    </ScrollArea>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <Select
                                value={currentModel}
                                onValueChange={v => handleModelChange(byokProvider, v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                  <ScrollArea className="max-h-[200px]">
                                    {modelList.map(m => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}

                        {/* Static model selector when no dynamic models */}
                        {modelList.length === 0 && staticModels.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <Label className="text-[11px] text-muted-foreground">Model</Label>
                            <Select
                              value={currentModel}
                              onValueChange={v => handleModelChange(byokProvider, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {staticModels.map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {hasNoToolCalling(byokProvider, currentModel, byokProvider === 'ollama' ? (ollamaUrlInput || ollamaBaseUrl) : undefined) && (
                          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>This model may not support tool calling. Some AI features like resume parsing and structured improvements may not work correctly.</span>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearBYOK(byokProvider)}
                          className="w-full h-8 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Key & Disconnect
                        </Button>
                      </div>
                    ) : (
                      /* ── Setup Form ── */
                      <div className="rounded-lg border border-border p-3 space-y-3">
                        {/* Ollama: URL field */}
                        {byokProvider === 'ollama' && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Server URL <span className="text-destructive">*</span></Label>
                            <Input
                              value={ollamaUrlInput}
                              onChange={e => setOllamaUrlInput(e.target.value)}
                              placeholder="https://ollama.com"
                              className="h-9 text-sm"
                            />
                          </div>
                        )}

                        {/* API Key field */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            API Key{byokProvider === 'ollama' ? ' (optional)' : ''}
                          </Label>
                          <div className="relative">
                            <Input
                              type={byokShowKey || (byokProvider === 'ollama' && ollamaShowKey) ? 'text' : 'password'}
                              value={byokProvider === 'ollama' ? ollamaKeyInput : byokKeyInput}
                              onChange={e => byokProvider === 'ollama' ? setOllamaKeyInput(e.target.value) : setByokKeyInput(e.target.value)}
                              placeholder={config.keyHint}
                              className="pr-10 h-9 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => byokProvider === 'ollama' ? setOllamaShowKey(s => !s) : setByokShowKey(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {(byokShowKey || (byokProvider === 'ollama' && ollamaShowKey))
                                ? <EyeOff className="w-3.5 h-3.5" />
                                : <Eye className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>

                        {/* Model selection (for providers with static model lists) */}
                        {staticModels.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Model</Label>
                            <Select
                              value={currentModel}
                              onValueChange={v => setByokModelInputs(prev => ({ ...prev, [byokProvider]: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {staticModels.map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Connect button */}
                        <LoadingButton
                          size="sm"
                          onClick={handleValidateBYOK}
                          isLoading={byokIsValidating}
                          loadingText="Connecting..."
                          spinnerSize={14}
                          className="w-full h-8 text-xs"
                        >
                          Connect &amp; Validate
                        </LoadingButton>

                        {/* Ollama CORS error panel */}
                        {byokProvider === 'ollama' && ollamaCorsError && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                              <div className="space-y-1.5">
                                <p className="font-semibold text-amber-300">CORS Error — Browser Blocked the Request</p>
                                <p className="text-amber-200/80">
                                  Your browser is blocking this connection because Ollama does not allow requests from web pages by default. This is a CORS (Cross-Origin Resource Sharing) restriction.
                                </p>
                                <p className="text-amber-200/80">
                                  To fix it, restart Ollama with the following environment variable on your local machine:
                                </p>
                                <div className="bg-black/30 rounded px-2 py-1.5 font-mono text-amber-100 select-all">
                                  OLLAMA_ORIGINS=* ollama serve
                                </div>
                                <p className="text-amber-200/80">
                                  On macOS/Linux you can also set it permanently in your shell profile:<br />
                                  <code className="bg-black/30 px-1 rounded">export OLLAMA_ORIGINS=*</code>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => openExternal('https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server')}
                              className="flex items-center gap-1.5 text-xs text-amber-300 hover:underline ml-6"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ollama CORS documentation
                            </button>
                          </div>
                        )}

                        {/* Docs link */}
                        <button
                          onClick={() => openExternal(config.docsUrl)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {config.docsLabel}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Test AI Connection ── */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Test AI Connection</Label>
                  {secondsRemaining > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {secondsRemaining}s cooldown
                    </span>
                  )}
                </div>

                <LoadingButton
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  isLoading={isTesting}
                  loadingText="Testing..."
                  spinnerSize={14}
                  disabled={secondsRemaining > 0}
                  className="w-full h-8 text-xs gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />Run Test
                </LoadingButton>

                <AnimatePresence mode="wait">
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'rounded-md p-2.5 text-xs space-y-1',
                        testResult.status === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-destructive/10 border border-destructive/20 text-destructive'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {testResult.status === 'success'
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <AlertCircle className="w-3.5 h-3.5" />
                        }
                        <span className="font-medium">
                          {testResult.status === 'success' ? 'Connection OK' : 'Connection Failed'}
                        </span>
                        {testResult.latencyMs > 0 && (
                          <span className="ml-auto opacity-70">{testResult.latencyMs}ms</span>
                        )}
                      </div>
                      {testResult.status === 'error' && testResult.error && (
                        <p className="opacity-80 text-[11px]">{testResult.error}</p>
                      )}
                      {testResult.status === 'success' && (
                        <div className="opacity-80 text-[11px] space-y-0.5">
                          {(testResult.displayProvider || testResult.providerUsed) && (
                            <p>Provider: <span className="font-medium">{testResult.displayProvider || testResult.providerUsed}</span></p>
                          )}
                          {testResult.displayModel && testResult.displayModel !== testResult.displayProvider && (
                            <p>Model: <span className="font-medium">{testResult.displayModel}</span></p>
                          )}
                          {testResult.fallbackUsed && (
                            <p className="text-amber-400">⚡ Fell back to WiseResume AI</p>
                          )}
                          {testResult.response && (
                            <p className="italic opacity-70">"{testResult.response}"</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Usage History ── */}
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Recent AI Usage</span>
                    </div>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', historyOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1.5 space-y-1">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : usageHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No AI usage yet</p>
                    ) : (
                      usageHistory.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate text-muted-foreground capitalize">
                              {log.action_type?.replace(/_/g, ' ')}
                            </span>
                            {(log.metadata as any)?.provider && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                                {(log.metadata as any).provider}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── Key History Link ── */}
              <button
                onClick={() => { setKeyHistoryOpen(true); loadKeyHistory(); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1"
              >
                <History className="w-3.5 h-3.5" />
                View key management history
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Provider Picker Dialog ── */}
      <Dialog open={showProviderPicker} onOpenChange={setShowProviderPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Choose AI Provider</DialogTitle>
            <DialogDescription className="sr-only">Select which AI provider to use for your AI features</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {BYOK_PROVIDER_ORDER.map(p => {
              const conf = BYOK_PROVIDERS[p];
              const validated = providerValidatedMap[p] ?? false;
              const isActive = p === byokProvider;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePickProvider(p)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                    isActive
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  )}
                >
                  {validated && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                  {p === 'ollama' ? (
                    <Server className={cn('w-5 h-5', conf.iconColor)} />
                  ) : p === 'openrouter' ? (
                    <Brain className={cn('w-5 h-5', conf.iconColor)} />
                  ) : (
                    <Key className={cn('w-5 h-5', conf.iconColor)} />
                  )}
                  <span className="text-[10px] font-semibold leading-tight">{conf.label}</span>
                  <span className="text-[9px] text-muted-foreground font-mono leading-tight truncate w-full">{conf.keyHint}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Key History Dialog ── */}
      <Dialog open={keyHistoryOpen} onOpenChange={setKeyHistoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              Key Management History
            </DialogTitle>
            <DialogDescription className="sr-only">A log of API key additions and removals for your AI provider</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingKeyHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : keyHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No key management activity yet</p>
            ) : (
              <div className="space-y-2">
                {keyHistory.map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-1 py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.action === 'key_deleted' ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0">
                          {entry.action === 'key_saved' ? 'Added' : entry.action === 'key_deleted' ? 'Removed' : entry.action}
                        </Badge>
                        {entry.metadata?.provider && (
                          <span className="text-xs text-muted-foreground capitalize">{getProviderDisplayName(entry.metadata.provider)}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {(entry.metadata?.tier || entry.metadata?.model) && (
                      <div className="flex items-center gap-2 pl-6">
                        {entry.metadata.tier && (
                          <span className="text-[10px] text-muted-foreground">Tier: {entry.metadata.tier}</span>
                        )}
                        {entry.metadata.model && (
                          <span className="text-[10px] text-muted-foreground truncate">Model: {entry.metadata.model}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
