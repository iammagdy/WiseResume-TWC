import { useState } from 'react';
import { Brain, Key, Zap, CheckCircle2, AlertCircle, ExternalLink, Trash2, Eye, EyeOff, Mic, Info, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, AIProvider, GeminiKeyTier } from '@/store/settingsStore';
import { validateGeminiKey } from '@/lib/geminiKeyValidator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ElevenLabsKeySheet } from '@/components/settings/ElevenLabsKeySheet';

export default function AIPage() {
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
    elevenlabsApiKey,
    setElevenlabsApiKey,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(geminiApiKey);
  const [isValidating, setIsValidating] = useState(false);
  const [elevenLabsSheetOpen, setElevenLabsSheetOpen] = useState(false);

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
    <div className="flex-1 flex flex-col min-h-0 pb-20">
      {/* Header */}
      <header className="pt-safe pt-4 pb-3 px-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">AI Settings</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-4 space-y-4">
          
          {/* Provider Selection */}
          <Card className="glass-elevated border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                AI Provider
              </CardTitle>
              <CardDescription className="text-sm">
                Choose your AI backend for resume assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={aiProvider}
                onValueChange={handleProviderChange}
                className="space-y-3"
              >
                <motion.label
                  htmlFor="lovable"
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    aiProvider === 'lovable' 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card hover:bg-accent/50"
                  )}
                >
                  <RadioGroupItem value="lovable" id="lovable" className="mt-0.5" />
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
                  htmlFor="gemini"
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    aiProvider === 'gemini' 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card hover:bg-accent/50"
                  )}
                >
                  <RadioGroupItem value="gemini" id="gemini" className="mt-0.5" />
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
            </CardContent>
          </Card>

          {/* Gemini API Key Management */}
          <AnimatePresence mode="wait">
            {aiProvider === 'gemini' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-elevated border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        Gemini API Key
                      </CardTitle>
                      {geminiKeyValidated && getTierBadge(geminiKeyTier)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="text-sm">API Key</Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
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

                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Get a key at Google AI Studio
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Usage Stats (for Gemini free tier) */}
          {aiProvider === 'gemini' && geminiKeyTier === 'free' && geminiKeyValidated && (
            <Card className="glass-elevated border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Daily Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Requests today</span>
                    <span className="font-medium">{geminiDailyUsage.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Free tier has limited daily requests. Usage resets at midnight Pacific time.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Integration */}
          <Card className="glass-elevated border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                Voice Integration
              </CardTitle>
              <CardDescription className="text-sm">
                For voice-based mock interviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setElevenLabsSheetOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">ElevenLabs API Key</p>
                    <p className="text-xs text-muted-foreground">
                      {elevenlabsApiKey ? 'Configured' : 'Not configured'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="glass-elevated border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-amber-500">Tips</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Free tier keys have strict daily limits (50-200 requests)</li>
                    <li>• Paid keys unlock faster responses and higher limits</li>
                    <li>• Keys are stored locally and sent directly to Google</li>
                    <li>• WiseResume AI is recommended for the best experience</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ElevenLabs Sheet */}
      <ElevenLabsKeySheet 
        open={elevenLabsSheetOpen} 
        onOpenChange={setElevenLabsSheetOpen}
        currentKey={elevenlabsApiKey}
        onSave={setElevenlabsApiKey}
      />
    </div>
  );
}
