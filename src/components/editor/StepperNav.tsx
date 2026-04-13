import { memo, useState, useRef, useEffect } from 'react';
import { Check, User, AlignLeft, Briefcase, GraduationCap, Wrench, Plus, ChevronDown, Trophy, Rocket, Award, BookOpen, Heart, Globe, Palette, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
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
  activeMoreSection?: string | null;
  availableMoreCount?: number;
  hideStepCounter?: boolean;
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
  awards: Trophy,
  projects: Rocket,
  certifications: Award,
  publications: BookOpen,
  volunteering: Heart,
  languages: Globe,
  hobbies: Palette,
  references: Users,
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
  activeMoreSection,
  availableMoreCount,
  hideStepCounter = false,
}: StepperNavProps) {
  const isMobile = useIsMobile();
  const activeIndex = steps.findIndex(s => s.id === activeStep);
  const activeStepData = steps[activeIndex];
  const activeMoreDef = activeStep === 'more' && activeMoreSection
    ? MORE_SECTIONS.find(s => s.id === activeMoreSection)
    : null;
  const ActiveIcon = activeMoreDef ? activeMoreDef.icon : (STEP_ICONS[activeStep] || Plus);
  const activeCompleted = completedSteps[activeStep];
  const activeScore = sectionScores?.[activeStep] ?? (activeCompleted ? 100 : 0);
  const activeInProgress = activeScore > 0 && activeScore < 100;

  const visibleSteps = steps.filter(s => s.id !== 'more');
  const visibleStepCount = visibleSteps.length;
  const visibleActiveIndex = activeStep === 'more' || !visibleSteps.find(s => s.id === activeStep)
    ? visibleStepCount - 1
    : visibleSteps.findIndex(s => s.id === activeStep);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [steps]);

  useEffect(() => {
    if (!isMobile || !scrollRef.current) return;
    const el = scrollRef.current;
    const activeBtn = el.querySelector('[aria-current="step"]') as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setTimeout(updateScrollState, 300);
  }, [activeStep, isMobile]);

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -120 : 120, behavior: 'smooth' });
    haptics.light();
  };

  if (isMobile) {
    const coreStepCount = steps.length;
    const currentStepNumber = activeIndex >= 0 ? activeIndex + 1 : 1;

    return (
      <>
        {/* Step counter label — hidden when integrated into combined nav row */}
        {!hideStepCounter && (
          <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5">
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStepNumber} of {coreStepCount}
            </span>
            {activeStepData && (
              <span className="text-xs font-semibold text-foreground truncate max-w-[50%] text-right">
                {activeMoreDef ? activeMoreDef.label : activeStep === 'more' ? 'More Sections' : (activeStepData.label || '')}
              </span>
            )}
          </div>
        )}

        {/* Horizontal scrollable pill bar with edge chevrons */}
        <div className="relative flex items-center">
          {/* Left chevron */}
          <button
            aria-hidden={!canScrollLeft}
            onClick={() => scrollBy('left')}
            className={cn(
              'absolute left-0 z-10 w-7 h-full flex items-center justify-center bg-gradient-to-r from-background via-background/90 to-transparent transition-opacity shrink-0',
              canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            tabIndex={-1}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>

          <div
            ref={scrollRef}
            className="px-2 py-1 overflow-x-auto scrollbar-hide flex-1"
          >
            <div className="flex items-center gap-1.5 w-max">
              {steps.map((step) => {
                const moreDef = step.id === 'more' && activeMoreSection
                  ? MORE_SECTIONS.find(s => s.id === activeMoreSection)
                  : null;
                const Icon = moreDef ? moreDef.icon : (STEP_ICONS[step.id] || Plus);
                const displayLabel = moreDef ? moreDef.label : step.label;
                const isActive = step.id === activeStep;
                const isCompleted = completedSteps[step.id];
                const score = sectionScores?.[step.id] ?? (isCompleted ? 100 : 0);
                const isInProgress = score > 0 && score < 100;

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      onStepClick(step.id);
                      haptics.light();
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 h-7 rounded-full border text-xs font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 shrink-0',
                      isActive
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : isCompleted
                          ? 'bg-success/10 border-success/30 text-success'
                          : isInProgress
                            ? 'bg-warning/10 border-warning/30 text-warning'
                            : 'bg-card border-border text-muted-foreground'
                    )}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    {step.id === 'more' && !moreDef ? 'Add sections' : displayLabel}
                    {isInProgress && !isCompleted && (
                      <span className="text-[9px] font-bold bg-warning text-warning-foreground rounded-full px-1 py-px leading-tight">
                        {score}%
                      </span>
                    )}
                    {step.id === 'more' && !moreDef && availableMoreCount != null && availableMoreCount > 0 && (
                      <span className="text-[9px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center leading-none shrink-0">
                        {availableMoreCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right chevron */}
          <button
            aria-hidden={!canScrollRight}
            onClick={() => scrollBy('right')}
            className={cn(
              'absolute right-0 z-10 w-7 h-full flex items-center justify-center bg-gradient-to-l from-background via-background/90 to-transparent transition-opacity shrink-0',
              canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            tabIndex={-1}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

      </>
    );
  }

  return (
    <div className="px-2 py-3 relative">
      <div className="flex items-center relative w-full px-1">
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border/40" />
        <div
          className="absolute top-5 left-[10%] h-[2px] gradient-primary transition-all duration-400 ease-out"
          style={{
            width: `${visibleActiveIndex > 0 ? (visibleActiveIndex / (visibleStepCount - 1)) * 80 : 0}%`,
          }}
        />

        {visibleSteps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] || Plus;
          const isActive = step.id === activeStep;
          const isCompleted = completedSteps[step.id];
          const isPast = i < visibleActiveIndex;
          const score = sectionScores?.[step.id] ?? (isCompleted ? 100 : 0);
          const isInProgress = score > 0 && score < 100;
          const showConfetti = step.id === justCompletedStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1 relative z-10 touch-manipulation flex-1 min-w-0 min-h-[48px] p-1"
              aria-current={isActive ? 'step' : undefined}
              aria-label={step.label}
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    isActive && 'border-primary bg-background shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]',
                    isCompleted && !isActive && 'border-success bg-background',
                    isInProgress && !isActive && !isCompleted && 'border-warning bg-background',
                    !isActive && !isCompleted && !isInProgress && isPast && 'border-primary/40 bg-background',
                    !isActive && !isCompleted && !isInProgress && !isPast && 'border-border bg-card',
                  )}
                  style={showConfetti ? { animation: 'stepper-icon-pulse 400ms ease-out' } : undefined}
                >
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

        {onMoreSectionSelect && (
          <FloatingPanelRoot className="flex-shrink-0">
            <FloatingPanelTrigger title="Additional Sections" className="h-10 w-10 !px-0 justify-center rounded-full relative">
              <Plus className="w-5 h-5" />
              {availableMoreCount != null && availableMoreCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {availableMoreCount}
                </span>
              )}
            </FloatingPanelTrigger>
            <FloatingPanelContent className="max-h-[80dvh] overflow-y-auto pb-safe backdrop-blur-sm bg-background/95">
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {MORE_SECTIONS.map(sec => {
                    const SIcon = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => { onMoreSectionSelect(sec.id); haptics.light(); }}
                        className="flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl border border-border bg-card hover:bg-muted active:scale-95 transition-transform touch-manipulation"
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
