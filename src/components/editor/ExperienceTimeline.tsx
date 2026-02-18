import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X, Sparkles, Wand2 } from 'lucide-react';
import { Experience } from '@/types/resume';
import { parseResumeDate, getMonthsDifference, formatDuration, detectGaps, getTotalGapMonths, ParsedDate, GapInfo } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExperienceTimelineProps {
  experiences: Experience[];
  onDismiss?: () => void;
  onExplainGap?: (gap: GapInfo) => void;
  onFillGap?: (gap: GapInfo) => void;
}

interface TimelineSegment {
  id: string;
  type: 'job' | 'gap';
  start: ParsedDate;
  end: ParsedDate;
  width: number; // percentage
  label?: string;
  company?: string;
}

export function ExperienceTimeline({ experiences, onDismiss, onExplainGap, onFillGap }: ExperienceTimelineProps) {
  const isMobile = useIsMobile();

  const { segments, gaps, timelineStart, timelineEnd } = useMemo(() => {
    // Parse all experiences with valid dates
    const parsed = experiences
      .map((exp) => ({
        id: exp.id,
        company: exp.company,
        start: parseResumeDate(exp.startDate),
        end: exp.current ? parseResumeDate('Present') : parseResumeDate(exp.endDate),
      }))
      .filter((p): p is { id: string; company: string; start: ParsedDate; end: ParsedDate } => 
        p.start !== null && p.end !== null
      )
      .sort((a, b) => {
        // Sort by start date ascending
        if (a.start.year !== b.start.year) return a.start.year - b.start.year;
        return a.start.month - b.start.month;
      });

    if (parsed.length === 0) {
      return { segments: [], gaps: [], timelineStart: null, timelineEnd: null };
    }

    // Find timeline bounds
    const timelineStart = parsed[0].start;
    const timelineEnd = parsed[parsed.length - 1].end;
    const totalMonths = getMonthsDifference(timelineStart, timelineEnd);

    if (totalMonths <= 0) {
      return { segments: [], gaps: [], timelineStart: null, timelineEnd: null };
    }

    // Build segments
    const segments: TimelineSegment[] = [];
    
    for (let i = 0; i < parsed.length; i++) {
      const job = parsed[i];
      
      // Add gap segment if there's space before this job
      if (i > 0) {
        const prevJob = parsed[i - 1];
        const gapMonths = getMonthsDifference(prevJob.end, job.start);
        if (gapMonths >= 1) {
          segments.push({
            id: `gap-${i}`,
            type: 'gap',
            start: prevJob.end,
            end: job.start,
            width: (gapMonths / totalMonths) * 100,
          });
        }
      }
      
      // Add job segment
      const jobMonths = getMonthsDifference(job.start, job.end);
      segments.push({
        id: job.id,
        type: 'job',
        start: job.start,
        end: job.end,
        width: Math.max((jobMonths / totalMonths) * 100, 5), // Min 5% width for visibility
        label: `${job.start.year}${job.end.year !== job.start.year ? `-${job.end.year}` : ''}`,
        company: job.company,
      });
    }

    // Detect gaps
    const gaps = detectGaps(experiences);

    return { segments, gaps, timelineStart, timelineEnd };
  }, [experiences]);

  // Don't render if no valid data
  if (segments.length === 0 || !timelineStart || !timelineEnd) {
    return null;
  }

  const totalGapMonths = getTotalGapMonths(gaps);
  const hasGaps = gaps.length > 0;

  const makeGapInfo = (segment: TimelineSegment): GapInfo => ({
    startDate: segment.start,
    endDate: segment.end,
    months: getMonthsDifference(segment.start, segment.end),
  });

  const handleExplainGap = (segment: TimelineSegment) => {
    if (!onExplainGap) return;
    onExplainGap(makeGapInfo(segment));
  };

  const handleFillGap = (segment: TimelineSegment) => {
    if (!onFillGap) return;
    onFillGap(makeGapInfo(segment));
  };

  const handleExplainLongest = () => {
    if (!onExplainGap || gaps.length === 0) return;
    onExplainGap(gaps.reduce((max, g) => g.months > max.months ? g : max, gaps[0]));
  };

  const handleFillLongest = () => {
    if (!onFillGap || gaps.length === 0) return;
    onFillGap(gaps.reduce((max, g) => g.months > max.months ? g : max, gaps[0]));
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      {/* Timeline Bar - Desktop horizontal / Mobile vertical cards */}
      {isMobile ? (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            <span>{timelineStart.year}</span>
            <span>{timelineEnd.isPresent ? 'Present' : timelineEnd.year}</span>
          </div>
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className={
                segment.type === 'job'
                  ? 'rounded-xl p-3 border-l-4 border-l-primary bg-primary/5 border border-border/50'
                  : 'rounded-lg p-2.5 border-l-4 border-l-destructive/50 bg-destructive/5 border border-destructive/20'
              }
            >
              {segment.type === 'job' ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{segment.company}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{segment.label}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive/70 shrink-0" />
                    <span className="text-xs font-medium text-destructive/90">Employment gap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onExplainGap && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExplainGap(segment)}
                        className="h-8 text-xs gap-1.5 border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 active:scale-95"
                      >
                        <Sparkles className="w-3 h-3" />
                        Explain
                      </Button>
                    )}
                    {onFillGap && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFillGap(segment)}
                        className="h-8 text-xs gap-1.5 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
                      >
                        <Wand2 className="w-3 h-3" />
                        Fill Gap
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="flex h-8 rounded-lg overflow-hidden bg-muted/50">
            {segments.map((segment, index) => (
              <motion.div
                key={segment.id}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                style={{ width: `${segment.width}%` }}
                className={`relative flex items-center justify-center text-xs font-medium origin-left ${
                  segment.type === 'job'
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-destructive/20 border-2 border-dashed border-destructive/40'
                }`}
                title={segment.type === 'job' ? segment.company : 'Employment gap'}
              >
                {segment.type === 'job' && segment.width > 15 && (
                  <span className="truncate px-1">{segment.label}</span>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>{timelineStart.year}</span>
            <span>{timelineEnd.isPresent ? 'Present' : timelineEnd.year}</span>
          </div>
        </div>
      )}

      {/* Gap Alert */}
      {hasGaps && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 rounded-lg bg-warning/10 border border-warning/20"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <span className="text-warning-foreground">
                {gaps.length} gap{gaps.length > 1 ? 's' : ''} detected: {formatDuration(totalGapMonths)} between jobs
              </span>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          
          {/* Explain with AI button */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {onExplainGap && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExplainLongest}
                className="gap-2 flex-1 sm:flex-none border-warning/30 text-warning-foreground hover:bg-warning/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Explain with AI
              </Button>
            )}
            {onFillGap && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillLongest}
                className="gap-2 flex-1 sm:flex-none border-primary/30 text-primary hover:bg-primary/10"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Fill Gap
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
