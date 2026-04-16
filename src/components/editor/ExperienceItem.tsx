import { memo, useCallback, useMemo, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Building2, Briefcase, Calendar, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Experience } from '@/types/resume';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { formatDateRange, calculateDuration } from '@/lib/dateUtils';
import { NudgeState } from '@/hooks/useResumeNudges';
import { MonthYearPicker } from './MonthYearPicker';

interface ExperienceItemProps {
  exp: Experience;
  index: number;
  totalLength: number;
  isExpanded: boolean;
  isEnhancing: boolean;
  entryNudges: NudgeState[];
  onToggleExpand: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Experience>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAIAction: (actionId: string, id: string) => void;
  onDismissNudge: (trigger: string) => void;
}

export const ExperienceItem = memo(function ExperienceItem({
  exp,
  index,
  totalLength,
  isExpanded,
  isEnhancing,
  entryNudges,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAIAction,
  onDismissNudge,
}: ExperienceItemProps) {
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(exp.id);
  }, [exp.id, onToggleExpand]);

  const handlePositionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(exp.id, { position: e.target.value });
  }, [exp.id, onUpdate]);

  const handleCompanyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(exp.id, { company: e.target.value });
  }, [exp.id, onUpdate]);

  const handleAccountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(exp.id, { account: e.target.value });
  }, [exp.id, onUpdate]);

  const handleStartDateChange = useCallback((value: string) => {
    onUpdate(exp.id, { startDate: value });
  }, [exp.id, onUpdate]);

  const handleEndDateChange = useCallback((value: string) => {
    onUpdate(exp.id, { endDate: value });
  }, [exp.id, onUpdate]);

  const handleCurrentChange = useCallback((checked: boolean) => {
    onUpdate(exp.id, { current: checked });
  }, [exp.id, onUpdate]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(exp.id, { description: e.target.value });
  }, [exp.id, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(exp.id);
  }, [exp.id, onDelete]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveUp(index);
  }, [index, onMoveUp]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveDown(index);
  }, [index, onMoveDown]);

  const handleInlineAIAction = useCallback((actionId: string) => {
    onAIAction(actionId, exp.id);
  }, [exp.id, onAIAction]);

  const hasBracketPlaceholders = useMemo(() => {
    const BRACKET_RE = /\[[^\]]*?\]/;
    return BRACKET_RE.test(exp.description || '') ||
      (exp.achievements || []).some(a => BRACKET_RE.test(a));
  }, [exp.description, exp.achievements]);

  const [hasTouched, setHasTouched] = useState(false);
  const handleFieldBlur = useCallback(() => setHasTouched(true), []);

  const hasMissingRequiredFields = useMemo(() => {
    return hasTouched && !exp.position?.trim() && !exp.startDate?.trim();
  }, [hasTouched, exp.position, exp.startDate]);

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-all duration-200">
      {/* Header - Always visible */}
      <div className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors min-h-[80px] sm:min-h-[72px]">
        {/* Reorder arrows — min 44px touch targets */}
        <div className="flex flex-col gap-0 mr-2 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={handleMoveUp}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
            aria-label="Move up"
          >
            <ArrowUp className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            disabled={index === totalLength - 1}
            onClick={handleMoveDown}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
            aria-label="Move down"
          >
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={handleToggleExpand}
          className="flex-1 flex items-center justify-between touch-manipulation active:bg-muted/70 min-w-0"
        >
          <div className="text-left flex-1 min-w-0 pr-3">
            <p className="font-semibold text-base sm:text-sm truncate">
              {exp.position || `Position ${index + 1}`}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {exp.company || 'Company name'}
              {exp.account && <span className="text-muted-foreground/70"> ({exp.account} Account)</span>}
            </p>
            {(exp.startDate || exp.endDate || exp.current) && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  {exp.startDate && (
                    <span className="ml-1 text-muted-foreground/50">
                      • {calculateDuration(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  )}
                </span>
              </p>
            )}
          </div>
          <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="animate-in fade-in-0 duration-200">
          <div className="p-4 pt-0 space-y-4 border-t border-border">
            {hasMissingRequiredFields && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground mt-3">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                <p className="text-xs leading-snug">
                  <span className="font-medium">Missing key details:</span> Adding a position title and start date helps AI features work better and prevents empty entries in your PDF export.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-4 h-4" />
                  Position
                </Label>
                <Input
                  value={exp.position}
                  onChange={handlePositionChange}
                  onBlur={handleFieldBlur}
                  placeholder="Job Title"
                  className="h-12"
                  autoComplete="organization-title"
                />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1.5 mb-2">
                  <Building2 className="w-4 h-4" />
                  Company
                </Label>
                <Input
                  value={exp.company}
                  onChange={handleCompanyChange}
                  placeholder="Company Name"
                  className="h-12"
                  autoComplete="organization"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1.5 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Account / Client (optional)
              </Label>
              <Input
                value={exp.account || ''}
                onChange={handleAccountChange}
                placeholder="e.g., Verizon, AT&T — the client you served at this company"
                className="h-12"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm flex items-center gap-1.5 mb-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </Label>
                <MonthYearPicker
                  value={exp.startDate}
                  onChange={handleStartDateChange}
                />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1.5 mb-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </Label>
                {exp.current ? (
                  <div className="h-11 flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                    Present
                  </div>
                ) : (
                  <MonthYearPicker
                    value={exp.endDate}
                    onChange={handleEndDateChange}
                    disabled={exp.current}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Switch
                checked={exp.current}
                onCheckedChange={handleCurrentChange}
              />
              <Label className="text-sm">Currently working here</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Description</Label>
                <InlineAIButton
                  section="experience"
                  onAction={handleInlineAIAction}
                  isLoading={isEnhancing}
                  disabled={!exp.position}
                  hasContent={!!exp.description?.trim()}
                />
              </div>
              {!exp.description?.trim() && (
                <p className="text-xs text-muted-foreground mb-2 leading-snug">
                  Tip: Start each line with an action verb — e.g. &ldquo;Led&rdquo;, &ldquo;Built&rdquo;, &ldquo;Improved&rdquo; — and include a result or metric where possible.
                </p>
              )}
              <Textarea
                dir="auto"
                value={exp.description}
                onChange={handleDescriptionChange}
                placeholder="Describe your responsibilities and achievements..."
                className="min-h-[120px] resize-none text-base"
              />
              {hasBracketPlaceholders && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                  <p className="text-xs leading-snug">
                    <span className="font-medium">Fill in your real numbers:</span> The AI left placeholders like <span className="font-mono bg-warning/20 px-0.5 rounded">[X%]</span> or <span className="font-mono bg-warning/20 px-0.5 rounded">[~$X]</span> where it couldn't find your actual metrics. Replace each one with your real figures before submitting your resume.
                  </p>
                </div>
              )}
            </div>

            {/* Per-entry AI nudge chips */}
            {entryNudges.map((entryNudge) => (
              <AIContextualNudge
                key={`${entryNudge.trigger}_${exp.id}`}
                compact
                show
                message={entryNudge.message}
                actionLabel={entryNudge.actionLabel}
                onAction={() => {
                  onAIAction(entryNudge.action, exp.id);
                  onDismissNudge(`${entryNudge.trigger}_${exp.id}`);
                }}
                onDismiss={() => onDismissNudge(`${entryNudge.trigger}_${exp.id}`)}
              />
            ))}

            <div className="flex justify-end sm:justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
