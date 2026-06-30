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
import { formatDateRange, calculateDuration, isReversedDateRange } from '@/lib/dateUtils';
import { NudgeState } from '@/hooks/useResumeNudges';
import { MonthYearPicker } from './MonthYearPicker';
import { useLocale } from '@/i18n/LocaleProvider';

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
  const { t, locale } = useLocale();
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

  const importedHighlights = useMemo(
    () => [...(exp.achievements ?? []), ...(exp.responsibilities ?? [])].filter(Boolean).join('\n'),
    [exp.achievements, exp.responsibilities],
  );

  const handleHighlightsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const highlights = e.target.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    onUpdate(exp.id, { achievements: highlights, responsibilities: [] });
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
      (exp.achievements || []).some(a => BRACKET_RE.test(a)) ||
      (exp.responsibilities || []).some(a => BRACKET_RE.test(a));
  }, [exp.description, exp.achievements, exp.responsibilities]);

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
            aria-label={t('common.moveUp', 'Move up')}
          >
            <ArrowUp className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            disabled={index === totalLength - 1}
            onClick={handleMoveDown}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
            aria-label={t('common.moveDown', 'Move down')}
          >
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={handleToggleExpand}
          className="flex-1 flex items-center justify-between touch-manipulation active:bg-muted/70 min-w-0"
        >
          <div className="text-left flex-1 min-w-0 pr-3">
            <p className="font-semibold text-base sm:text-sm truncate" title={exp.position || undefined}>
              {exp.position || t('editor.experience.positionDefault', 'Position {{index}}', { index: index + 1 })}
            </p>
            <p className="text-sm text-muted-foreground truncate" title={exp.company || undefined}>
              {exp.company || t('editor.experience.companyDefault', 'Company name')}
              {exp.account && <span className="text-muted-foreground/70"> {t('editor.experience.accountSuffix', '({{account}} Account)', { account: exp.account })}</span>}
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
                  <span className="font-medium">{t('editor.contact.missingDetailsTitle', 'Missing key details:')}</span> {t('editor.experience.missingDetails', 'Adding a position title and start date helps AI features work better and prevents empty entries in your PDF export.')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`exp-${exp.id}-position`} className="text-sm flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-4 h-4" />
                  {t('editor.experience.positionLabel', 'Position')}
                </Label>
                <Input
                  id={`exp-${exp.id}-position`}
                  value={exp.position}
                  onChange={handlePositionChange}
                  onBlur={handleFieldBlur}
                  placeholder={t('editor.experience.positionPlaceholder', 'Job Title')}
                  className="h-12"
                  autoComplete="organization-title"
                />
              </div>
              <div>
                <Label htmlFor={`exp-${exp.id}-company`} className="text-sm flex items-center gap-1.5 mb-2">
                  <Building2 className="w-4 h-4" />
                  {t('editor.experience.companyLabel', 'Company')}
                </Label>
                <Input
                  id={`exp-${exp.id}-company`}
                  value={exp.company}
                  onChange={handleCompanyChange}
                  placeholder={t('editor.experience.companyPlaceholder', 'Company Name')}
                  className="h-12"
                  autoComplete="organization"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`exp-${exp.id}-account`} className="text-sm flex items-center gap-1.5 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {t('editor.experience.accountLabel', 'Account / Client (optional)')}
              </Label>
              <Input
                id={`exp-${exp.id}-account`}
                value={exp.account || ''}
                onChange={handleAccountChange}
                placeholder={t('editor.experience.accountPlaceholder', 'e.g., Verizon, AT&T — the client you served at this company')}
                className="h-12"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div role="group" aria-labelledby={`exp-${exp.id}-start-label`}>
                <Label id={`exp-${exp.id}-start-label`} className="text-sm flex items-center gap-1.5 mb-2">
                  <Calendar className="w-4 h-4" />
                  {t('editor.experience.startDate', 'Start Date')}
                </Label>
                <MonthYearPicker
                  value={exp.startDate}
                  onChange={handleStartDateChange}
                />
              </div>
              <div role="group" aria-labelledby={`exp-${exp.id}-end-label`}>
                <Label id={`exp-${exp.id}-end-label`} className="text-sm flex items-center gap-1.5 mb-2">
                  <Calendar className="w-4 h-4" />
                  {t('editor.experience.endDate', 'End Date')}
                </Label>
                {exp.current ? (
                  <div className="h-11 flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                    {t('editor.experience.present', 'Present')}
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

            {isReversedDateRange(exp.startDate, exp.endDate, exp.current) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {t('editor.experience.reversedDates', 'End date is before the start date — check this range before exporting.')}
              </p>
            )}

            <div className="flex items-center gap-3 py-1">
              <Switch
                checked={exp.current}
                onCheckedChange={handleCurrentChange}
              />
              <Label className="text-sm">{t('editor.experience.currentSwitch', 'Currently working here')}</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">{t('editor.experience.descriptionLabel', 'Description')}</Label>
                <InlineAIButton
                  section="experience"
                  onAction={handleInlineAIAction}
                  isLoading={isEnhancing}
                  disabled={!exp.position}
                  hasContent={!!(exp.description?.trim() || (exp.achievements ?? []).some(a => a.trim() !== ''))}
                />
              </div>
              {!exp.description?.trim() && (
                <p className="text-xs text-muted-foreground mb-2 leading-snug">
                  {t('editor.experience.descriptionTip', 'Tip: Start each line with an action verb — e.g. "Led", "Built", "Improved" — and include a result or metric where possible.')}
                </p>
              )}
              <Textarea
                dir="auto"
                value={exp.description}
                onChange={handleDescriptionChange}
                placeholder={t('editor.experience.descriptionPlaceholder', 'Describe your responsibilities and achievements...')}
                className="min-h-[120px] resize-none text-base"
              />
              {(importedHighlights || exp.achievements || exp.responsibilities) && (
                <div className="mt-3">
                  <Label htmlFor={`exp-${exp.id}-highlights`} className="text-sm">
                    {t('editor.experience.highlightsLabel', 'Highlights / imported bullet points')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    {t('editor.experience.highlightsTip', 'One bullet per line. These points appear in the CV preview and export.')}
                  </p>
                  <Textarea
                    id={`exp-${exp.id}-highlights`}
                    dir="auto"
                    value={importedHighlights}
                    onChange={handleHighlightsChange}
                    placeholder={t('editor.experience.highlightsPlaceholder', 'One bullet point per line')}
                    className="min-h-[120px] resize-y text-base"
                  />
                </div>
              )}
              {hasBracketPlaceholders && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                  <p className="text-xs leading-snug">
                    <span className="font-medium">{t('editor.contact.fillRealNumbersTitle', 'Fill in your real numbers:')}</span> {t('editor.contact.fillRealNumbersBody', "The AI left placeholders like [X%] or [~$X] where it couldn't find your actual metrics. Replace each one with your real figures before submitting your resume.")}
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
                {t('common.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
