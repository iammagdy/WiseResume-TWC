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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm max-h-[calc(100dvh-6rem)] overflow-y-auto bg-card rounded-2xl border border-border shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

        <div className="p-6 pt-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display font-bold text-xl mb-2">
              Meet Your AI Assistant
            </h2>
            <p className="text-sm text-muted-foreground">
              Supercharge your resume with smart AI features
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Tailor for any job</p>
                <p className="text-xs text-muted-foreground">Optimize your resume for specific roles</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">Score your match</p>
                <p className="text-xs text-muted-foreground">See how well you fit the job</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Improve sections</p>
                <p className="text-xs text-muted-foreground">Enhance each part with AI suggestions</p>
              </div>
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-center text-muted-foreground mb-4">
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
