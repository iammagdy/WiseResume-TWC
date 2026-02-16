import { useState, useEffect, forwardRef } from 'react';
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
import { validateGeminiKey } from '@/lib/geminiKeyValidator';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AISettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AISettingsSheet = forwardRef<HTMLDivElement, AISettingsSheetProps>(
  function AISettingsSheet({ open, onOpenChange }, ref) {
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
        const result = await validateGeminiKey(keyInput.trim());

        if (result.isValid) {
          setGeminiApiKey(keyInput.trim());
          setGeminiKeyTier(result.tier);
          setGeminiKeyValidated(true);
          haptics.success();
          toast.success(`API key validated! Tier: ${result.tier === 'paid' ? 'Paid' : 'Free'}`);
        } else {
          haptics.error();
          toast.error(result.error || 'Invalid API key');
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

    const handleClearKey = () => {
      haptics.light();
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
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]" ref={ref}>
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Provider
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
            {/* Provider Selection */}
            <RadioGroup
              key={aiProvider}
              value={aiProvider}
              onValueChange={handleProviderChange}
              className="space-y-3"
            >
              <motion.label
                htmlFor="wiseresume-sheet"
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  aiProvider === 'wiseresume' 
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
              </motion.label>

              <motion.label
                htmlFor="gemini-sheet"
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  aiProvider === 'gemini' 
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
              </motion.label>
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
                    <li>• Keys are stored locally and never shared</li>
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
);
