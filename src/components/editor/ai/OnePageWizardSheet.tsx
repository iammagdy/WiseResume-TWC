import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Loader2,
  CheckCircle2,
  ArrowRight,
  Scissors,
  AlertCircle,
  Sparkles,
  Layout,
  Download,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';


interface OnePageWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportOnePage?: () => void;
}

interface ContentReduction {
  section: string;
  original: string;
  condensed: string;
  wordsRemoved: number;
  strategy: string;
}

interface RemovedItem {
  section: string;
  item: string;
  reason: string;
}

interface CondensedExperience {
  id: string;
  description: string;
  achievements: string[];
}

interface OnePageResult {
  currentEstimatedPages: number;
  optimizedEstimatedPages: number;
  reductions: ContentReduction[];
  removedItems: RemovedItem[];
  condensedSummary?: string;
  condensedExperience: CondensedExperience[];
  layoutSuggestions: string[];
  overallStrategy: string;
}

type ViewState = 'preview' | 'analyzing' | 'results';

export function OnePageWizardSheet({ open, onOpenChange, onExportOnePage }: OnePageWizardSheetProps) {
  const { currentResume, updateResume } = useResumeStore();
  const [viewState, setViewState] = useState<ViewState>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OnePageResult | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'one-page' });

  const handleAnalyze = async () => {
    if (!currentResume) {
      toast.error('Please create a resume first');
      return;
    }

    haptics.medium();
    setViewState('analyzing');
    setIsLoading(true);

    try {
      const data = await executeAI(async () => {
        const { data, error } = await edgeFunctions.functions.invoke('one-page-optimizer', {
          body: {
            resume: currentResume,
            preserveRecent: 2,
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Optimization failed');
        return data;
      });

      if (!data) { setViewState('preview'); return; }

      setResult(data);
      setViewState('results');
    } catch (err) {
      console.error('One-page optimization error:', err);
      toast.error('Failed to analyze. Please try again.');
      setViewState('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const applyCondensedChanges = () => {
    if (!currentResume || !result) return;

    const updatedResume = { ...currentResume };
    
    if (result.condensedSummary) {
      updatedResume.summary = result.condensedSummary;
    }

    if (result.condensedExperience && result.condensedExperience.length > 0) {
      updatedResume.experience = currentResume.experience.map(exp => {
        const condensed = result.condensedExperience.find(c => c.id === exp.id);
        if (condensed) {
          return {
            ...exp,
            description: condensed.description,
            achievements: condensed.achievements,
          };
        }
        return exp;
      });
    }

    updateResume(updatedResume);
  };

  const handleApplyChanges = () => {
    applyCondensedChanges();
    haptics.success();
    toast.success('Resume condensed successfully!');
    onOpenChange(false);
  };

  const handleApplyAndDownload = () => {
    applyCondensedChanges();
    haptics.success();
    toast.success('Changes applied! Generating one-page PDF...');
    onOpenChange(false);
    onExportOnePage?.();
  };

  const handleReset = () => {
    setViewState('preview');
    setResult(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            One-Page Wizard
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Preview State */}
            {viewState === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-6"
              >
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Scissors className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Condense to One Page</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Most recruiters prefer one-page resumes. Let AI intelligently trim your content while keeping the best parts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Smart Optimization Strategies
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Preserves your 2 most recent roles in full detail</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Condenses older positions to key achievements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Removes redundant or low-impact content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Suggests layout optimizations</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <p className="text-sm text-warning-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    You'll review all changes before applying them
                  </p>
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
                  <Scissors className="w-10 h-10 text-primary" />
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analyzing your resume...</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Finding the best ways to condense without losing impact
                </p>
              </motion.div>
            )}

            {/* Results State */}
            {viewState === 'results' && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                {/* Page Count */}
                <div className="p-4 rounded-2xl bg-success/10 border border-success/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Page Reduction</span>
                    <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                      {result.currentEstimatedPages} → {result.optimizedEstimatedPages} page
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Before</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-success">After</span>
                      </div>
                      <Progress 
                        value={(1 / result.currentEstimatedPages) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Strategy */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Optimization Strategy
                  </p>
                  <p className="text-sm text-muted-foreground">{result.overallStrategy}</p>
                </div>

                {/* Reductions */}
                {result.reductions && result.reductions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Content Condensed</h4>
                    {result.reductions.map((reduction, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="capitalize">
                            {reduction.section || 'Content'}
                          </Badge>
                          {reduction.wordsRemoved != null && (
                            <span className="text-xs text-success">
                              -{reduction.wordsRemoved} words
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{reduction.strategy}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Removed Items */}
                {result.removedItems && result.removedItems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      Content Removed
                    </h4>
                    {result.removedItems.map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.section}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{item.item || (item as any).name || (item as any).title || JSON.stringify(item)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.reason || (item as any).description || ''}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout Suggestions */}
                {result.layoutSuggestions && result.layoutSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Layout className="w-4 h-4 text-primary" />
                      Layout Tips
                    </h4>
                    {result.layoutSuggestions.map((tip, i) => (
                      <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {viewState === 'preview' && (
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={!currentResume}
            >
              <Scissors className="w-4 h-4 mr-2" />
              Analyze & Condense
            </Button>
          )}

          {viewState === 'results' && result && (
            <>
              <Button className="w-full" onClick={handleApplyAndDownload}>
                <Download className="w-4 h-4 mr-2" />
                Apply & Download One-Page PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={handleApplyChanges}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply Changes Only
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleReset}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
