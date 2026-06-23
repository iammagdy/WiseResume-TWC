import { useMemo } from 'react';
import { migrateTemplateId } from '@/lib/templateMigration';
import {
  FileText,
  Sparkles,
  Target,
  Scissors,
  ChevronRight,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MiniTemplateThumbnail } from '@/components/dashboard/MiniTemplateThumbnail';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import type { DatabaseResume } from '@/hooks/useResumes';
import { dbToResumeData } from '@/hooks/useResumes';
import { calcOverallScore } from '@/lib/resumeCompletionRules';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import '@/components/shared/resume-picker-sheet.css';

export interface ResumePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  currentResumeId?: string | null;
  onSelect: (resume: DatabaseResume) => void;
  onViewAll?: () => void;
  onCreateNew?: () => void;
  title?: string;
  description?: string;
}

function resumeScore(resume: DatabaseResume): number {
  try {
    return calcOverallScore(dbToResumeData(resume));
  } catch {
    return 0;
  }
}

export function ResumePickerSheet({
  open,
  onOpenChange,
  resumes,
  currentResumeId,
  onSelect,
  onViewAll,
  onCreateNew,
  title = 'Choose a resume',
  description = 'AI tools run on the resume you select. Pick the version that matches this task.',
}: ResumePickerSheetProps) {
  const sorted = useMemo(() => {
    return [...resumes].sort((a, b) => {
      if (a.$id === currentResumeId) return -1;
      if (b.$id === currentResumeId) return 1;
      return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
    });
  }, [resumes, currentResumeId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'resume-picker-sheet flex flex-col gap-0 p-0 overflow-hidden border-t border-border/80 bg-background',
          'rounded-t-[1.75rem] max-h-[min(88dvh,720px)]',
          'sm:left-1/2 sm:right-auto sm:w-full sm:max-w-xl sm:-translate-x-1/2',
        )}
      >
        <div className="relative px-5 pt-2 pb-4 shrink-0 border-b border-border/60 overflow-hidden">
          <div className="resume-picker-sheet__hero-glow" aria-hidden />
          <div
            className="pointer-events-none absolute -top-8 right-4 h-32 w-32 rounded-full bg-primary/12 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start gap-3.5 pt-5">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
                Resume context
              </p>
              <h2 className="text-lg font-semibold text-foreground leading-tight mt-0.5">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">No resumes yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Create a resume on your dashboard, then come back to use AI Studio tools.
              </p>
              {onCreateNew && (
                <Button className="mt-5" onClick={() => { haptics.light(); onCreateNew(); }}>
                  Create resume
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2.5" role="listbox" aria-label="Your resumes">
              {sorted.map((resume) => {
                const isSelected = resume.$id === currentResumeId;
                const score = resumeScore(resume);
                const isTailored = !!resume.parent_resume_id;
                const targetLine = resume.target_job_title
                  ? resume.target_company
                    ? `${resume.target_job_title} · ${resume.target_company}`
                    : resume.target_job_title
                  : 'No target role set';
                const updatedLabel = safeFormatDistanceToNow(new Date(resume.$updatedAt), {
                  addSuffix: true,
                });

                return (
                  <li key={resume.$id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        haptics.medium();
                        onSelect(resume);
                      }}
                      className={cn('resume-picker-card touch-manipulation', isSelected && 'is-selected')}
                    >
                      <div className="resume-picker-card__thumb">
                        <MiniTemplateThumbnail
                          templateId={migrateTemplateId(resume.template || resume.template_id)}
                          className="w-full h-full"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{resume.title}</p>
                          {isTailored && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-[10px] font-semibold text-primary shrink-0">
                              <Scissors className="w-2.5 h-2.5" aria-hidden />
                              Tailored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                          <Target className="w-3 h-3 shrink-0 opacity-60" aria-hidden />
                          {targetLine}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">Updated {updatedLabel}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <ScoreRing score={score} size={36} strokeWidth={2.5} />
                        {isSelected ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                            <Check className="w-3 h-3" aria-hidden />
                            Active
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50" aria-hidden />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(onViewAll || onCreateNew) && sorted.length > 0 && (
          <div className="shrink-0 px-4 pb-6 pt-2 border-t border-border/60 bg-background/95 backdrop-blur-sm flex flex-col sm:flex-row gap-2">
            {onViewAll && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  haptics.light();
                  onViewAll();
                }}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden />
                View all resumes
              </Button>
            )}
            {onCreateNew && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  haptics.light();
                  onCreateNew();
                }}
              >
                New resume
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
