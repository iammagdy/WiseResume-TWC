import { useState, useEffect } from 'react';
import { openExternal } from '@/lib/openExternal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Info, 
  Loader2,
  Server,
  History,
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
      // Ollama
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

    // Ollama local state
    const [ollamaKeyInput, setOllamaKeyInput] = useState(ollamaApiKey);
    const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaBaseUrl);
    const [ollamaModelInput, setOllamaModelInput] = useState(ollamaModel);
    const [showOllamaKey, setShowOllamaKey] = useState(false);
    const [isValidatingOllama, setIsValidatingOllama] = useState(false);
    const [ollamaAvailableModels, setOllamaAvailableModels] = useState<string[]>([]);

    // Usage history
    interface UsageLog {
      id: string;
      action_type: string;
      metadata: { provider?: string; section?: string; action?: string } | null;
      created_at: string;
    }
    const [usageHistory, setUsageHistory] = useState<UsageLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Load usage history + hydrate saved keys when sheet opens
    useEffect(() => {
      if (!open) return;
      setLoadingHistory(true);
      supabase
        .from('ai_usage_logs')
        .select('id, action_type, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setUsageHistory((data as UsageLog[]) || []);
          setLoadingHistory(false);
        });

      // Hydrate saved provider config from server
      edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'get' },
      }).then(({ data }) => {
        if (!data?.keys) return;
        const keys = data.keys as Array<{
          provider: string;
          key_tier: string;
          base_url: string | null;
          model: string | null;
        }>;
        for (const key of keys) {
          if (key.provider === 'ollama') {
            if (key.base_url) setOllamaUrlInput(key.base_url);
            if (key.model) setOllamaModelInput(key.model);
            if (!ollamaKeyValidated) {
              setOllamaBaseUrl(key.base_url || '');
              setOllamaModel(key.model || '');
              setOllamaKeyValidated(true);
            }
          }
          if (key.provider === 'gemini') {
            if (!geminiKeyValidated) {
              setGeminiKeyTier(key.key_tier as any);
              setGeminiKeyValidated(true);
            }
          }
        }
      }).catch(() => {});
    }, [open]);

    const safeProvider = (['wiseresume', 'gemini', 'ollama'] as const).includes(aiProvider as any) 
      ? aiProvider 
      : 'wiseresume';

    // Sync inputs when sheet opens
    useEffect(() => {
      if (open) {
        setKeyInput(geminiApiKey);
        setOllamaKeyInput(ollamaApiKey);
        // Auto-correct legacy api.ollama.com → ollama.com
        const correctedUrl = ollamaBaseUrl?.replace(/api\.ollama\.com/i, 'ollama.com') || '';
        if (correctedUrl) setOllamaUrlInput(correctedUrl);
        if (ollamaModel) setOllamaModelInput(ollamaModel);
      }
    }, [open, geminiApiKey, ollamaApiKey, ollamaBaseUrl, ollamaModel]);

    const handleProviderChange = (value: string) => {
      haptics.selection();
      setAIProvider(value as AIProvider);
      
      if (value === 'gemini' && !geminiApiKey) {
        toast.info('Add your Gemini API key below to use your own AI');
      }
      if (value === 'ollama' && !ollamaBaseUrl) {
        setOllamaUrlInput('https://ollama.com');
        setOllamaModelInput('');
        toast.info('Enter your Ollama API key below to connect');
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
          const { error: saveError } = await edgeFunctions.functions.invoke('manage-api-keys', {
            body: { action: 'save', provider: 'gemini', apiKey: keyInput.trim(), tier: validationResult.tier },
          });

          if (saveError) {
            console.error('Failed to save key server-side:', saveError);
            toast.error('Key validated but failed to save. Please try again.');
            setIsValidating(false);
            return;
          }

          setGeminiApiKey(keyInput.trim());
          setGeminiKeyTier(validationResult.tier);
          setGeminiKeyValidated(true);
          logAudit('api_key', 'key_saved', { provider: 'gemini', tier: validationResult.tier });
          resetFallbackToast();
          haptics.success();
          toast.success(`API key validated & saved! Tier: ${validationResult.tier === 'paid' ? 'Paid' : 'Free'}`);
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
      toast.success('API key removed');
    };

    // ===== Ollama handlers =====
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
          logAudit('api_key', 'key_saved', { provider: 'ollama' });
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
      toast.success('Ollama configuration removed');
    };

    const getTierBadge = (tier: GeminiKeyTier) => {
      switch (tier) {
        case 'paid':
          return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Paid</Badge>;
        case 'free':
          return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Free Tier</Badge>;
        default:
          return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>;
      }
    };

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Provider
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
            {/* Provider Selection */}
            <RadioGroup
              key={safeProvider}
              value={safeProvider}
              onValueChange={handleProviderChange}
              className="space-y-3"
            >
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProviderChange('wiseresume')}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  safeProvider === 'wiseresume' 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:bg-accent/50"
                )}
              >
                <RadioGroupItem value="wiseresume" id="wiseresume-sheet" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">WiseResume AI</span>
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Built-in AI powered by multiple models. No setup required.
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProviderChange('gemini')}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  safeProvider === 'gemini' 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:bg-accent/50"
                )}
              >
                <RadioGroupItem value="gemini" id="gemini-sheet" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Your Gemini API Key</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use your own Google AI Studio key for direct access.
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProviderChange('ollama')}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  safeProvider === 'ollama' 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:bg-accent/50"
                )}
              >
                <RadioGroupItem value="ollama" id="ollama-sheet" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Ollama</span>
                    <Badge variant="outline" className="text-xs">Cloud API</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use your Ollama API key from ollama.com.
                  </p>
                </div>
              </motion.div>
            </RadioGroup>

            {/* Gemini API Key Management */}
            <AnimatePresence mode="wait">
              {aiProvider === 'gemini' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Key className="w-4 h-4 text-primary" />
                      Gemini API Key
                    </div>
                    {geminiKeyValidated && getTierBadge(geminiKeyTier)}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showKey ? 'text' : 'password'}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="AIzaSy..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {geminiKeyValidated && (
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      Key validated successfully
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleValidateKey}
                      disabled={isValidating || !keyInput.trim()}
                      className="flex-1"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        'Validate Key'
                      )}
                    </Button>
                    {geminiApiKey && (
                      <Button
                        variant="outline"
                        onClick={handleClearKey}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <button
                    onClick={() => openExternal('https://aistudio.google.com/apikey')}
                    className="flex items-center gap-2 text-sm text-primary hover:underline touch-manipulation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Get a key at Google AI Studio
                  </button>

                  {/* Usage Stats (for Gemini free tier) */}
                  {geminiKeyTier === 'free' && geminiKeyValidated && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Daily Usage</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Requests today</span>
                        <span className="font-medium">{geminiDailyUsage.count}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ollama Configuration */}
            <AnimatePresence mode="wait">
              {aiProvider === 'ollama' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Server className="w-4 h-4 text-primary" />
                      Ollama Configuration
                    </div>
                    {ollamaKeyValidated && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Connected{ollamaAvailableModels.length > 0 ? ` · ${ollamaAvailableModels.length} models` : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Server URL</Label>
                      <Input
                        value={ollamaUrlInput}
                        onChange={(e) => setOllamaUrlInput(e.target.value)}
                        placeholder="https://ollama.com"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Ollama Cloud: https://ollama.com — or your self-hosted URL
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">API Key</Label>
                      <div className="relative">
                        <Input
                          type={showOllamaKey ? 'text' : 'password'}
                          value={ollamaKeyInput}
                          onChange={(e) => setOllamaKeyInput(e.target.value)}
                          placeholder="Enter your Ollama API key"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOllamaKey(!showOllamaKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showOllamaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Model Name
                        {ollamaAvailableModels.length > 0 && (
                          <span className="ml-1.5 text-primary">· {ollamaAvailableModels.length} available</span>
                        )}
                      </Label>
                      {ollamaAvailableModels.length > 0 ? (
                        <Select
                          value={ollamaModelInput}
                          onValueChange={async (value) => {
                            setOllamaModelInput(value);
                            setOllamaModel(value);
                            // Auto-save model selection to DB
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
                          <SelectTrigger>
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
                      ) : (
                        <Input
                          value={ollamaModelInput}
                          onChange={(e) => setOllamaModelInput(e.target.value)}
                          placeholder="e.g. glm-5:cloud, llama3.1, mistral"
                        />
                      )}
                    </div>
                  </div>

                  {ollamaKeyValidated ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected to Ollama server
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-500">
                      <AlertCircle className="w-4 h-4" />
                      Not connected — AI features will use WiseResume AI until validated
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleValidateOllama}
                      disabled={isValidatingOllama || !ollamaUrlInput.trim()}
                      className="flex-1"
                    >
                      {isValidatingOllama ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect & Validate'
                      )}
                    </Button>
                    {ollamaKeyValidated && (
                      <Button
                        variant="outline"
                        onClick={handleClearOllama}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Usage History */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="w-4 h-4 text-primary" />
                Recent AI Requests
              </div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : usageHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No AI requests yet.</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {usageHistory.map((log) => {
                      const provider = (log.metadata as any)?.provider || 'wiseresume';
                      const providerLabel: Record<string, string> = {
                        ollama: '🟢 Ollama',
                        gemini_byok: '🔵 Gemini BYOK',
                        lovable: '⚡ WiseResume',
                        lovable_fallback: '⚡ WiseResume (fallback)',
                        gemini_global: '🔵 Gemini',
                        emergent: '🟣 Emergent',
                        wiseresume: '⚡ WiseResume',
                        unknown: '❓ Unknown',
                      };
                      return (
                        <div key={log.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.action_type}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {providerLabel[provider] || provider}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Tips Card */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-amber-500">Tips</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Free tier keys have strict daily limits</li>
                    <li>• Keys are encrypted and stored securely on the server</li>
                    <li>• WiseResume AI is recommended for best experience</li>
                    {aiProvider === 'ollama' && (
                      <li>• Ollama server must expose an OpenAI-compatible endpoint</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
}
