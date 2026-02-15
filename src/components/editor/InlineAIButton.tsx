import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Wand2, Target, Minimize2, BarChart3, BookOpen, CheckCircle, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

interface InlineAIButtonProps {
  section: SectionType;
  onAction: (actionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isAuthenticated?: boolean;
  onLockedClick?: () => void;
}

export function InlineAIButton({
  section,
  onAction,
  isLoading = false,
  disabled = false,
  isAuthenticated = true,
  onLockedClick,
}: InlineAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const actions = sectionActions[section];

  // Stop pulse after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Desktop: close on click outside
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  const handleAction = (actionId: string) => {
    haptics.light();
    setIsOpen(false);
    onAction(actionId);
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      haptics.light();
      onLockedClick?.();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className={`min-h-[44px] px-2.5 gap-1.5 transition-all ${
          isAuthenticated
            ? 'text-primary hover:bg-primary/10 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.5)] hover:scale-105'
            : 'text-muted-foreground opacity-60 hover:opacity-80'
        }`}
        disabled={disabled || isLoading}
        onClick={handleButtonClick}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isAuthenticated ? (
          <Sparkles className={`w-3.5 h-3.5 ${showPulse ? 'animate-pulse' : ''}`} />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">AI Assist</span>
      </Button>

      {/* Desktop dropdown */}
      {isOpen && isAuthenticated && !isMobile && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl bg-popover border border-border p-1 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.12)] animate-in fade-in-0 zoom-in-95 duration-150">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 min-h-[44px] text-sm text-popover-foreground outline-none cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
          <div className="-mx-1 my-1 h-px bg-muted" />
          <AIProviderFooter />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && (
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
      )}
    </div>
  );
}