import { memo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getScoreLabel, getScoreColorClass } from '@/components/dashboard/ATSScoreBreakdown';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

interface EditorResumeStrengthBarProps {
  overallScore: number;
  localHealthScore?: ResumeHealthScore | null;
  className?: string;
}

const SECTION_ROWS: Array<{ key: keyof ResumeHealthScore['categories']; label: string }> = [
  { key: 'contactCompleteness', label: 'Contact Info' },
  { key: 'contentQuality',      label: 'Content Quality' },
  { key: 'keywordOptimization', label: 'Keywords' },
  { key: 'sectionStructure',    label: 'Structure' },
  { key: 'lengthDensity',       label: 'Length & Density' },
];

function SectionIcon({ score }: { score: number }) {
  if (score >= 90) return <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />;
  if (score >= 50) return <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
}

function SectionBar({ score }: { score: number }) {
  const bg = score >= 90 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', bg)} style={{ width: `${score}%` }} />
    </div>
  );
}

export const EditorResumeStrengthBar = memo(function EditorResumeStrengthBar({
  overallScore,
  localHealthScore,
  className,
}: EditorResumeStrengthBarProps) {
  const score = Math.min(100, Math.max(0, overallScore));
  const hasBreakdown = !!localHealthScore;

  const bar = (
    <div
      className={cn('editor-preview-strength', hasBreakdown && 'cursor-pointer', className)}
      role="group"
      aria-label={`Resume strength ${score} percent`}
    >
      <div className="editor-preview-strength__row">
        <span className="editor-preview-strength__label">Resume strength</span>
        <span className="flex items-center gap-1">
          <span className="editor-preview-strength__value tabular-nums">{score}%</span>
          {hasBreakdown && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        </span>
      </div>
      <div
        className="editor-preview-strength__track"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Resume strength"
      >
        <div className="editor-preview-strength__fill" style={{ width: `${score}%` }} />
      </div>
    </div>
  );

  if (!hasBreakdown) return bar;

  const label = getScoreLabel(score);
  const colorClass = getScoreColorClass(score);

  return (
    <Popover>
      <PopoverTrigger asChild>{bar}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top" align="start">
        {/* Overall score header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Score Breakdown</span>
          <span className={cn('text-xs font-bold tabular-nums', colorClass)}>{score}% — {label}</span>
        </div>

        {/* Section rows */}
        <div className="flex flex-col gap-1.5 mb-3">
          {SECTION_ROWS.map(({ key, label: rowLabel }) => {
            const val = Math.round(localHealthScore!.categories[key]);
            return (
              <div key={key} className="flex items-center gap-2">
                <SectionIcon score={val} />
                <span className="text-xs text-muted-foreground w-28 shrink-0">{rowLabel}</span>
                <SectionBar score={val} />
                <span className="text-xs tabular-nums text-foreground w-7 text-right">{val}%</span>
              </div>
            );
          })}
        </div>

        {/* Top insight hints */}
        {(localHealthScore!.topStrength || localHealthScore!.topImprovement) && (
          <div className="border-t border-border pt-2 flex flex-col gap-1">
            {localHealthScore!.topStrength && (
              <p className="text-[11px] text-success leading-snug">
                ✓ {localHealthScore!.topStrength}
              </p>
            )}
            {localHealthScore!.topImprovement && (
              <p className="text-[11px] text-warning leading-snug">
                ↑ {localHealthScore!.topImprovement}
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});
