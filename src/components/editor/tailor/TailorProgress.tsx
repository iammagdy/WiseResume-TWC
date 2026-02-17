import { useState, useEffect, useRef } from 'react';
import { Check, Circle, Loader2, Sparkles, TrendingUp, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TailorProgress as TailorProgressType, TailorStep, EnhancedTailorProgress, EnhancedTailorStep } from '@/types/resume';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TailorProgressProps {
  progress: TailorProgressType | EnhancedTailorProgress;
  projectedScore?: { before: number; after: number };
  matchingKeywords?: number;
  onCancel?: () => void;
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
  "📈 Quantified achievements get 40% more callbacks",
  "🚀 Keywords from job descriptions boost ATS scores by 60%",
];

const getVisibleSteps = (currentStep: TailorStep | EnhancedTailorStep) => {
  const enhancedSteps = ['analyzing_requirements', 'detecting_industry', 'matching_experience', 'transforming_bullets', 'calculating_ats', 'generating_interview_prep', 'finalizing'];
  const legacySteps = ['analyzing', 'matching', 'rewriting_summary', 'optimizing_skills', 'enhancing_experience', 'generating_recs'];
  
  const isEnhanced = enhancedSteps.includes(currentStep);
  
  if (isEnhanced) {
    return STEPS.filter(s => enhancedSteps.includes(s.id) || s.id === 'rewriting_summary' || s.id === 'optimizing_skills');
  }
  return STEPS.filter(s => legacySteps.includes(s.id));
};

// Smooth animated number hook
function useAnimatedNumber(target: number, speed = 0.08) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      const diff = target - current.current;
      if (Math.abs(diff) > 0.5) {
        current.current += diff * speed;
        setDisplay(Math.round(current.current));
        raf = requestAnimationFrame(animate);
      } else {
        current.current = target;
        setDisplay(Math.round(target));
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);

  return display;
}

export function TailorProgressComponent({ progress, projectedScore, matchingKeywords, onCancel }: TailorProgressProps) {
  const isComplete = progress.step === 'complete';
  const visibleSteps = getVisibleSteps(progress.step);
  const currentIndex = visibleSteps.findIndex(s => s.id === progress.step);
  const displayNum = useAnimatedNumber(progress.progress);

  // Estimated time remaining
  const [startTime] = useState(Date.now);
  const estimatedTotal = 25; // seconds
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, estimatedTotal - elapsed);
  const [timeLeft, setTimeLeft] = useState(remaining);

  useEffect(() => {
    if (isComplete) { setTimeLeft(0); return; }
    const interval = setInterval(() => {
      const secs = Math.max(0, estimatedTotal - Math.floor((Date.now() - startTime) / 1000));
      setTimeLeft(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [isComplete, startTime]);

  // Rotating fun facts
  const [funFactIndex, setFunFactIndex] = useState(0);
  const [funFactVisible, setFunFactVisible] = useState(true);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => {
      setFunFactVisible(false);
      setTimeout(() => {
        setFunFactIndex(prev => (prev + 1) % FUN_FACTS.length);
        setFunFactVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [isComplete]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 transition-all duration-500',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      )}
    >
      {/* Large Percentage Display */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - displayNum / 100)}
              className="transition-all duration-300 ease-out"
              style={{
                filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              'text-2xl font-bold tabular-nums',
              isComplete ? 'text-success' : 'text-primary'
            )}>
              {displayNum}%
            </span>
          </div>
          {/* Sparkle effect */}
          {!isComplete && (
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
          )}
        </div>

        <h4 className="font-semibold text-sm mt-3">
          {isComplete ? '🎉 Tailoring Complete!' : '✨ Supercharging Your Resume'}
        </h4>
        <p className="text-xs text-muted-foreground">{progress.message}</p>

        {/* Time remaining */}
        {!isComplete && timeLeft > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>~{timeLeft}s remaining</span>
          </div>
        )}
      </div>

      {/* Glowing Progress Bar */}
      <div className="mb-5">
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-secondary/30 backdrop-blur-sm">
          <motion.div
            className="h-full rounded-full gradient-primary relative overflow-hidden"
            style={{
              width: `${displayNum}%`,
              boxShadow: '0 0 12px -2px hsl(var(--primary) / 0.5)',
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          </motion.div>
        </div>
      </div>

      {/* Rotating Fun Fact */}
      {!isComplete && (
        <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 min-h-[44px] flex items-center">
          <p
            className={cn(
              'text-xs text-warning-foreground transition-opacity duration-300',
              funFactVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {FUN_FACTS[funFactIndex]}
          </p>
        </div>
      )}

      {/* Step List with connecting line */}
      <div className="relative mb-5">
        {/* Vertical connecting line */}
        <div className="absolute left-[13px] top-3 bottom-3 w-px bg-border" />

        <div className="space-y-1">
          {visibleSteps.map((step, index) => {
            const isCurrentStep = step.id === progress.step;
            const isPastStep = index < currentIndex || isComplete;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={cn(
                  'flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg relative z-10 transition-all duration-300',
                  isCurrentStep && 'bg-primary/10',
                )}
              >
                <div className={cn(
                  'w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                  isPastStep ? 'bg-primary text-primary-foreground' :
                  isCurrentStep ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <AnimatePresence mode="wait">
                    {isPastStep ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-3 h-3" />
                      </motion.div>
                    ) : isCurrentStep ? (
                      <motion.div
                        key="loader"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-3 h-3" />
                      </motion.div>
                    ) : (
                      <Circle className="w-2 h-2" />
                    )}
                  </AnimatePresence>
                </div>
                <span className={cn(
                  'flex-1 text-xs',
                  isCurrentStep && 'font-medium text-foreground',
                  isPastStep && 'text-muted-foreground',
                  !isCurrentStep && !isPastStep && 'text-muted-foreground/60'
                )}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cancel Button */}
      {!isComplete && onCancel && (
        (() => {
          const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
          if (elapsedSecs < 5) return null;
          const isTooLong = elapsedSecs >= 30;
          return (
            <div className="mb-4 flex justify-center">
              <Button
                variant={isTooLong ? 'destructive' : 'ghost'}
                size="sm"
                onClick={onCancel}
                className="min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 mr-1.5" />
                {isTooLong ? 'Taking too long? Cancel generation' : 'Cancel'}
              </Button>
            </div>
          );
        })()
      )}

      {/* Stats Preview */}
      {(projectedScore || (matchingKeywords && matchingKeywords > 0)) && (
        <div className="pt-4 border-t border-primary/20 space-y-2">
          {matchingKeywords && matchingKeywords > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-warning" />
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
        </div>
      )}
    </div>
  );
}
