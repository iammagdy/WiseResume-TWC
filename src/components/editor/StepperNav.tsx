import { memo, useState } from 'react';
import { Check, User, AlignLeft, Briefcase, GraduationCap, Wrench, Plus, ChevronDown, Trophy, Rocket, Award, BookOpen, Heart, Globe, Palette, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FloatingPanelRoot, FloatingPanelTrigger, FloatingPanelContent } from '@/components/ui/floating-panel';
import haptics from '@/lib/haptics';

interface StepperNavProps {
  steps: { id: string; label: string }[];
  activeStep: string;
  completedSteps: Record<string, boolean>;
  sectionScores?: Record<string, number>;
  onStepClick: (stepId: string) => void;
  justCompletedStep?: string | null;
  onMoreSectionSelect?: (sectionId: string) => void;
}

const MORE_SECTIONS = [
  { id: 'awards', label: 'Awards', icon: Trophy, color: 'text-amber-500' },
  { id: 'projects', label: 'Projects', icon: Rocket, color: 'text-blue-500' },
  { id: 'certifications', label: 'Certifications', icon: Award, color: 'text-orange-500' },
  { id: 'publications', label: 'Publications', icon: BookOpen, color: 'text-emerald-500' },
  { id: 'volunteering', label: 'Volunteering', icon: Heart, color: 'text-rose-500' },
  { id: 'languages', label: 'Languages', icon: Globe, color: 'text-cyan-500' },
  { id: 'hobbies', label: 'Hobbies', icon: Palette, color: 'text-purple-500' },
  { id: 'references', label: 'References', icon: Users, color: 'text-sky-500' },
] as const;

const STEP_ICONS: Record<string, typeof User> = {
  contact: User,
  summary: AlignLeft,
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  more: Plus,
};

const PARTICLE_COLORS = ['bg-success', 'bg-primary', 'bg-warning', 'bg-amber-400', 'bg-success', 'bg-primary'];
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300];

