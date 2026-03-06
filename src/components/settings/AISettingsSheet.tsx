import { useState, useEffect } from 'react';
import { openExternal } from '@/lib/openExternal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, AIProvider, GeminiKeyTier } from '@/store/settingsStore';
import { resetFallbackToast } from '@/lib/aiFallbackToast';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/auditLogger';
import { formatDistanceToNow } from 'date-fns';
import { deriveLastProvider, useAIHealthStore } from '@/store/aiHealthStore';
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

export function AISettingsSheet({ open, onOpenChange }: AISettingsSheetProps) {
    const {
      aiProvider,
      setAIProvider,
      geminiApiKey,
      setGeminiApiKey,
      geminiKeyTier,
      setGeminiKeyTier,
      geminiKeyValidated,
      setGeminiKeyValidated,
      geminiDailyUsage,
      geminiModel,
      setGeminiModel,
      ollamaApiKey,
      setOllamaApiKey,
      ollamaBaseUrl,
      setOllamaBaseUrl,
      ollamaModel,
      setOllamaModel,
      ollamaKeyValidated,
      setOllamaKeyValidated,
    } = useSettingsStore();

    const [showKey, setShowKey] = useState(false);
    const [keyInput, setKeyInput] = useState(geminiApiKey);
    const [isValidating, setIsValidating] = useState(false);
    const [geminiAvailableModels, setGeminiAvailableModels] = useState<string[]>([]);
    const [geminiModelInput, setGeminiModelInput] = useState(geminiModel || 'gemini-2.5-flash');
    // Track when keys were connected (from server hydration)
    const [geminiConnectedAt, setGeminiConnectedAt] = useState<string | null>(null);
    const [ollamaConnectedAt, setOllamaConnectedAt] = useState<string | null>(null);
    // Masked key display
    const [geminiMaskedKey, setGeminiMaskedKey] = useState('');

    const [ollamaKeyInput, setOllamaKeyInput] = useState(ollamaApiKey);
    const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaBaseUrl);
    const [ollamaModelInput, setOllamaModelInput] = useState(ollamaModel);
    const [showOllamaKey, setShowOllamaKey] = useState(false);
    const [isValidatingOllama, setIsValidatingOllama] = useState(false);
    const [ollamaAvailableModels, setOllamaAvailableModels] = useState<string[]>([]);

    // Test connection state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    // Usage history
    interface UsageLog {
      id: string;
      action_type: string;
      metadata: { provider?: string; section?: string; action?: string } | null;
      created_at: string;
    }
    const [usageHistory, setUsageHistory] = useState<UsageLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Key history dialog
    const [keyHistoryOpen, setKeyHistoryOpen] = useState(false);
    const [keyHistory, setKeyHistory] = useState<KeyHistoryEntry[]>([]);
    const [loadingKeyHistory, setLoadingKeyHistory] = useState(false);

    // Helper to mask a key
    const maskKey = (key: string) => {
      if (!key || key.length < 8) return '••••••••';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    // Reusable helper to refresh usage history
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
      // Seed "last used" provider from most recent real AI request
      if (logs.length > 0) {
        const lastProvider = (logs[0].metadata as any)?.provider;
        if (lastProvider && lastProvider !== 'deterministic') {
          useAIHealthStore.getState().recordProvider(lastProvider);
        }
      }
    };

    // Load usage history + hydrate saved keys when sheet opens
    useEffect(() => {
      if (!open) return;
      refreshUsageHistory();

      edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'get' },
      }).then(async ({ data }) => {
        if (!data?.keys) return;
        const keys = data.keys as Array<{
          provider: string;
          key_tier: string;
          base_url: string | null;
          model: string | null;
          created_at?: string;
          updated_at?: string;
        }>;
        for (const key of keys) {
          if (key.provider === 'ollama') {
            if (key.base_url) setOllamaUrlInput(key.base_url);
            if (key.model) setOllamaModelInput(key.model);
            if (key.updated_at || key.created_at) setOllamaConnectedAt(key.updated_at || key.created_at || null);
            if (!ollamaKeyValidated) {
              setOllamaBaseUrl(key.base_url || '');
              setOllamaModel(key.model || '');
              setOllamaKeyValidated(true);
              setAIProvider('ollama');
            }
            // Fetch available models in background
            if (key.base_url) {
              try {
                const { data: valResult } = await edgeFunctions.functions.invoke('validate-api-key', {
                  body: { 
                    apiKey: 'ollama-no-key', 
                    provider: 'ollama',
                    baseUrl: key.base_url,
                    model: key.model || '',
                  },
                });
                if (valResult?.availableModels?.length) {
                  setOllamaAvailableModels(valResult.availableModels);
                }
              } catch {
                // Silently fail
              }
            }
          }
          if (key.provider === 'gemini') {
            if (key.updated_at || key.created_at) setGeminiConnectedAt(key.updated_at || key.created_at || null);
            if (!geminiKeyValidated) {
              setGeminiKeyTier(key.key_tier as any);
              setGeminiKeyValidated(true);
            }
            if (key.model) {
              setGeminiModelInput(key.model);
              setGeminiModel(key.model);
            }
          }
        }
      }).catch(() => {});
    }, [open]);

    const safeProvider = (['wiseresume', 'gemini', 'ollama'] as const).includes(aiProvider as any) 
      ? aiProvider 
      : 'wiseresume';

    useEffect(() => {
      if (open) {
        setKeyInput(geminiApiKey);
        if (geminiApiKey) setGeminiMaskedKey(maskKey(geminiApiKey));
        setOllamaKeyInput(ollamaApiKey);
        const correctedUrl = ollamaBaseUrl?.replace(/api\.ollama\.com/i, 'ollama.com') || '';
        if (correctedUrl) setOllamaUrlInput(correctedUrl);
        if (ollamaModel) setOllamaModelInput(ollamaModel);
        setTestResult(null);
      }
    }, [open, geminiApiKey, ollamaApiKey, ollamaBaseUrl, ollamaModel]);

    const handleProviderChange = async (value: string) => {
      haptics.selection();
      setAIProvider(value as AIProvider);
      setTestResult(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from('user_preferences')
            .update({ ai_provider: value })
            .eq('user_id', session.user.id);
          if (error) {
            console.error('Failed to sync AI provider preference:', error);
            toast.error('Failed to save AI engine preference');
          }
        }
      } catch (err) {
        console.error('Failed to sync AI provider preference:', err);
        toast.error('Failed to save AI engine preference');
      }
      
      if (value === 'gemini' && !geminiKeyValidated) {
        toast.info('Add your Gemini API key below to use your own AI');
      }
      if (value === 'ollama' && !ollamaKeyValidated) {
        setOllamaUrlInput('https://ollama.com');
        setOllamaModelInput('');
        toast.info('Enter your Ollama details below to connect');
      }
    };

    const handleValidateKey = async () => {
      if (!keyInput.trim()) {
        toast.error('Please enter an API key');
        return;
      }

      setIsValidating(true);
      haptics.light();

      try {
        const { data: validationResult, error: validationError } = await edgeFunctions.functions.invoke('validate-api-key', {
          body: { apiKey: keyInput.trim(), provider: 'gemini' },
        });

        if (validationError) {
          haptics.error();
          toast.error('Failed to validate key. Please try again.');
          setGeminiKeyValidated(false);
          setIsValidating(false);
          return;
        }

        if (validationResult?.isValid) {
          const models = validationResult.availableModels || [];
          setGeminiAvailableModels(models);

          const selectedModel = geminiModelInput;
          if (models.length > 0 && !models.includes(selectedModel)) {
            const defaultModel = models.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' : models[0];
            setGeminiModelInput(defaultModel);
          }

          const modelToSave = models.includes(geminiModelInput) ? geminiModelInput 
            : models.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' 
            : models[0] || 'gemini-2.5-flash';

          const { error: saveError } = await edgeFunctions.functions.invoke('manage-api-keys', {
            body: { action: 'save', provider: 'gemini', apiKey: keyInput.trim(), tier: validationResult.tier, model: modelToSave },
          });

          if (saveError) {
            console.error('Failed to save key server-side:', saveError);
            toast.error('Key validated but failed to save. Please try again.');
            setIsValidating(false);
            return;
          }

          setGeminiApiKey(keyInput.trim());
          setGeminiMaskedKey(maskKey(keyInput.trim()));
          setGeminiKeyTier(validationResult.tier);
          setGeminiKeyValidated(true);
          setGeminiModel(modelToSave);
          setGeminiConnectedAt(new Date().toISOString());
          logAudit('api_key', 'key_saved', { provider: 'gemini', tier: validationResult.tier, model: modelToSave });
          resetFallbackToast();
          haptics.success();
          toast.success(`API key validated & saved! Tier: ${validationResult.tier === 'paid' ? 'Paid' : 'Free'} · ${models.length} models available`);
        } else {
          haptics.error();
          toast.error(validationResult?.error || 'Invalid API key');
          setGeminiKeyValidated(false);
        }
      } catch (error) {
        haptics.error();
        toast.error('Failed to validate key. Please try again.');
        setGeminiKeyValidated(false);
      } finally {
        setIsValidating(false);
      }
    };

    const handleClearKey = async () => {
      haptics.light();
      try {
        await edgeFunctions.functions.invoke('manage-api-keys', { body: { action: 'delete', provider: 'gemini' } });
        logAudit('api_key', 'key_deleted', { provider: 'gemini' });
      } catch (e) {
        console.error('Failed to delete key server-side:', e);
      }
      setKeyInput('');
      setGeminiApiKey('');
      setGeminiKeyTier('unknown');
      setGeminiKeyValidated(false);
      setGeminiAvailableModels([]);
      setGeminiMaskedKey('');
      setGeminiConnectedAt(null);
      toast.success('Gemini API key removed');
    };

    const handleValidateOllama = async () => {
      if (!ollamaUrlInput.trim()) {
        toast.error('Please enter your Ollama server URL');
        return;
      }

      setIsValidatingOllama(true);
      haptics.light();

      try {
        const { data: validationResult, error: validationError } = await edgeFunctions.functions.invoke('validate-api-key', {
          body: { 
            apiKey: ollamaKeyInput.trim() || 'ollama-no-key', 
            provider: 'ollama',
            baseUrl: ollamaUrlInput.trim(),
            model: ollamaModelInput.trim(),
          },
        });

        if (validationError) {
          haptics.error();
          toast.error('Failed to connect. Please check your URL.');
          setOllamaKeyValidated(false);
          setIsValidatingOllama(false);
          return;
        }

        if (validationResult?.isValid) {
          const { error: saveError } = await edgeFunctions.functions.invoke('manage-api-keys', {
            body: { 
              action: 'save', 
              provider: 'ollama', 
              apiKey: ollamaKeyInput.trim() || 'ollama-no-key',
              keyTier: 'paid',
              baseUrl: ollamaUrlInput.trim(),
              model: ollamaModelInput.trim(),
            },
          });

          if (saveError) {
            console.error('Failed to save Ollama key server-side:', saveError);
            toast.error('Connected but failed to save. Please try again.');
            setIsValidatingOllama(false);
            return;
          }

          setOllamaApiKey(ollamaKeyInput.trim());
          setOllamaBaseUrl(ollamaUrlInput.trim());
          setOllamaModel(ollamaModelInput.trim());
          setOllamaKeyValidated(true);
          setOllamaConnectedAt(new Date().toISOString());
          setAIProvider('ollama');
          logAudit('api_key', 'key_saved', { provider: 'ollama', model: ollamaModelInput.trim() });
          resetFallbackToast();
          haptics.success();
          
          const models = validationResult.availableModels || [];
          setOllamaAvailableModels(models);
          const modelCount = models.length;
          toast.success(`Ollama connected! ${modelCount} model${modelCount !== 1 ? 's' : ''} available.`);
        } else {
          haptics.error();
          toast.error(validationResult?.error || 'Cannot connect to Ollama server');
          setOllamaKeyValidated(false);
        }
      } catch (error) {
        haptics.error();
        toast.error('Failed to connect. Please check your URL and try again.');
        setOllamaKeyValidated(false);
      } finally {
        setIsValidatingOllama(false);
      }
    };

    const handleClearOllama = async () => {
      haptics.light();
      try {
        await edgeFunctions.functions.invoke('manage-api-keys', { body: { action: 'delete', provider: 'ollama' } });
        logAudit('api_key', 'key_deleted', { provider: 'ollama' });
      } catch (e) {
        console.error('Failed to delete Ollama key server-side:', e);
      }
      setOllamaKeyInput('');
      setOllamaUrlInput('');
      setOllamaModelInput('');
      setOllamaApiKey('');
      setOllamaBaseUrl('');
      setOllamaModel('');
      setOllamaKeyValidated(false);
      setOllamaAvailableModels([]);
      setOllamaConnectedAt(null);
      toast.success('Ollama configuration removed');
    };

    const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      haptics.light();

      try {
        const { data, error } = await edgeFunctions.functions.invoke('ai-test');

        if (error) {
          haptics.error();
          setTestResult({
            status: 'error',
            providerUsed: safeProvider,
            latencyMs: 0,
            error: 'Failed to reach AI service',
          });
          return;
        }

        if (data?.success) {
          haptics.success();
          setTestResult({
            status: 'success',
            providerUsed: data.providerUsed || safeProvider,
            latencyMs: data.latencyMs || 0,
            fallbackUsed: data.fallbackUsed,
            fallbackReason: data.fallbackReason,
            response: data.response,
            model: data.model,
          });
        } else {
          haptics.error();
          setTestResult({
            status: 'error',
            providerUsed: safeProvider,
            latencyMs: data?.latencyMs || 0,
            error: data?.error || 'Test failed',
          });
        }
      } catch (err) {
        haptics.error();
        setTestResult({
          status: 'error',
          providerUsed: safeProvider,
          latencyMs: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setIsTesting(false);
        // Refresh usage history immediately so the test entry appears
        refreshUsageHistory();
      }
    };

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

    const handleOpenKeyHistory = () => {
      setKeyHistoryOpen(true);
      loadKeyHistory();
    };

    const getProviderStatus = (provider: AIProvider) => {
      if (provider === 'wiseresume') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>;
      if (provider === 'gemini') {
        if (!geminiKeyValidated) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Not Set</Badge>;
        if (geminiKeyTier === 'paid') return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Paid ✓</Badge>;
        if (geminiKeyTier === 'unknown') return <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">Connected ✓</Badge>;
        return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">Free ✓</Badge>;
      }
      if (provider === 'ollama') {
        if (!ollamaKeyValidated) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Not Set</Badge>;
        return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected ✓</Badge>;
      }
      return null;
    };

    const providerIcon = (provider: AIProvider) => {
      if (provider === 'wiseresume') return <Zap className="w-4 h-4 text-primary" />;
      if (provider === 'gemini') return <Key className="w-4 h-4 text-blue-400" />;
      if (provider === 'ollama') return <Server className="w-4 h-4 text-green-400" />;
      return null;
    };

    const providers: { id: AIProvider; label: string; desc: string }[] = [
      { id: 'wiseresume', label: 'WiseResume AI', desc: 'Built-in AI · No setup needed' },
      { id: 'gemini', label: 'Gemini API Key', desc: 'Your own Google AI Studio key' },
      { id: 'ollama', label: 'Ollama', desc: 'Cloud API or self-hosted' },
    ];

    // ─── Connected State Card (read-only) ───
    const GeminiConnectedCard = () => (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-400">Connected</span>
          </div>
          <Badge className={cn(
            "text-[10px] px-1.5 py-0",
            geminiKeyTier === 'paid' 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : geminiKeyTier === 'free'
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          )}>
            {geminiKeyTier === 'paid' ? 'Paid' : geminiKeyTier === 'free' ? 'Free' : 'Connected'}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="w-3 h-3 shrink-0" />
            <span className="font-mono">{geminiMaskedKey || maskKey(geminiApiKey)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-3 h-3 shrink-0" />
            <span>Model: <span className="text-foreground font-medium">{geminiModel || geminiModelInput}</span></span>
          </div>
          {geminiConnectedAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Connected {formatDistanceToNow(new Date(geminiConnectedAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Model selector for connected state */}
        {geminiAvailableModels.length > 0 && (
          <div className="space-y-1 pt-1">
            <Label className="text-[11px] text-muted-foreground">
              Model · {geminiAvailableModels.length} available
            </Label>
            <Select
              value={geminiModelInput}
              onValueChange={async (value) => {
                setGeminiModelInput(value);
                setGeminiModel(value);
                try {
                  await edgeFunctions.functions.invoke('manage-api-keys', {
                    body: {
                      action: 'save',
                      provider: 'gemini',
                      apiKey: geminiApiKey,
                      tier: geminiKeyTier,
                      model: value,
                    },
                  });
                  toast.success(`Model set to ${value}`);
                } catch (e) {
                  console.error('Failed to save model selection:', e);
                  toast.error('Failed to save model selection');
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="max-h-[200px]">
                  {geminiAvailableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        )}

        {geminiKeyTier === 'free' && (
          <div className="p-2 rounded-md bg-muted/50 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests today</span>
              <span className="font-medium">{geminiDailyUsage.count}</span>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearKey}
          className="w-full h-8 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Key & Disconnect
        </Button>
      </div>
    );

    const OllamaConnectedCard = () => (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-400">Connected</span>
          </div>
          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Server className="w-3 h-3 shrink-0" />
            <span className="truncate">{ollamaBaseUrl || ollamaUrlInput}</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-3 h-3 shrink-0" />
            <span>Model: <span className="text-foreground font-medium">{ollamaModel || ollamaModelInput || 'Not selected'}</span></span>
          </div>
          {ollamaConnectedAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Connected {formatDistanceToNow(new Date(ollamaConnectedAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Model selector for connected state */}
        {ollamaAvailableModels.length > 0 && (
          <div className="space-y-1 pt-1">
            <Label className="text-[11px] text-muted-foreground">
              Model · {ollamaAvailableModels.length} available
            </Label>
            <Select
              value={ollamaModelInput}
              onValueChange={async (value) => {
                setOllamaModelInput(value);
                setOllamaModel(value);
                try {
                  await edgeFunctions.functions.invoke('manage-api-keys', {
                    body: {
                      action: 'save',
                      provider: 'ollama',
                      apiKey: ollamaKeyInput.trim() || 'ollama-no-key',
                      keyTier: 'paid',
                      baseUrl: ollamaUrlInput.trim(),
                      model: value,
                    },
                  });
                  toast.success(`Model set to ${value}`);
                } catch (e) {
                  console.error('Failed to save model selection:', e);
                  toast.error('Failed to save model selection');
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="max-h-[200px]">
                  {ollamaAvailableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearOllama}
          className="w-full h-8 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete & Disconnect
        </Button>
      </div>
    );

    // ─── Setup State (editable forms) ───
    const GeminiSetupForm = () => (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="AIzaSy..."
            className="pr-10 h-9 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <Button
          size="sm"
          onClick={handleValidateKey}
          disabled={isValidating || !keyInput.trim()}
          className="w-full h-8 text-xs"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Validating...
            </>
          ) : (
            'Connect & Validate'
          )}
        </Button>

        <button
          onClick={() => openExternal('https://aistudio.google.com/apikey')}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Get a key at Google AI Studio
        </button>
      </div>
    );

    const OllamaSetupForm = () => (
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Server URL</Label>
          <Input
            value={ollamaUrlInput}
            onChange={(e) => setOllamaUrlInput(e.target.value)}
            placeholder="https://ollama.com"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">API Key</Label>
          <div className="relative">
            <Input
              type={showOllamaKey ? 'text' : 'password'}
              value={ollamaKeyInput}
              onChange={(e) => setOllamaKeyInput(e.target.value)}
              placeholder="Enter your Ollama API key"
              className="pr-10 h-9 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowOllamaKey(!showOllamaKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOllamaKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Model</Label>
          <Input
            value={ollamaModelInput}
            onChange={(e) => setOllamaModelInput(e.target.value)}
            placeholder="e.g. glm-5:cloud, llama3.1"
            className="h-9 text-sm"
          />
        </div>

        <Button
          size="sm"
          onClick={handleValidateOllama}
          disabled={isValidatingOllama || !ollamaUrlInput.trim()}
          className="w-full h-8 text-xs"
        >
          {isValidatingOllama ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect & Validate'
          )}
        </Button>
      </div>
    );

    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
            <SheetHeader className="shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Provider
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-4">
              {/* Provider Selection */}
              <div className="space-y-1">
                {providers.map((p) => (
                  <div key={p.id}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleProviderChange(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                        safeProvider === p.id 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        safeProvider === p.id ? "border-primary" : "border-muted-foreground/40"
                      )}>
                        {safeProvider === p.id && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {providerIcon(p.id)}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.label}</span>
                        {safeProvider !== p.id && (
                          <p className="text-[11px] text-muted-foreground truncate">{p.desc}</p>
                        )}
                      </div>
                      {getProviderStatus(p.id)}
                    </motion.button>

                    {/* Expanded config for Gemini */}
                    {safeProvider === p.id && p.id === 'gemini' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-7 mt-1 mb-2 space-y-3 pl-3 border-l-2 border-primary/20"
                      >
                        <AnimatePresence mode="wait">
                          {geminiKeyValidated ? (
                            <motion.div
                              key="gemini-connected"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                            >
                              <GeminiConnectedCard />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="gemini-setup"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                            >
                              <GeminiSetupForm />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}

                    {/* Expanded config for Ollama */}
                    {safeProvider === p.id && p.id === 'ollama' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-7 mt-1 mb-2 space-y-3 pl-3 border-l-2 border-primary/20"
                      >
                        <AnimatePresence mode="wait">
                          {ollamaKeyValidated ? (
                            <motion.div
                              key="ollama-connected"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                            >
                              <OllamaConnectedCard />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="ollama-setup"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                            >
                              <OllamaSetupForm />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* Test Connection */}
              <div className="space-y-2 pt-1">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full h-9 text-sm gap-2"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Test AI Connection
                    </>
                  )}
                </Button>

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-lg border text-sm space-y-1",
                      testResult.status === 'success'
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-destructive/5 border-destructive/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="font-medium">
                        {testResult.status === 'success' 
                          ? `Response in ${testResult.latencyMs}ms`
                          : 'Connection failed'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                      <span>Provider: <span className="text-foreground font-medium">{deriveLastProvider(testResult.providerUsed)}</span></span>
                    </div>
                    {testResult.model && (
                      <div className="text-xs text-muted-foreground ml-6">
                        Model: <span className="text-foreground font-medium">{testResult.model}</span>
                      </div>
                    )}
                    {testResult.response && (
                      <div className="text-xs text-muted-foreground ml-6">
                        AI replied: <span className="text-foreground font-medium italic">"{testResult.response}"</span>
                      </div>
                    )}
                    {testResult.fallbackUsed && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 ml-6">
                        <AlertCircle className="w-3 h-3" />
                        {(() => {
                          const reasonMap: Record<string, string> = {
                            gemini_error: 'Gemini key failed — fell back to WiseResume AI',
                            quota_exceeded: 'Gemini quota exhausted',
                            rate_limit: 'Gemini rate limited',
                            invalid_key: 'Gemini key is invalid',
                            model_not_found: 'Gemini model unavailable — fell back to WiseResume AI',
                            ollama_error: 'Ollama connection failed — fell back to WiseResume AI',
                          };
                          const reason = testResult.fallbackReason || '';
                          return reasonMap[reason] || (reason ? `Fallback used: ${reason}` : 'Fallback used');
                        })()}
                      </div>
                    )}
                    {testResult.error && (
                      <p className="text-xs text-destructive ml-6">{testResult.error}</p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Key History Button */}
              <button
                onClick={handleOpenKeyHistory}
                className="flex items-center gap-2 w-full px-1 py-2 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
              >
                <History className="w-4 h-4" />
                Key Connection History
              </button>

              {/* Recent AI Requests */}
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-2 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent AI Requests
                    {usageHistory.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{usageHistory.length}</Badge>
                    )}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", historyOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : usageHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">No AI requests yet.</p>
                  ) : (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1">
                        {usageHistory.map((log) => {
                          const provider = (log.metadata as any)?.provider || 'wiseresume';
                          const providerLabel: Record<string, string> = {
                            ollama: '🟢 Ollama',
                            gemini_byok: '🔵 Gemini',
                            lovable: '⚡ WiseResume',
                            'lovable-gateway': '⚡ WiseResume',
                            lovable_fallback: '⚡ Fallback',
                            gemini_global: '🔵 Gemini',
                            emergent: '🟣 Emergent',
                            wiseresume: '⚡ WiseResume',
                          };
                          const actionLabels: Record<string, string> = {
                            enhance: 'Enhance',
                            rewrite: 'Rewrite',
                            tailor: 'Tailor',
                            interview: 'Interview',
                            cover_letter: 'Cover Letter',
                            generate: 'Generate',
                            summarize: 'Summarize',
                            chat: 'Chat',
                            test: '🧪 Test AI Connection',
                            resignation: 'Resignation',
                            career_assessment: 'Assessment',
                          };
                          const actionLabel = actionLabels[log.action_type] || log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1);
                          return (
                            <div key={log.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate max-w-[120px]">{actionLabel}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  {providerLabel[provider] || provider}
                                </Badge>
                              </div>
                              <span className="text-muted-foreground shrink-0 text-[10px]">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CollapsibleContent>
              </Collapsible>

            </div>
          </SheetContent>
        </Sheet>

        {/* Key History Dialog */}
        <Dialog open={keyHistoryOpen} onOpenChange={setKeyHistoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Key Connection History
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              {loadingKeyHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : keyHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No key connections yet.</p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {keyHistory.map((entry) => {
                      const meta = entry.metadata || {};
                      const provider = meta.provider || 'unknown';
                      const isSaved = entry.action === 'key_saved';
                      const providerEmoji = provider === 'gemini' ? '🔵' : provider === 'ollama' ? '🟢' : provider === 'elevenlabs' ? '🟠' : '⚪';
                      const providerName = provider === 'gemini' ? 'Gemini' : provider === 'ollama' ? 'Ollama' : provider === 'elevenlabs' ? 'ElevenLabs' : provider;
                      
                      return (
                        <div key={entry.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30">
                          <span className="text-base mt-0.5">{providerEmoji}</span>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{providerName}</span>
                              {meta.tier && meta.tier !== 'unknown' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {meta.tier === 'paid' ? 'Paid' : meta.tier === 'free' ? 'Free' : meta.tier}
                                </Badge>
                              )}
                              {meta.model && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 max-w-[120px] truncate">
                                  {meta.model}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {isSaved ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Trash2 className="w-3 h-3 text-destructive" />
                              )}
                              <span>{isSaved ? 'Connected' : 'Removed'} {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
}
