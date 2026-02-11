import { useState, useEffect, useRef } from 'react';
import { Check, Circle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
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

export function TailorProgressComponent({ progress, projectedScore, matchingKeywords }: TailorProgressProps) {
  const isComplete = progress.step === 'complete';
  const visibleSteps = getVisibleSteps(progress.step);
  const currentIndex = visibleSteps.findIndex(s => s.id === progress.step);

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

  // Show/hide state for mount animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 transition-all duration-500',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
          isComplete
            ? 'bg-success/20 shadow-[0_0_16px_-4px_hsl(var(--success)/0.5)]'
            : 'bg-primary/20 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.4)] animate-pulse'
        )}>
          {isComplete ? (
            <Sparkles className="w-5 h-5 text-success" />
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

      {/* Shimmer Progress Bar */}
      <div className="mb-5">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/30 backdrop-blur-sm">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress.progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-right mt-1">
          {Math.round(progress.progress)}%
        </p>
      </div>

      {/* Rotating Fun Fact */}
      {!isComplete && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 min-h-[44px] flex items-center">
          <p
            className={cn(
              'text-xs text-amber-700 dark:text-amber-400 transition-opacity duration-300',
              funFactVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {FUN_FACTS[funFactIndex]}
          </p>
        </div>
      )}

      {/* Step List */}
      <div className="space-y-2 mb-5">
        {visibleSteps.map((step, index) => {
          const isCurrentStep = step.id === progress.step;
          const isPastStep = index < currentIndex;
          const isFutureStep = index > currentIndex && !isComplete;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg transition-all duration-300',
                isCurrentStep && 'bg-primary/10',
                isPastStep && 'opacity-60',
                // Stagger appearance
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2',
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                isPastStep || isComplete ? 'bg-primary text-primary-foreground scale-100' :
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
            </div>
          );
        })}
      </div>

      {/* Stats Preview */}
      {(projectedScore || (matchingKeywords && matchingKeywords > 0)) && (
        <div className="pt-4 border-t border-primary/20 space-y-2">
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
        </div>
      )}
    </div>
  );
}
