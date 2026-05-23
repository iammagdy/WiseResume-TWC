import { memo, useCallback, useEffect, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  User,
  AlignLeft,
  Briefcase,
  GraduationCap,
  Wrench,
  Plus,
  Trophy,
  Rocket,
  Award,
  BookOpen,
  Heart,
  Globe,
  Users,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const CORE_IDS = new Set(['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications']);

const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards',
  publications: 'Publications',
  volunteering: 'Volunteering',
  languages: 'Languages',
  hobbies: 'Hobbies',
  references: 'References',
  more: 'More Sections',
};

interface EditorNavRailProps {
  steps: { id: string; label: string }[];
  activeSection: string;
  sectionScores: Record<string, number>;
  completedSteps: Record<string, boolean>;
  onSectionClick: (sectionId: string) => void;
}

/** Section navigator only — app sidebar owns global/workspace nav and branding. */
export const EditorNavRail = memo(function EditorNavRail({
  steps,
  activeSection,
  sectionScores,
  completedSteps,
  onSectionClick,
}: EditorNavRailProps) {
  const [expanded, setExpanded] = useState(false);

  const lastCoreIndex = steps.reduce((last, step, idx) => (CORE_IDS.has(step.id) ? idx : last), -1);
  const sectionSteps = steps.filter((s) => s.id !== 'more');
  const hasMoreStep = steps.some((s) => s.id === 'more');

  useEffect(() => {
    setExpanded(false);
  }, [activeSection]);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      setExpanded(false);
      onSectionClick(sectionId);
    },
    [onSectionClick],
  );

  const renderSectionButton = (
    step: { id: string; label: string },
    opts: { compact: boolean },
  ) => {
    const isActive = step.id === activeSection;
    const score = sectionScores[step.id] ?? 0;
    const isCompleted = completedSteps[step.id];
    const Icon = STEP_ICONS[step.id] || Plus;
    const label = SECTION_LABELS[step.id] || step.label;

    const btn = (
      <button
        type="button"
        onClick={() => handleSectionClick(step.id)}
        className={cn(
          opts.compact ? 'editor-nav-rail__section-icon-btn' : 'editor-nav-rail__section-btn',
          isActive && 'is-active',
        )}
        aria-current={isActive ? 'step' : undefined}
        aria-label={label}
      >
        {!opts.compact && (
          <span
            className={cn(
              'editor-nav-rail__status-dot',
              isCompleted && 'is-complete',
              !isCompleted && score > 0 && score < 100 && 'is-warning',
            )}
            aria-hidden
          />
        )}
        <Icon
          className={cn('shrink-0', opts.compact ? 'w-4 h-4' : 'w-3.5 h-3.5 opacity-80')}
          aria-hidden
        />
        {!opts.compact && <span className="truncate flex-1">{label}</span>}
        {opts.compact && isCompleted && (
          <span className="editor-nav-rail__icon-complete" aria-hidden />
        )}
      </button>
    );

    if (opts.compact) {
      return (
        <Tooltip key={step.id}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <aside
      className={cn(
        'editor-nav-rail editor-nav-rail--sections-only',
        !expanded && 'editor-nav-rail--icon-only',
      )}
      aria-label="Resume sections"
    >
      <TooltipProvider delayDuration={300}>
        <div className="editor-nav-rail__sections-block">
          <button
            type="button"
            className="editor-nav-rail__expand-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse section list' : 'Expand section list'}
          >
            {expanded ? (
              <PanelLeftClose className="w-4 h-4 opacity-80" aria-hidden />
            ) : (
              <PanelLeftOpen className="w-4 h-4 opacity-80" aria-hidden />
            )}
          </button>

          {expanded ? (
            <div className="editor-nav-rail__sections" role="list">
              {steps.map((step, idx) => {
                if (step.id === 'more') return null;
                const isLastCore = idx === lastCoreIndex;
                const hasExtras = steps.some((s, i) => i > lastCoreIndex && s.id !== 'more');
                return (
                  <div key={step.id} role="listitem">
                    {renderSectionButton(step, { compact: false })}
                    {isLastCore && hasExtras && (
                      <div className="my-1.5 mx-0.5 h-px bg-white/10" role="separator" />
                    )}
                  </div>
                );
              })}
              {hasMoreStep && (
                <button
                  type="button"
                  onClick={() => handleSectionClick('more')}
                  className={cn(
                    'editor-nav-rail__section-btn',
                    activeSection === 'more' && 'is-active',
                  )}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
                  <span>More</span>
                </button>
              )}
            </div>
          ) : (
            <nav className="editor-nav-rail__sections-icons" aria-label="Resume sections">
              {sectionSteps.map((step) => renderSectionButton(step, { compact: true }))}
              {hasMoreStep && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSectionClick('more')}
                      className={cn(
                        'editor-nav-rail__section-icon-btn',
                        activeSection === 'more' && 'is-active',
                      )}
                      aria-label="More sections"
                    >
                      <Plus className="w-4 h-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    More sections
                  </TooltipContent>
                </Tooltip>
              )}
            </nav>
          )}
        </div>
      </TooltipProvider>
    </aside>
  );
});
