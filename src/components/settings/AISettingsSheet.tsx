import { useState, useEffect } from 'react';
import { openExternal } from '@/lib/openExternal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  Info, 
  Loader2,
  Server,
  History,
  ChevronDown,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsStore, AIProvider, GeminiKeyTier } from '@/store/settingsStore';
import { resetFallbackToast } from '@/lib/aiFallbackToast';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/auditLogger';
import { formatDistanceToNow } from 'date-fns';
import { deriveLastProvider } from '@/store/aiHealthStore';
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
              setAIProvider('ollama');
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

    useEffect(() => {
      if (open) {
        setKeyInput(geminiApiKey);
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
          setAIProvider('ollama');
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
      }
    };

    const getProviderStatus = (provider: AIProvider) => {
      if (provider === 'wiseresume') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>;
      if (provider === 'gemini') {
        if (!geminiKeyValidated) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Not Set</Badge>;
        if (geminiKeyTier === 'paid') return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Paid ✓</Badge>;
        return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">Free ✓</Badge>;
      }
      if (provider === 'ollama') {
        if (!ollamaKeyValidated) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Not Set</Badge>;
        return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>;
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

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Provider
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-4">
            {/* Compact Provider Selection */}
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

                  {/* Expanded config for selected provider */}
                  {safeProvider === p.id && p.id === 'gemini' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-7 mt-1 mb-2 space-y-3 pl-3 border-l-2 border-primary/20"
                    >
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

                        {geminiKeyValidated && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Key validated
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleValidateKey}
                            disabled={isValidating || !keyInput.trim()}
                            className="flex-1 h-8 text-xs"
                          >
                            {isValidating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Validating...
                              </>
                            ) : (
                              'Validate Key'
                            )}
                          </Button>
                          {geminiApiKey && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearKey}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        <button
                          onClick={() => openExternal('https://aistudio.google.com/apikey')}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Get a key at Google AI Studio
                        </button>

                        {geminiKeyTier === 'free' && geminiKeyValidated && (
                          <div className="p-2 rounded-md bg-muted/50 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Requests today</span>
                              <span className="font-medium">{geminiDailyUsage.count}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {safeProvider === p.id && p.id === 'ollama' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-7 mt-1 mb-2 space-y-3 pl-3 border-l-2 border-primary/20"
                    >
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
                          <Label className="text-[11px] text-muted-foreground">
                            Model
                            {ollamaAvailableModels.length > 0 && (
                              <span className="ml-1 text-primary">· {ollamaAvailableModels.length} available</span>
                            )}
                          </Label>
                          {ollamaAvailableModels.length > 0 ? (
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
                              <SelectTrigger className="h-9 text-sm">
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
                              placeholder="e.g. glm-5:cloud, llama3.1"
                              className="h-9 text-sm"
                            />
                          )}
                        </div>
                      </div>

                      {ollamaKeyValidated ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected to Ollama server
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not connected — will use WiseResume AI
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleValidateOllama}
                          disabled={isValidatingOllama || !ollamaUrlInput.trim()}
                          className="flex-1 h-8 text-xs"
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
                        {ollamaKeyValidated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearOllama}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
                      Fallback used{testResult.fallbackReason ? `: ${testResult.fallbackReason}` : ''}
                    </div>
                  )}
                  {testResult.error && (
                    <p className="text-xs text-destructive ml-6">{testResult.error}</p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Collapsible Usage History */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-2 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
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
                          lovable: '⚡ Wise',
                          lovable_fallback: '⚡ Fallback',
                          gemini_global: '🔵 Gemini',
                          emergent: '🟣 Emergent',
                          wiseresume: '⚡ Wise',
                          unknown: '❓',
                        };
                        return (
                          <div key={log.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate max-w-[120px]">{log.action_type}</span>
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

            {/* Collapsible Tips */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-2 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Tips
                </div>
                <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    <li>• Free tier keys have strict daily limits</li>
                    <li>• Keys are encrypted and stored securely on the server</li>
                    <li>• WiseResume AI is recommended for best experience</li>
                    {aiProvider === 'ollama' && (
                      <li>• Ollama server must expose an OpenAI-compatible endpoint</li>
                    )}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </SheetContent>
      </Sheet>
    );
}