export const StepperNav = memo(function StepperNav({
  steps,
  activeStep,
  completedSteps,
  sectionScores,
  onStepClick,
  justCompletedStep,
  onMoreSectionSelect,
}: StepperNavProps) {
  const isMobile = useIsMobile();
  const [showSheet, setShowSheet] = useState(false);
  const activeIndex = steps.findIndex(s => s.id === activeStep);
  const activeStepData = steps[activeIndex];
  const ActiveIcon = STEP_ICONS[activeStep] || Plus;
  const activeCompleted = completedSteps[activeStep];
  const activeScore = sectionScores?.[activeStep] ?? (activeCompleted ? 100 : 0);
  const activeInProgress = activeScore > 0 && activeScore < 100;

  if (isMobile) {
    return (
      <div className="px-3 py-2">
        {/* Mobile dropdown trigger */}
        <button
          onClick={() => { setShowSheet(true); haptics.light(); }}
          className="w-full flex items-center gap-3 px-4 min-h-[56px] rounded-xl bg-card border border-border active:scale-[0.98] transition-transform touch-manipulation"
        >
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0',
            activeCompleted ? 'border-success bg-success/10' :
            activeInProgress ? 'border-warning bg-warning/10' :
            'border-primary bg-primary/10'
          )}>
            {activeCompleted ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <ActiveIcon className={cn('w-4 h-4', activeInProgress ? 'text-warning' : 'text-primary')} />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className={cn(
              'text-sm font-semibold',
              activeCompleted ? 'text-success' : activeInProgress ? 'text-warning' : 'text-primary'
            )}>
              {activeStepData?.label}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {steps.filter(s => completedSteps[s.id]).length} of {steps.length} complete
            </p>
          </div>
          {activeCompleted ? (
            <span className="text-[10px] font-bold bg-success text-success-foreground rounded-full px-1.5 py-0.5">
              100%
            </span>
          ) : activeScore > 0 ? (
            <span className="text-[10px] font-bold bg-warning text-warning-foreground rounded-full px-1.5 py-0.5">
              {activeScore}%
            </span>
          ) : null}
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {/* Bottom sheet with all sections */}
        <Sheet open={showSheet} onOpenChange={setShowSheet}>
          <SheetContent side="bottom" className="px-4 pb-safe">
            <div className="pt-2 pb-4">
              <h3 className="text-base font-semibold text-foreground mb-3">Resume Sections</h3>
              <div className="flex flex-col gap-2">
                {steps.map((step, i) => {
                  const Icon = STEP_ICONS[step.id] || Plus;
                  const isActive = step.id === activeStep;
                  const isCompleted = completedSteps[step.id];
                  const score = sectionScores?.[step.id] ?? (isCompleted ? 100 : 0);
                  const isInProgress = score > 0 && score < 100;

                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        onStepClick(step.id);
                        setShowSheet(false);
                        haptics.light();
                      }}
                      className={cn(
                        'flex items-center gap-3 px-4 min-h-[64px] rounded-xl border transition-colors touch-manipulation active:scale-[0.98]',
                        isActive
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-card border-border hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0',
                        isCompleted ? 'border-success bg-success/10' :
                        isInProgress ? 'border-warning bg-warning/10' :
                        isActive ? 'border-primary bg-primary/10' :
                        'border-border bg-card'
                      )}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Icon className={cn(
                            'w-4 h-4',
                            isActive ? 'text-primary' : isInProgress ? 'text-warning' : 'text-muted-foreground'
                          )} />
                        )}
                      </div>
                      <span className={cn(
                        'flex-1 text-left text-sm font-medium',
                        isActive ? 'text-primary' : isCompleted ? 'text-success' : isInProgress ? 'text-warning' : 'text-foreground'
                      )}>
                        {step.label}
                      </span>
                      {isInProgress && !isCompleted && (
                        <span className="text-[10px] font-bold bg-warning text-warning-foreground rounded-full px-1.5 py-0.5">
                          {score}%
                        </span>
                      )}
                      {isCompleted && (
                        <Check className="w-4 h-4 text-success shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* More sections FloatingPanel */}
        {onMoreSectionSelect && (
          <div className="mt-2">
            <FloatingPanelRoot>
              <FloatingPanelTrigger title="Additional Sections" className="w-full justify-center gap-2 min-h-[44px]">
                <Plus className="w-4 h-4" />
                More Sections
              </FloatingPanelTrigger>
              <FloatingPanelContent className="max-h-[80dvh] overflow-y-auto pb-safe backdrop-blur-xl bg-background/95">
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {MORE_SECTIONS.map(sec => {
                      const SIcon = sec.icon;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => { onMoreSectionSelect(sec.id); haptics.light(); }}
                          className="flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-transform touch-manipulation"
                        >
                          <SIcon className={cn('w-5 h-5 shrink-0', sec.color)} />
                          <span className="text-sm font-medium text-foreground truncate">{sec.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </FloatingPanelContent>
            </FloatingPanelRoot>
          </div>
        )}
      </div>
    );
  }

  // Desktop: existing horizontal stepper (unchanged)
  return (
    <div className="px-2 py-3 relative">
      {/* Confetti keyframes */}
      <style>{`
        @keyframes stepper-confetti-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        @keyframes stepper-icon-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="flex items-center relative w-full px-1">
        {/* Connecting line (background) */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border/40" />
        {/* Connecting line (progress) */}
        <div
          className="absolute top-5 left-[10%] h-[2px] gradient-primary transition-all duration-400 ease-out"
          style={{
            width: `${activeIndex > 0 ? (activeIndex / (steps.length - 1)) * 80 : 0}%`,
          }}
        />

        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] || Plus;
          const isActive = step.id === activeStep;
          const isCompleted = completedSteps[step.id];
          const isPast = i < activeIndex;
          const score = sectionScores?.[step.id] ?? (isCompleted ? 100 : 0);
          const isInProgress = score > 0 && score < 100;
          const showConfetti = step.id === justCompletedStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1 relative z-10 touch-manipulation flex-1 min-w-0 min-h-[48px] p-1"
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    // Opaque backgrounds to hide the connecting line behind
                    isActive && 'border-primary bg-background shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]',
                    isCompleted && !isActive && 'border-success bg-background',
                    isInProgress && !isActive && !isCompleted && 'border-warning bg-background',
                    !isActive && !isCompleted && !isInProgress && isPast && 'border-primary/40 bg-background',
                    !isActive && !isCompleted && !isInProgress && !isPast && 'border-border bg-card',
                  )}
                  style={showConfetti ? { animation: 'stepper-icon-pulse 400ms ease-out' } : undefined}
                >
                  {/* Inner tint overlay */}
                  <div className={cn(
                    'absolute inset-0 rounded-full',
                    isActive && 'bg-primary/15',
                    isCompleted && !isActive && 'bg-success/15',
                    isInProgress && !isActive && !isCompleted && 'bg-warning/15',
                  )} />
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-success relative z-10" />
                  ) : (
                    <Icon className={cn(
                      'w-5 h-5 relative z-10',
                      isActive ? 'text-primary' : isInProgress ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  )}
                </div>
                {/* Confetti particles */}
                {showConfetti && PARTICLE_ANGLES.map((angle, pi) => {
                  const rad = (angle * Math.PI) / 180;
                  const dist = 24;
                  return (
                    <span
                      key={pi}
                      className={cn('absolute w-1.5 h-1.5 rounded-full pointer-events-none', PARTICLE_COLORS[pi])}
                      style={{
                        top: '50%',
                        left: '50%',
                        '--tx': `${Math.cos(rad) * dist}px`,
                        '--ty': `${Math.sin(rad) * dist}px`,
                        animation: 'stepper-confetti-burst 800ms ease-out forwards',
                      } as React.CSSProperties}
                    />
                  );
                })}
                {/* Percentage badge for in-progress */}
                {isInProgress && !isCompleted && (
                  <span className="absolute -bottom-0.5 -right-1 text-[9px] font-bold bg-warning text-warning-foreground rounded-full px-1 leading-tight">
                    {score}%
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-colors truncate max-w-full',
                isActive ? 'text-primary' : isCompleted ? 'text-success' : isInProgress ? 'text-warning' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </button>
          );
        })}

        {/* Desktop: More sections FloatingPanel */}
        {onMoreSectionSelect && (
          <FloatingPanelRoot className="flex-shrink-0">
            <FloatingPanelTrigger title="Additional Sections" className="h-10 w-10 !px-0 justify-center rounded-full">
              <Plus className="w-5 h-5" />
            </FloatingPanelTrigger>
            <FloatingPanelContent className="max-h-[80dvh] overflow-y-auto pb-safe backdrop-blur-xl bg-background/95">
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {MORE_SECTIONS.map(sec => {
                    const SIcon = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => { onMoreSectionSelect(sec.id); haptics.light(); }}
                        className="flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-transform touch-manipulation"
                      >
                        <SIcon className={cn('w-4 h-4 shrink-0', sec.color)} />
                        <span className="text-sm font-medium text-foreground truncate">{sec.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </FloatingPanelContent>
          </FloatingPanelRoot>
        )}
      </div>
    </div>
  );
});
