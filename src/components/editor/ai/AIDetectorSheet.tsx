import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Copy,
  Wand2,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface AIDetectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetectionFlag {
  phrase: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

interface DetectionResult {
  aiScore: number;
  humanScore: number;
  confidence: string;
  flags: DetectionFlag[];
  verdict: string;
}

interface HumanizeResult {
  original: string;
  humanized: string;
  changes: string[];
}

type ToneOption = 'professional' | 'confident' | 'friendly';
type ViewState = 'input' | 'analyzing' | 'results';

const TONE_OPTIONS: { id: ToneOption; label: string; description: string }[] = [
  { id: 'professional', label: 'Professional', description: 'Polished but natural' },
  { id: 'confident', label: 'Confident', description: 'Assertive and direct' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
];

export function AIDetectorSheet({ open, onOpenChange }: AIDetectorSheetProps) {
  const { currentResume, updateResume } = useResumeStore();
  const [viewState, setViewState] = useState<ViewState>('input');
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneOption>('professional');
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [humanized, setHumanized] = useState<HumanizeResult | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }

    haptics.medium();
    setViewState('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke('detect-and-humanize', {
        body: {
          text: inputText,
          action: 'detect',
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      setDetection(data.detection);
      setViewState('results');
    } catch (err) {
      console.error('AI detection error:', err);
      toast.error('Failed to analyze text. Please try again.');
      setViewState('input');
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;

    haptics.medium();
    setIsHumanizing(true);

    try {
      const { data, error } = await supabase.functions.invoke('detect-and-humanize', {
        body: {
          text: inputText,
          action: 'humanize',
          tone: selectedTone,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Humanization failed');

      setHumanized(data.humanized);
      toast.success('Text humanized successfully!');
    } catch (err) {
      console.error('Humanization error:', err);
      toast.error('Failed to humanize text. Please try again.');
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = humanized?.humanized || inputText;
    navigator.clipboard.writeText(textToCopy);
    haptics.light();
    toast.success('Copied to clipboard!');
  };

  const handleApplyToSummary = () => {
    if (!currentResume || !humanized?.humanized) return;
    
    updateResume({
      ...currentResume,
      summary: humanized.humanized,
    });
    haptics.success();
    toast.success('Applied to resume summary!');
    onOpenChange(false);
  };

  const handleReset = () => {
    setViewState('input');
    setDetection(null);
    setHumanized(null);
  };

  const handleLoadSummary = () => {
    if (currentResume?.summary) {
      setInputText(currentResume.summary);
      haptics.light();
      toast.success('Loaded resume summary');
    } else {
      toast.error('No summary found in your resume');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-destructive/10 border-destructive/30';
    if (score >= 40) return 'bg-warning/10 border-warning/30';
    return 'bg-success/10 border-success/30';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            AI Detector & Humanizer
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Input State */}
            {viewState === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-4"
              >
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    Many companies use AI detectors. This tool helps you identify AI-sounding text and rewrite it to sound more natural.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Text to Analyze</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadSummary}
                      className="text-xs"
                    >
                      Load Summary
                    </Button>
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your resume summary, bullet points, or any text you want to check..."
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {inputText.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Humanization Tone (for rewriting)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => {
                          setSelectedTone(tone.id);
                          haptics.light();
                        }}
                        className={cn(
                          'p-3 rounded-xl border text-center transition-all',
                          selectedTone === tone.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/50 hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium text-sm">{tone.label}</p>
                        <p className="text-xs text-muted-foreground">{tone.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analyzing State */}
            {viewState === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analyzing your text...</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Checking for AI patterns and common detection triggers
                </p>
              </motion.div>
            )}

            {/* Results State */}
            {viewState === 'results' && detection && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                {/* AI Score */}
                <div className={cn('p-4 rounded-2xl border', getScoreBg(detection.aiScore))}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">AI Detection Score</span>
                    <Badge variant="outline" className="capitalize">
                      {detection.confidence} confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl',
                      getScoreBg(detection.aiScore),
                      getScoreColor(detection.aiScore)
                    )}>
                      {detection.aiScore}%
                    </div>
                    <div className="flex-1">
                      <p className="text-sm mb-1">{detection.verdict}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-success">Human: {detection.humanScore}%</span>
                        <span>•</span>
                        <span className="text-destructive">AI: {detection.aiScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flags */}
                {detection.flags && detection.flags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      AI Patterns Detected ({detection.flags.length})
                    </h4>
                    {detection.flags.map((flag, i) => (
                      <div 
                        key={i} 
                        className={cn('p-3 rounded-xl border', getSeverityColor(flag.severity))}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">"{flag.phrase}"</p>
                          <Badge variant="outline" className="shrink-0 text-xs capitalize">
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Humanized Version */}
                {humanized && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Humanized Version
                    </h4>
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                      <p className="text-sm whitespace-pre-wrap">{humanized.humanized}</p>
                    </div>
                    {humanized.changes && humanized.changes.length > 0 && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-xs font-medium mb-2">Changes Made:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {humanized.changes.map((change, i) => (
                            <li key={i}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {viewState === 'input' && (
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
            >
              <Shield className="w-4 h-4 mr-2" />
              Analyze for AI Patterns
            </Button>
          )}

          {viewState === 'results' && (
            <>
              {!humanized ? (
                <Button
                  className="w-full"
                  onClick={handleHumanize}
                  disabled={isHumanizing}
                >
                  {isHumanizing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Humanize Text
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={handleApplyToSummary}>
                    Apply to Summary
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Analyze Different Text
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
