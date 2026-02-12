import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface AIContextualNudgeProps {
  show: boolean;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

export function AIContextualNudge({
  show,
  message,
  actionLabel,
  onAction,
  onDismiss,
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

  return (
        <div className="mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{message}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleAction}
                    className="px-3 text-xs"
                  >
                    {actionLabel}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDismiss}
                    className="px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
  );
}
