import { useState, useEffect, memo } from 'react';
import { Loader2, Sparkles, Wand2, Target, Minimize2, BarChart3, BookOpen, CheckCircle, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { haptics } from '@/lib/haptics';
import { AIProviderFooter } from '@/components/editor/ai/AIProviderBadge';

export type SectionType = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'certifications' | 'languages';

interface AIActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

const sectionActions: Record<SectionType, AIActionConfig[]> = {
  summary: [
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" />, description: 'Create a professional summary from scratch' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Enhance clarity and impact' },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 className="w-4 h-4" />, description: 'Condense without losing key points' },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" />, description: 'Align keywords with job requirements' },
  ],
  experience: [
    { id: 'improve', label: 'Improve Bullets', icon: <Wand2 className="w-4 h-4" />, description: 'Rewrite with stronger action verbs' },
    { id: 'add_metrics', label: 'Add Metrics', icon: <BarChart3 className="w-4 h-4" />, description: 'Quantify achievements with numbers' },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" />, description: 'Align keywords with job requirements' },
  ],
  skills: [
    { id: 'generate', label: 'Suggest Skills', icon: <Plus className="w-4 h-4" />, description: 'Recommend relevant skills for your role' },
    { id: 'improve', label: 'Improve & Reorder', icon: <Layers className="w-4 h-4" />, description: 'Prioritize and organize skills' },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" />, description: 'Match skills to job descriptions' },
  ],
  education: [
    { id: 'generate', label: 'Suggest Coursework', icon: <BookOpen className="w-4 h-4" />, description: 'Add relevant courses and highlights' },
    { id: 'improve', label: 'Improve', icon: <Wand2 className="w-4 h-4" />, description: 'Enhance education descriptions' },
  ],
  contact: [
    { id: 'improve', label: 'Format & Validate', icon: <CheckCircle className="w-4 h-4" />, description: 'Check formatting and consistency' },
    { id: 'generate', label: 'Suggest Links', icon: <Wand2 className="w-4 h-4" />, description: 'Recommend portfolio and profile links' },
  ],
  awards: [
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" />, description: 'Draft award descriptions' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Enhance impact and clarity' },
  ],
  projects: [
    { id: 'generate', label: 'Generate Description', icon: <Wand2 className="w-4 h-4" />, description: 'Create compelling project summaries' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Strengthen technical descriptions' },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 className="w-4 h-4" />, description: 'Condense without losing key points' },
    { id: 'suggest_technologies', label: 'Suggest Technologies', icon: <Plus className="w-4 h-4" />, description: 'Recommend relevant tech stack' },
  ],
  publications: [
    { id: 'generate', label: 'Generate Abstract', icon: <Wand2 className="w-4 h-4" />, description: 'Draft publication abstracts' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Refine academic writing' },
  ],
  volunteering: [
    { id: 'generate', label: 'Generate Description', icon: <Wand2 className="w-4 h-4" />, description: 'Describe volunteer contributions' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Highlight community impact' },
  ],
  certifications: [
    { id: 'generate', label: 'Suggest Certifications', icon: <Wand2 className="w-4 h-4" />, description: 'Recommend relevant certifications' },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Enhance certification details' },
  ],
  languages: [
    { id: 'generate', label: 'Suggest Languages', icon: <Wand2 className="w-4 h-4" />, description: 'Recommend languages to add' },
  ],
};

// Field-specific action sets for the Projects section, selected via fieldContext prop.
const projectsDescActions: AIActionConfig[] = [
  { id: 'generate', label: 'Generate Description', icon: <Wand2 className="w-4 h-4" />, description: 'Create a compelling project description' },
  { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Strengthen the technical narrative' },
  { id: 'shorten', label: 'Shorten', icon: <Minimize2 className="w-4 h-4" />, description: 'Condense without losing key points' },
];

const projectsTechActions: AIActionConfig[] = [
  { id: 'suggest_technologies', label: 'Suggest Technologies', icon: <Plus className="w-4 h-4" />, description: 'Recommend relevant tech stack' },
];

interface InlineAIButtonProps {
  section: SectionType;
  onAction: (actionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isAuthenticated?: boolean;
  onLockedClick?: () => void;
  hasContent?: boolean;
  fieldContext?: 'technologies' | 'description';
}

const experienceEmptyActions: AIActionConfig[] = [
  { id: 'generate', label: 'Generate Description', icon: <Wand2 className="w-4 h-4" />, description: 'Create a detailed description based on your role, company, and account' },
];

const sectionButtonLabels: Record<SectionType, string> = {
  summary: 'Improve Summary',
  experience: 'Improve Bullets',
  skills: 'Suggest Skills',
  education: 'Improve Education',
  contact: 'Format & Check',
  awards: 'Improve Awards',
  projects: 'AI Assist',
  publications: 'Improve Publications',
  volunteering: 'Improve Volunteering',
  certifications: 'Suggest Certifications',
  languages: 'Suggest Languages',
};

export const InlineAIButton = memo(function InlineAIButton({
  section,
  onAction,
  isLoading = false,
  disabled = false,
  isAuthenticated = true,
  onLockedClick,
  hasContent = true,
  fieldContext,
}: InlineAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const isMobile = useIsMobile();

  let actions: AIActionConfig[];
  if (section === 'experience' && !hasContent) {
    actions = experienceEmptyActions;
  } else if (section === 'projects' && fieldContext === 'technologies') {
    actions = projectsTechActions;
  } else if (section === 'projects' && fieldContext === 'description') {
    actions = projectsDescActions;
  } else {
    actions = sectionActions[section];
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = (actionId: string) => {
    haptics.light();
    setIsOpen(false);
    onAction(actionId);
  };

  const sharedButtonClass = `min-h-[44px] px-2.5 gap-1.5 transition-all ${
    isAuthenticated
      ? 'text-primary hover:bg-primary/10 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.5)] hover:scale-105'
      : 'text-muted-foreground opacity-60 hover:opacity-80'
  }`;

  const buttonInner = (
    <>
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className={`w-3.5 h-3.5 ${showPulse && isAuthenticated ? 'animate-pulse' : ''}`} />
      )}
      <span className="text-xs font-medium hidden sm:inline">{sectionButtonLabels[section] ?? 'AI Assist'}</span>
    </>
  );

  const menuItems = (
    <>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 min-h-[44px] text-sm text-popover-foreground outline-none cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
          role="menuitem"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
      <div className="-mx-1 my-1 h-px bg-muted" />
      <AIProviderFooter />
    </>
  );

  // ── Desktop ───────────────────────────────────────────────────────────────
  // Use a Radix Popover so the menu renders via a Portal and is never clipped
  // by the SectionCard's overflow-hidden container — even when collapsed.
  if (!isMobile) {
    if (!isAuthenticated) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className={sharedButtonClass}
          disabled={disabled || isLoading}
          onClick={() => { haptics.light(); onLockedClick?.(); }}
          aria-haspopup="true"
        >
          {buttonInner}
        </Button>
      );
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={sharedButtonClass}
            disabled={disabled || isLoading}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            {buttonInner}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={4}
          className="w-auto min-w-[160px] p-1 rounded-xl"
          role="menu"
        >
          {menuItems}
        </PopoverContent>
      </Popover>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  // Bottom Sheet; no absolute positioning needed.
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={sharedButtonClass}
        disabled={disabled || isLoading}
        onClick={() => {
          haptics.light();
          if (!isAuthenticated) { onLockedClick?.(); return; }
          setIsOpen(true);
        }}
        aria-haspopup="true"
      >
        {buttonInner}
      </Button>

      <Sheet open={isOpen && isAuthenticated} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Assist
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1 py-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 min-h-[64px] text-left transition-colors hover:bg-accent active:bg-accent/80 touch-manipulation"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <AIProviderFooter />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
