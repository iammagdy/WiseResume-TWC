import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobMatchResult } from '@/lib/jobMatchScorer';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Scissors, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  score: JobMatchResult | null;
  jobTitle?: string;
}

export function JobMatchScore({ score, jobTitle }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const navigate = useNavigate();

  if (!score) return null;

  const colorClass = score.overall >= 70
    ? 'text-green-500 border-green-500/30'
    : score.overall >= 40
      ? 'text-yellow-500 border-yellow-500/30'
      : 'text-destructive border-destructive/30';

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); haptics.selection(); setShowDetail(true); }}
        className={cn(
          'w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 active:scale-95 transition-transform',
          colorClass
        )}
        aria-label={`${score.overall}% match`}
      >
        {score.overall}
      </button>

      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="bottom" className="h-[70dvh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Keyword Match: {score.overall}%</SheetTitle>
            {jobTitle && <p className="text-sm text-muted-foreground">{jobTitle}</p>}
          </SheetHeader>

          <div className="space-y-4 mt-4 overflow-y-auto">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>This score is based on keyword overlap between your resume and the job description. It's a quick heuristic, not a deep AI analysis.</span>
            </div>
            {/* Score bars */}
            <div className="space-y-3">
              <ScoreBar label="Skills Match" value={score.skillMatch} />
              <ScoreBar label="Experience Match" value={score.experienceMatch} />
            </div>

            {/* Keywords found */}
            {score.keywords.found.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-primary">✓ Matching Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {score.keywords.found.map((k, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {score.keywords.missing.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-destructive">✗ Missing Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {score.keywords.missing.map((k, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] text-destructive">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tailor button */}
            <Button
              onClick={() => { haptics.medium(); navigate('/editor'); setShowDetail(false); }}
              className="w-full min-h-[48px] active:scale-95"
            >
              <Scissors className="w-4 h-4 mr-2" /> Tailor Resume for This Job
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const barColor = value >= 70 ? 'bg-primary' : value >= 40 ? 'bg-accent' : 'bg-destructive';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
