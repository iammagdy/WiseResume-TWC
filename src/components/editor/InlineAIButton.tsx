import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Wand2, Target, Minimize2, BarChart3, BookOpen, CheckCircle, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { AIProviderFooter } from '@/components/editor/ai/AIProviderBadge';

export type SectionType = 'contact' | 'summary' | 'experience' | 'education' | 'skills';

interface AIActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sectionActions: Record<SectionType, AIActionConfig[]> = {
  summary: [
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'improve', label: 'Improve', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'shorten', label: 'Shorten', icon: <Minimize2 className="w-4 h-4" /> },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" /> },
  ],
  experience: [
    { id: 'improve', label: 'Improve Bullets', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'add_metrics', label: 'Add Metrics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" /> },
  ],
  skills: [
    { id: 'generate', label: 'Suggest Skills', icon: <Plus className="w-4 h-4" /> },
    { id: 'improve', label: 'Improve & Reorder', icon: <Layers className="w-4 h-4" /> },
    { id: 'ats_optimize', label: 'ATS Optimize', icon: <Target className="w-4 h-4" /> },
  ],
  education: [
    { id: 'generate', label: 'Suggest Coursework', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'improve', label: 'Improve', icon: <Wand2 className="w-4 h-4" /> },
  ],
  contact: [
    { id: 'improve', label: 'Format & Validate', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'generate', label: 'Suggest Links', icon: <Wand2 className="w-4 h-4" /> },
  ],
};

interface InlineAIButtonProps {
  section: SectionType;
  onAction: (actionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function InlineAIButton({
  section,
  onAction,
  isLoading = false,
  disabled = false,
}: InlineAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = sectionActions[section];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (actionId: string) => {
    haptics.light();
    setIsOpen(false);
    onAction(actionId);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 gap-1.5 text-primary hover:bg-primary/10 transition-colors"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">AI</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl bg-popover border border-border p-1 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.12)] animate-in fade-in-0 zoom-in-95 duration-150">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground outline-none cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
          <div className="-mx-1 my-1 h-px bg-muted" />
          <AIProviderFooter />
        </div>
      )}
    </div>
  );
}
