import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TailorProgress as TailorProgressType, TailorStep, EnhancedTailorProgress, EnhancedTailorStep } from '@/types/resume';
import { cn } from '@/lib/utils';

interface TailorProgressProps {
  progress: TailorProgressType | EnhancedTailorProgress;
  projectedScore?: { before: number; after: number };
  matchingKeywords?: number;
}

const STEPS: { id: TailorStep | EnhancedTailorStep; label: string }[] = [
  { id: 'analyzing', label: 'Analyzing job requirements' },
  { id: 'analyzing_requirements', label: 'Deep-analyzing requirements' },
  { id: 'detecting_industry', label: 'Detecting industry patterns' },
  { id: 'matching', label: 'Matching your experience' },
  { id: 'matching_experience', label: 'Matching experience' },
  { id: 'rewriting_summary', label: 'Crafting powerful summary' },
  { id: 'optimizing_skills', label: 'Optimizing skills for ATS' },
  { id: 'transforming_bullets', label: 'Transforming achievements' },
  { id: 'enhancing_experience', label: 'Enhancing with metrics' },
  { id: 'calculating_ats', label: 'Calculating ATS score' },
  { id: 'generating_interview_prep', label: 'Preparing interview tips' },
  { id: 'generating_recs', label: 'Generating recommendations' },
  { id: 'finalizing', label: 'Finalizing enhancements' },
];

const FUN_FACTS = [
  "💡 Tailored resumes are 3x more likely to get interviews",
  "📊 75% of resumes never pass ATS screening",
  "🎯 Hiring managers spend 7 seconds on initial resume review",
  "✨ Action verbs increase resume effectiveness by 140%",
  "🔑 Including metrics makes achievements 40% more compelling",
  "🏆 Top resumes use 11-14 unique skills on average",
];

const getStepIndex = (step: TailorStep | EnhancedTailorStep): number => {
  const index = STEPS.findIndex(s => s.id === step);
  return index === -1 ? STEPS.length : index;
};

const getVisibleSteps = (currentStep: TailorStep | EnhancedTailorStep) => {
  // Filter to show relevant steps based on current flow
  const enhancedSteps = ['analyzing_requirements', 'detecting_industry', 'matching_experience', 'transforming_bullets', 'calculating_ats', 'generating_interview_prep', 'finalizing'];
  const legacySteps = ['analyzing', 'matching', 'rewriting_summary', 'optimizing_skills', 'enhancing_experience', 'generating_recs'];
  
  // Determine which flow we're in
  const isEnhanced = enhancedSteps.includes(currentStep);
  
  if (isEnhanced) {
    return STEPS.filter(s => enhancedSteps.includes(s.id) || s.id === 'rewriting_summary' || s.id === 'optimizing_skills');
  }
  return STEPS.filter(s => legacySteps.includes(s.id));
};

export function TailorProgressComponent({ progress, projectedScore, matchingKeywords }: TailorProgressProps) {
  const isComplete = progress.step === 'complete';
  const visibleSteps = getVisibleSteps(progress.step);
  const currentIndex = visibleSteps.findIndex(s => s.id === progress.step);
  const funFact = (progress as EnhancedTailorProgress).funFact || FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          {isComplete ? (
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-sm">
            {isComplete ? '🎉 Tailoring Complete!' : '✨ Supercharging Your Resume'}
          </h4>
          <p className="text-xs text-muted-foreground">{progress.message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <Progress value={progress.progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-right mt-1">
          {Math.round(progress.progress)}%
        </p>
      </div>

      {/* Fun Fact */}
      {!isComplete && (
        <motion.div
          key={funFact}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <p className="text-xs text-amber-700 dark:text-amber-400">{funFact}</p>
        </motion.div>
      )}

      {/* Step List */}
      <div className="space-y-2 mb-5">
        {visibleSteps.map((step, index) => {
          const isCurrentStep = step.id === progress.step;
          const isPastStep = index < currentIndex;
          const isFutureStep = index > currentIndex && !isComplete;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg transition-colors',
                isCurrentStep && 'bg-primary/10',
                isPastStep && 'opacity-60'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                isPastStep || isComplete ? 'bg-primary text-primary-foreground' : 
                isCurrentStep ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {isPastStep || isComplete ? (
                  <Check className="w-3 h-3" />
                ) : isCurrentStep ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Circle className="w-2 h-2" />
                )}
              </div>
              <span className={cn(
                'flex-1',
                isCurrentStep && 'font-medium',
                isFutureStep && 'text-muted-foreground'
              )}>
                {step.label}
              </span>
              {isPastStep && !isComplete && (
                <span className="text-xs text-success">✓</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Stats Preview */}
      <AnimatePresence>
        {(projectedScore || matchingKeywords) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-primary/20 space-y-2"
          >
            {matchingKeywords && matchingKeywords > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Found <strong>{matchingKeywords}</strong> skill gaps to address</span>
              </div>
            )}
            {projectedScore && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success" />
                <span>
                  Projected score: <strong>{projectedScore.before}%</strong> → <strong className="text-success">{projectedScore.after}%</strong>
                  <span className="text-xs text-success ml-1">(+{projectedScore.after - projectedScore.before}%)</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
