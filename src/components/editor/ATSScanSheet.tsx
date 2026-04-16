import { memo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronRight } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { cn } from '@/lib/utils';
import { SectionId } from '@/types/resume';
import haptics from '@/lib/haptics';
import { AICostBadge } from '@/components/ai/AICostBadge';

interface ScanSummary {
  matchPercentage: number;
  perSection: { section: SectionId; label: string; missing: number }[];
  totalKeywords: number;
  matchedKeywords: number;
}

interface ATSScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ScanSummary | null;
  isLoading?: boolean;
  onJumpToSection: (section: string) => void;
}

export const ATSScanSheet = memo(function ATSScanSheet({
  open,
  onOpenChange,
  summary,
  isLoading,
  onJumpToSection,
}: ATSScanSheetProps) {
  if (!summary && !isLoading) return null;

  const scoreColor = summary
    ? summary.matchPercentage >= 70
      ? 'text-success'
      : summary.matchPercentage >= 40
        ? 'text-warning'
        : 'text-destructive'
    : 'text-muted-foreground';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            ATS Keyword Scan
            <AICostBadge operation="score" />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-safe">
          {isLoading && !summary && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <MiniSpinner size={32} />
              <p className="text-sm text-muted-foreground">Scanning your resume...</p>
              <div className="w-full space-y-3 animate-pulse">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
              </div>
            </div>
          )}

          {summary && (
            <div className="space-y-5 pb-6">
              {/* Overall Match */}
              <div className="text-center space-y-2">
                <p className={cn('text-4xl font-bold', scoreColor)}>
                  {summary.matchPercentage}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.matchedKeywords} of {summary.totalKeywords} keywords matched
                </p>
                <Progress value={summary.matchPercentage} className="h-2" />
              </div>

              {/* Per-section breakdown */}
              {summary.perSection.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Missing Keywords by Section
                  </h3>
                  {summary.perSection.map(({ section, label, missing }) => (
                    <button
                      key={section}
                      onClick={() => {
                        haptics.light();
                        onJumpToSection(section);
                        onOpenChange(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 bg-muted active:scale-[0.98] touch-manipulation min-h-[44px]"
                    >
                      <span className="text-sm font-medium flex-1 text-left">{label}</span>
                      <Badge variant="glass" className="text-[10px]">
                        {missing} missing
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {summary.perSection.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-success font-medium">Great job! All key terms are covered.</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
