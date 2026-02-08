import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  AlertTriangle, 
  MessageSquare, 
  Star, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Wand2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import {
  RecruiterPersona,
  RecruiterPersonaInfo,
  RECRUITER_PERSONAS,
  RecruiterAnalysis,
  RedFlag,
} from '@/types/aiStudio';

interface RecruiterSimSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewState = 'persona_select' | 'analyzing' | 'results';

export function RecruiterSimSheet({ open, onOpenChange }: RecruiterSimSheetProps) {
  const { currentResume } = useResumeStore();
  const [viewState, setViewState] = useState<ViewState>('persona_select');
  const [selectedPersona, setSelectedPersona] = useState<RecruiterPersonaInfo | null>(null);
  const [analysis, setAnalysis] = useState<RecruiterAnalysis | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState<string | null>(null);

  const handleSelectPersona = async (persona: RecruiterPersonaInfo) => {
    if (!currentResume) return;
    
    setSelectedPersona(persona);
    setViewState('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke('recruiter-simulation', {
        body: {
          resume: currentResume,
          persona: persona.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data.analysis);
      setViewState('results');
    } catch (err) {
      console.error('Recruiter simulation error:', err);
      toast.error('Failed to run simulation. Please try again.');
      setViewState('persona_select');
    }
  };

  const handleApplyFix = async (redFlag: RedFlag) => {
    if (!currentResume || isApplyingFix) return;
    
    setIsApplyingFix(redFlag.issue);
    
    try {
      // For now, show a toast with the fix suggestion
      // In the future, this could auto-apply the fix using AI
      toast.success(`Suggested fix: ${redFlag.fix}`, {
        duration: 5000,
        action: {
          label: 'Got it',
          onClick: () => {},
        },
      });
    } finally {
      setIsApplyingFix(null);
    }
  };

  const handleReset = () => {
    setViewState('persona_select');
    setSelectedPersona(null);
    setAnalysis(null);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'would_call': return 'text-success';
      case 'maybe_call': return 'text-warning';
      case 'pass': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'would_call': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'maybe_call': return <HelpCircle className="w-5 h-5 text-warning" />;
      case 'pass': return <XCircle className="w-5 h-5 text-destructive" />;
      default: return null;
    }
  };

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case 'would_call': return "I'd Call You";
      case 'maybe_call': return 'Maybe...';
      case 'pass': return "I'd Pass";
      default: return verdict;
    }
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
            <UserCheck className="w-5 h-5 text-primary" />
            Recruiter Simulation
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Persona Selection */}
            {viewState === 'persona_select' && (
              <motion.div
                key="persona_select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-1">Choose Your Recruiter</h3>
                  <p className="text-sm text-muted-foreground">
                    Each persona has different priorities and will give you unique insights
                  </p>
                </div>

                <div className="grid gap-3">
                  {RECRUITER_PERSONAS.map((persona) => (
                    <motion.button
                      key={persona.id}
                      className="w-full p-4 rounded-2xl bg-muted/50 border border-border hover:border-primary/50 transition-all text-left flex items-center gap-4"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectPersona(persona)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                        {persona.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{persona.name}</p>
                        <p className="text-sm text-muted-foreground">{persona.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {persona.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Analyzing State */}
            {viewState === 'analyzing' && selectedPersona && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl mb-6">
                  {selectedPersona.emoji}
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {selectedPersona.name} is reviewing your resume...
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Thinking like a real recruiter with {selectedPersona.title.toLowerCase()} priorities
                </p>
              </motion.div>
            )}

            {/* Results */}
            {viewState === 'results' && analysis && selectedPersona && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                {/* Recruiter Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {selectedPersona.emoji}
                  </div>
                  <div>
                    <p className="font-medium">{selectedPersona.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPersona.title}</p>
                  </div>
                </div>

                {/* Hireability Score */}
                <div className={cn(
                  'p-4 rounded-2xl border',
                  analysis.hireabilityScore >= 70 && 'bg-success/10 border-success/30',
                  analysis.hireabilityScore >= 40 && analysis.hireabilityScore < 70 && 'bg-warning/10 border-warning/30',
                  analysis.hireabilityScore < 40 && 'bg-destructive/10 border-destructive/30',
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Hireability Score</span>
                    <div className="flex items-center gap-2">
                      {getVerdictIcon(analysis.overallVerdict)}
                      <span className={cn('font-semibold', getVerdictColor(analysis.overallVerdict))}>
                        {getVerdictLabel(analysis.overallVerdict)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl',
                      analysis.hireabilityScore >= 70 && 'bg-success/20 text-success',
                      analysis.hireabilityScore >= 40 && analysis.hireabilityScore < 70 && 'bg-warning/20 text-warning',
                      analysis.hireabilityScore < 40 && 'bg-destructive/20 text-destructive',
                    )}>
                      {analysis.hireabilityScore}
                    </div>
                    <p className="text-sm flex-1">{analysis.scoreExplanation}</p>
                  </div>
                </div>

                {/* First Impression */}
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    First Impression
                  </p>
                  <p className="text-sm italic">"{analysis.firstImpression}"</p>
                </div>

                {/* Red Flags */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Red Flags I'd Notice
                  </h4>
                  {analysis.redFlags?.map((flag, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        'p-4 rounded-xl border',
                        getSeverityColor(flag.severity)
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm">{flag.issue}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {flag.severity}
                        </Badge>
                      </div>
                      {flag.quote !== 'N/A' && (
                        <p className="text-xs text-muted-foreground mb-2 italic">
                          From resume: "{flag.quote}"
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-3">
                        <p className="text-xs flex-1">💡 {flag.fix}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-8"
                          onClick={() => handleApplyFix(flag)}
                          disabled={isApplyingFix === flag.issue}
                        >
                          {isApplyingFix === flag.issue ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5" />
                          )}
                          <span className="ml-1.5">Fix</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Questions I'd Ask */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-warning" />
                    Questions I'd Ask
                  </h4>
                  {analysis.questionsIdAsk?.map((q, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border">
                      <p className="font-medium text-sm mb-1">"{q.question}"</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Why: {q.concern}
                      </p>
                      <p className="text-xs text-success">
                        ✓ Good answer would: {q.idealAnswer}
                      </p>
                    </div>
                  ))}
                </div>

                {/* What Makes Me Want to Call */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-success" />
                    What Makes Me Want to Call You
                  </h4>
                  {analysis.callMeFactors?.map((factor, i) => (
                    <div key={i} className="p-4 rounded-xl bg-success/10 border border-success/30">
                      <p className="font-medium text-sm text-success mb-1">{factor.strength}</p>
                      <p className="text-xs text-muted-foreground">{factor.impact}</p>
                    </div>
                  ))}
                </div>

                {/* Top Priority Fix */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    🎯 Top Priority Fix
                  </p>
                  <p className="text-sm">{analysis.topPriorityFix}</p>
                </div>

                {/* Final Verdict */}
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="text-sm font-medium mb-2">Final Verdict</p>
                  <p className="text-sm text-muted-foreground">{analysis.verdictReasoning}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {viewState === 'results' && (
          <div className="p-4 border-t border-border shrink-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleReset}
            >
              Try Another Recruiter
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
