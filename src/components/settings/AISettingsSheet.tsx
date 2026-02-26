import { useState, useEffect } from 'react';
import { openExternal } from '@/lib/openExternal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, AIProvider, GeminiKeyTier } from '@/store/settingsStore';
import { resetFallbackToast } from '@/lib/aiFallbackToast';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/auditLogger';

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
    } = useSettingsStore();

    const [showKey, setShowKey] = useState(false);
    const [keyInput, setKeyInput] = useState(geminiApiKey);
    const [isValidating, setIsValidating] = useState(false);

    const safeProvider = (aiProvider === 'wiseresume' || aiProvider === 'gemini') 
      ? aiProvider 
      : 'wiseresume';

    // Sync keyInput when sheet opens
    useEffect(() => {
      if (open) {
        setKeyInput(geminiApiKey);
      }
    }, [open, geminiApiKey]);

    const handleProviderChange = (value: string) => {
      haptics.selection();
      setAIProvider(value as AIProvider);
      
      if (value === 'gemini' && !geminiApiKey) {
        toast.info('Add your Gemini API key below to use your own AI');
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
        // Validate server-side via edge function (key never exposed in browser network)
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
          // Save key server-side via manage-api-keys edge function
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
      // Delete key server-side
      try {
        await edgeFunctions.functions.invoke('manage-api-keys', {
          body: { action: 'delete', provider: 'gemini' },
        });
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
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
}
