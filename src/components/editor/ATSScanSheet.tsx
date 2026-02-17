import { memo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronRight } from 'lucide-react';
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
  onJumpToSection: (section: string) => void;
}

export const ATSScanSheet = memo(function ATSScanSheet({
  open,
  onOpenChange,
  summary,
  onJumpToSection,
}: ATSScanSheetProps) {
  if (!summary) return null;

  const scoreColor = summary.matchPercentage >= 70
    ? 'text-success'
    : summary.matchPercentage >= 40
      ? 'text-warning'
      : 'text-destructive';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            ATS Keyword Scan
            <AICostBadge operation="score" />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6 overflow-y-auto">
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
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 bg-muted/30 active:scale-[0.98] touch-manipulation min-h-[44px]"
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
      </SheetContent>
    </Sheet>
  );
});
