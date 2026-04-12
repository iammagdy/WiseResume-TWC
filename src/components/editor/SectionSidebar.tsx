import { memo } from 'react';
import { User, AlignLeft, Briefcase, GraduationCap, Wrench, Plus, Trophy, Rocket, Award, BookOpen, Heart, Globe, Palette, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface CompletionRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function CompletionRing({ score, size = 20, strokeWidth = 2.5 }: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        className={cn(
          'transition-all duration-500',
          score >= 100 ? 'text-success' : score > 0 ? 'text-warning' : 'text-muted-foreground/20'
        )}
      />
    </svg>
  );
}

interface SectionSidebarProps {
  steps: { id: string; label: string }[];
  activeSection: string;
  sectionScores: Record<string, number>;
  completedSteps: Record<string, boolean>;
  onSectionClick: (sectionId: string) => void;
}

const STEP_SHORT_LABELS: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Exp',
  education: 'Edu',
  skills: 'Skills',
  awards: 'Awards',
  projects: 'Projects',
  certifications: 'Certs',
  publications: 'Pubs',
  volunteering: 'Vol',
  languages: 'Lang',
  hobbies: 'Hobbies',
  references: 'Refs',
  more: 'Add',
};

export const SectionSidebar = memo(function SectionSidebar({
  steps,
  activeSection,
  sectionScores,
  completedSteps,
  onSectionClick,
}: SectionSidebarProps) {
  return (
    <nav
      className="shrink-0 flex flex-col gap-0.5 py-2 px-1 border-r border-border bg-card/60 overflow-y-auto"
      aria-label="Resume sections"
      style={{ width: 68 }}
    >
      {steps.map((step) => {
        const isActive = step.id === activeSection;
        const score = sectionScores[step.id] ?? 0;
        const isCompleted = completedSteps[step.id];
        const Icon = STEP_ICONS[step.id] || Plus;
        const label = STEP_SHORT_LABELS[step.id] || step.label;

        return (
          <button
            key={step.id}
            onClick={() => onSectionClick(step.id)}
            className={cn(
              'relative flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all touch-manipulation active:scale-95 min-h-[56px] w-full',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-current={isActive ? 'step' : undefined}
            title={step.label}
          >
            <div className="relative flex items-center justify-center">
              {step.id === 'more' ? (
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isActive ? 'border-primary' : 'border-border'
                )}>
                  <Plus className="w-3 h-3" />
                </div>
              ) : isCompleted ? (
                <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>
              ) : (
                <>
                  <CompletionRing score={score} size={20} />
                  <Icon className="absolute inset-0 m-auto w-2.5 h-2.5" />
                </>
              )}
            </div>
            <span className={cn(
              'text-[9px] font-medium leading-tight text-center truncate w-full px-0.5',
              isActive ? 'text-primary' : isCompleted ? 'text-success' : ''
            )}>
              {label}
            </span>
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
});
