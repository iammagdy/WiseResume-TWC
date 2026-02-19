import { Sparkles, Target, BarChart3, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface AIIntroTooltipProps {
  show: boolean;
  onDismiss: () => void;
}

export function AIIntroTooltip({ show, onDismiss }: AIIntroTooltipProps) {
  if (!show) return null;

  const handleDismiss = () => {
    haptics.success();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm max-h-[calc(100dvh-6rem)] overflow-y-auto bg-card rounded-2xl border border-border shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

        <div className="p-5 pt-6">
          {/* Header */}
          <div className="text-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display font-bold text-xl mb-1">
              Meet Your AI Assistant
            </h2>
            <p className="text-sm text-muted-foreground">
              Supercharge your resume with smart AI features
            </p>
          </div>

          {/* Features list - compact, no descriptions */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium">Tailor for any job</p>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-secondary" />
              </div>
              <p className="text-sm font-medium">Score your match</p>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium">Improve sections</p>
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-center text-muted-foreground mb-3">
            Look for the <span className="text-primary font-medium">✨ AI</span> buttons in each section!
          </p>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full h-12 font-semibold"
            onClick={handleDismiss}
          >
            Got It!
          </Button>
        </div>
      </div>
    </div>
  );
}
