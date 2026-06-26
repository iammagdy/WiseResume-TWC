import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Briefcase, X, Sparkles, Wand2 } from 'lucide-react';
import { Experience } from '@/types/resume';
import {
  parseResumeDate,
  getMonthsDifference,
  formatDuration,
  detectGaps,
  findGapBetweenJobs,
  getTotalGapMonths,
  ParsedDate,
  GapInfo,
} from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExperienceTimelineProps {
  experiences: Experience[];
  onDismiss?: () => void;
  onExplainGap?: (gap: GapInfo) => void;
  /** Opens assistant for every Gap Finder gap (not only the longest). */
  onExplainAllGaps?: (gaps: GapInfo[]) => void;
  onFillGap?: (gap: GapInfo) => void;
}

interface TimelineSegment {
  id: string;
  type: 'job' | 'gap';
  start: ParsedDate;
  end: ParsedDate;
  width: number;
  label?: string;
  company?: string;
  /** Months from Gap Finder (`detectGaps`) — only on gap segments */
  gapMonths?: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatParsedDateLabel(date: ParsedDate): string {
  if (date.isPresent) return 'Present';
  if (date.yearOnly) return String(date.year);
  return `${MONTH_LABELS[date.month]} ${date.year}`;
}

function formatSegmentRange(start: ParsedDate, end: ParsedDate): string {
  return `${formatParsedDateLabel(start)} – ${formatParsedDateLabel(end)}`;
}

function segmentTooltip(segment: TimelineSegment): string {
  if (segment.type === 'job') {
    const range = formatSegmentRange(segment.start, segment.end);
    return segment.company ? `${segment.company} (${range})` : range;
  }
  const months = segment.gapMonths ?? getMonthsDifference(segment.start, segment.end);
  return `Gap Finder · ${formatDuration(months)} · ${formatSegmentRange(segment.start, segment.end)}`;
}

export const ExperienceTimeline = memo(function ExperienceTimeline({
  experiences,
  onDismiss,
  onExplainGap,
  onExplainAllGaps,
  onFillGap,
}: ExperienceTimelineProps) {
  const isMobile = useIsMobile();

  const { segments, gaps, timelineStart, timelineEnd } = useMemo(() => {
    const parsed = experiences
      .map((exp) => ({
        id: exp.id,
        company: exp.company,
        start: parseResumeDate(exp.startDate),
        end: exp.current ? parseResumeDate('Present') : parseResumeDate(exp.endDate),
      }))
      .filter(
        (p): p is { id: string; company: string; start: ParsedDate; end: ParsedDate } =>
          p.start !== null && p.end !== null,
      )
      .sort((a, b) => {
        if (a.start.year !== b.start.year) return a.start.year - b.start.year;
        return a.start.month - b.start.month;
      });

    if (parsed.length === 0) {
      return { segments: [], gaps: [], timelineStart: null, timelineEnd: null };
    }

    const timelineStart = parsed[0].start;
    const timelineEnd = parsed[parsed.length - 1].end;
    const totalMonths = getMonthsDifference(timelineStart, timelineEnd);

    if (totalMonths <= 0) {
      return { segments: [], gaps: [], timelineStart: null, timelineEnd: null };
    }

    // Single source of truth for gap count + timeline stripes (Gap Finder)
    const gaps = detectGaps(experiences);
    const segments: TimelineSegment[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const job = parsed[i];

      if (i > 0) {
        const prevJob = parsed[i - 1];
        const gap = findGapBetweenJobs(gaps, prevJob.end, job.start);
        if (gap) {
          segments.push({
            id: `gap-${i}-${gap.startDate.year}-${gap.startDate.month}`,
            type: 'gap',
            start: gap.startDate,
            end: gap.endDate,
            width: Math.max((gap.months / totalMonths) * 100, 4),
            gapMonths: gap.months,
          });
        }
      }

      const jobMonths = getMonthsDifference(job.start, job.end);
      segments.push({
        id: job.id,
        type: 'job',
        start: job.start,
        end: job.end,
        width: Math.max((jobMonths / totalMonths) * 100, 6),
        label: `${job.start.year}${job.end.year !== job.start.year ? `–${job.end.year}` : ''}`,
        company: job.company,
      });
    }

    return { segments, gaps, timelineStart, timelineEnd };
  }, [experiences]);

  if (segments.length === 0 || !timelineStart || !timelineEnd) {
    return null;
  }

  const totalGapMonths = getTotalGapMonths(gaps);
  const hasGaps = gaps.length > 0;
  const timelineEndLabel = timelineEnd.isPresent ? 'Present' : String(timelineEnd.year);

  const makeGapInfo = (segment: TimelineSegment): GapInfo => ({
    startDate: segment.start,
    endDate: segment.end,
    months: segment.gapMonths ?? getMonthsDifference(segment.start, segment.end),
  });

  const handleExplainGap = (segment: TimelineSegment) => {
    if (!onExplainGap) return;
    onExplainGap(makeGapInfo(segment));
  };

  const handleFillGap = (segment: TimelineSegment) => {
    if (!onFillGap) return;
    onFillGap(makeGapInfo(segment));
  };

  const handleExplainAll = () => {
    if (gaps.length === 0) return;
    if (onExplainAllGaps) {
      onExplainAllGaps(gaps);
      return;
    }
    if (onExplainGap) onExplainGap(gaps[0]);
  };

  const handleFillLongest = () => {
    if (!onFillGap || gaps.length === 0) return;
    onFillGap(gaps.reduce((max, g) => (g.months > max.months ? g : max), gaps[0]));
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm bg-primary shrink-0" aria-hidden />
        Employment
      </span>
      {hasGaps && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm shrink-0 border border-dashed border-warning/60 bg-warning/25"
            aria-hidden
          />
          Employment gap ({gaps.length})
        </span>
      )}
    </div>
  );

  const timelineHeader = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">
          {hasGaps ? 'Gap Finder' : 'Career timeline'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          {hasGaps
            ? `Striped sections on the bar are the same ${gaps.length} gap${gaps.length > 1 ? 's' : ''} listed below.`
            : 'Your roles in chronological order.'}
        </p>
      </div>
      {hasGaps && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Hide Gap Finder"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );

  const gapActions = hasGaps && (onExplainGap || onExplainAllGaps || onFillGap) && (
    <div className="flex gap-2 flex-wrap">
      {(onExplainGap || onExplainAllGaps) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExplainAll}
          className="gap-2 flex-1 sm:flex-none h-9 border-warning/50 bg-warning/15 text-warning hover:bg-warning/25 hover:text-warning active:scale-95"
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
          className="gap-2 flex-1 sm:flex-none h-9 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Fill gap
        </Button>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden shadow-soft-sm"
    >
      {/* Header + legend */}
      <div className={`px-3 pt-3 pb-2 space-y-2 ${hasGaps ? 'bg-muted/20' : ''}`}>
        {timelineHeader}
        {legend}
      </div>

      {/* Timeline visualization */}
      <div className="px-3 pb-3">
        {isMobile ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground px-0.5">
              <span>{timelineStart.year}</span>
              <span>{timelineEndLabel}</span>
            </div>
            {segments.map((segment, index) => (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className={
                  segment.type === 'job'
                    ? 'rounded-xl p-3 bg-primary/5 border border-primary/30'
                    : 'rounded-xl p-3 bg-warning/10 border border-warning/30'
                }
              >
                {segment.type === 'job' ? (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" aria-hidden />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {segment.company || 'Role'}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatSegmentRange(segment.start, segment.end)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-foreground">Employment gap</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDuration(segment.gapMonths ?? getMonthsDifference(segment.start, segment.end))} ·{' '}
                          {formatSegmentRange(segment.start, segment.end)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onExplainGap && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExplainGap(segment)}
                          className="h-8 text-xs gap-1.5 border-warning/50 bg-warning/15 text-warning hover:bg-warning/25"
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
                          className="h-8 text-xs gap-1.5 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Wand2 className="w-3 h-3" />
                          Fill
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            className="space-y-1.5"
            role="img"
            aria-label={`Career timeline from ${timelineStart.year} to ${timelineEndLabel}${
              hasGaps ? `, ${gaps.length} employment gap${gaps.length > 1 ? 's' : ''}` : ''
            }`}
          >
            <div className="flex h-10 rounded-lg overflow-hidden border border-border bg-muted/50">
              {segments.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.06, duration: 0.25 }}
                  style={{ width: `${segment.width}%` }}
                  title={segmentTooltip(segment)}
                  className={`relative flex items-center justify-center min-w-0 origin-left transition-opacity hover:opacity-90 ${
                    segment.type === 'job'
                      ? 'bg-primary text-primary-foreground border-r border-primary-foreground/10 last:border-r-0'
                      : 'bg-warning/25 border-x border-dashed border-warning/50 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,hsl(var(--warning)/0.12)_3px,hsl(var(--warning)/0.12)_6px)]'
                  }`}
                >
                  {segment.type === 'job' && segment.width >= 14 && (
                    <span className="truncate px-1.5 text-[10px] font-medium drop-shadow-sm">
                      {segment.company || segment.label}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground px-0.5">
              <span>{timelineStart.year}</span>
              <span>{timelineEndLabel}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Gap summary — visually connected to the bar above */}
      {hasGaps && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-warning/25 bg-warning/5 px-3 py-3 space-y-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                Gap Finder: {gaps.length} employment gap{gaps.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total {formatDuration(totalGapMonths)} between roles — matches the striped sections above.
              </p>
            </div>
          </div>
          {gapActions}
        </motion.div>
      )}
    </motion.div>
  );
});
