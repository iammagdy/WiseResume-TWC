import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface AIContextualNudgeProps {
  show: boolean;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  compact?: boolean;
}

export function AIContextualNudge({
  show,
  message,
  actionLabel,
  onAction,
  onDismiss,
  compact = false,
}: AIContextualNudgeProps) {
  const handleAction = () => {
    haptics.medium();
    onAction();
  };

  const handleDismiss = () => {
    haptics.light();
    onDismiss();
  };

  if (!show) return null;

  if (compact) {
    return (
      <div className="mt-2 animate-in fade-in-0 slide-in-from-left-2 duration-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
          <Sparkles className="w-3 h-3 text-primary shrink-0" />
          <span className="text-xs text-foreground">{message}</span>
          <Button
            size="sm"
            onClick={handleAction}
            className="h-5 px-2 text-[10px] rounded-full active:scale-95"
          >
            {actionLabel}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-in fade-in-0 slide-in-from-left-2 duration-200">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-sm text-foreground">{message}</span>
        <Button
          size="sm"
          onClick={handleAction}
          className="h-6 px-3 text-xs rounded-full active:scale-95"
        >
          {actionLabel}
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
