import { Loader2, Sparkles, Wand2, Target, Minimize2, BarChart3, BookOpen, CheckCircle, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptics } from '@/lib/haptics';

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
  const actions = sectionActions[section];

  const handleAction = (actionId: string) => {
    haptics.light();
    onAction(actionId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 gap-1.5 text-primary hover:bg-primary/10 transition-colors"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span className="text-xs font-medium">AI</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={() => handleAction(action.id)}
            className="gap-2 cursor-pointer"
          >
            {action.icon}
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
