import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X, Sparkles } from 'lucide-react';
import { Experience } from '@/types/resume';
import { parseResumeDate, getMonthsDifference, formatDuration, detectGaps, getTotalGapMonths, ParsedDate, GapInfo } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

interface ExperienceTimelineProps {
  experiences: Experience[];
  onDismiss?: () => void;
  onExplainGap?: (gap: GapInfo) => void;
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

export function ExperienceTimeline({ experiences, onDismiss, onExplainGap }: ExperienceTimelineProps) {
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

  const handleExplainClick = () => {
    if (gaps.length > 0 && onExplainGap) {
      // Use the longest gap
      const longestGap = gaps.reduce((max, gap) => gap.months > max.months ? gap : max, gaps[0]);
      onExplainGap(longestGap);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      {/* Timeline Bar */}
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
        
        {/* Year markers */}
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>{timelineStart.year}</span>
          <span>{timelineEnd.isPresent ? 'Present' : timelineEnd.year}</span>
        </div>
      </div>

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
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          
          {/* Explain with AI button */}
          {onExplainGap && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExplainClick}
              className="mt-2 gap-2 w-full sm:w-auto border-warning/30 text-warning-foreground hover:bg-warning/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explain with AI
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
