import { ArrowLeft, Target, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';

interface TailorPageHeaderProps {
  onBack: () => void;
  copyAction?: {
    copied: boolean;
    onCopy: () => void;
  };
  className?: string;
}

export function TailorPageHeader({ onBack, copyAction, className }: TailorPageHeaderProps) {
  return (
    <header className={cn('tailor-workspace__hero shrink-0 sticky top-0 z-50', className)}>
      <div className="tailor-workspace__hero-glow" aria-hidden />
      <div className="relative px-4 sm:px-6 pt-3 pb-4">
        <Breadcrumb items={['Home', 'AI Resume Tailor']} links={['/dashboard']} className="mb-3" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0 min-h-[44px] min-w-[44px] rounded-xl border border-border/60 bg-background/80"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25 shrink-0">
                  <Wand2 className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight leading-tight">
                    Resume Tailor
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <AICostBadge operation="tailor" />
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">
                      <Target className="w-3 h-3 text-primary" aria-hidden />
                      Job-matched rewrite
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                Align your resume to a specific role — keywords, bullets, and summary optimized in one pass.
              </p>
            </div>
          </div>
          {copyAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={copyAction.onCopy}
              className="shrink-0 self-start rounded-xl border-border/80"
            >
              {copyAction.copied ? 'Copied' : 'Copy output'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
