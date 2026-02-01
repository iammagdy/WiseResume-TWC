import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TailorProgress as TailorProgressType, TailorStep } from '@/types/resume';
import { cn } from '@/lib/utils';

interface TailorProgressProps {
  progress: TailorProgressType;
  projectedScore?: { before: number; after: number };
  matchingKeywords?: number;
}

const STEPS: { id: TailorStep; label: string }[] = [
  { id: 'analyzing', label: 'Analyzing job requirements' },
  { id: 'matching', label: 'Matching your experience' },
  { id: 'rewriting_summary', label: 'Rewriting summary' },
  { id: 'optimizing_skills', label: 'Optimizing skills' },
  { id: 'enhancing_experience', label: 'Enhancing achievements' },
  { id: 'generating_recs', label: 'Generating recommendations' },
];

const getStepIndex = (step: TailorStep): number => {
  const index = STEPS.findIndex(s => s.id === step);
  return index === -1 ? STEPS.length : index;
};

export function TailorProgressComponent({ progress, projectedScore, matchingKeywords }: TailorProgressProps) {
  const currentIndex = getStepIndex(progress.step);
  const isComplete = progress.step === 'complete';

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
            {isComplete ? 'Tailoring Complete!' : 'Tailoring Your Resume'}
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

      {/* Step List */}
      <div className="space-y-2 mb-5">
        {STEPS.map((step, index) => {
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
                <span className="text-xs text-success">Done</span>
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
                <span>Found <strong>{matchingKeywords}</strong> matching keywords to add</span>
              </div>
            )}
            {projectedScore && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success" />
                <span>
                  Projected score: <strong>{projectedScore.before}%</strong> → <strong className="text-success">{projectedScore.after}%</strong>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
