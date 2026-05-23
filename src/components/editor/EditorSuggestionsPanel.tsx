import { memo, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { ATSInlineSuggestions } from '@/components/editor/ATSInlineSuggestions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { ATSSuggestion, DeepResult } from '@/hooks/useATSSuggestions';
import type { SectionId } from '@/types/resume';
import { cn } from '@/lib/utils';

const SECTION_LABELS: Partial<Record<SectionId, string>> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
};

interface EditorSuggestionsPanelProps {
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getATSSuggestions: (section: string) => ATSSuggestion[];
  isAnalyzingSection: (section: string) => boolean;
  fetchDeepSuggestions: (section: SectionId) => Promise<void>;
  deepResult?: DeepResult;
  onApplyDeep?: (improved: unknown) => void;
  onDiscardDeep?: () => void;
  hasJobDescription?: boolean;
  onRequestJobDescription?: () => void;
  className?: string;
}

export const EditorSuggestionsPanel = memo(function EditorSuggestionsPanel({
  sectionId,
  open,
  onOpenChange,
  getATSSuggestions,
  isAnalyzingSection,
  fetchDeepSuggestions,
  deepResult,
  onApplyDeep,
  onDiscardDeep,
  hasJobDescription,
  onRequestJobDescription,
  className,
}: EditorSuggestionsPanelProps) {
  const section = sectionId as SectionId;
  const suggestions = useMemo(() => getATSSuggestions(sectionId), [getATSSuggestions, sectionId]);
  const isAnalyzing = isAnalyzingSection(sectionId);
  const hasContent = suggestions.length > 0 || isAnalyzing || !!deepResult;

  if (!hasContent || sectionId === 'contact' || sectionId === 'more') {
    return null;
  }

  const label = SECTION_LABELS[section] ?? sectionId;
  const countLabel =
    suggestions.length > 0
      ? `${suggestions.length} tip${suggestions.length === 1 ? '' : 's'}`
      : isAnalyzing
        ? 'Analyzing…'
        : 'AI tips';

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => onOpenChange(true)}
        className={cn(
          'editor-suggestions-fab h-10 min-h-[44px] rounded-full shadow-lg gap-2 px-4 touch-manipulation active:scale-95',
          className,
        )}
        aria-label={`Open AI suggestions for ${label}`}
      >
        <Sparkles className="w-4 h-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">{countLabel}</span>
        {suggestions.length > 0 && (
          <span className="editor-suggestions-fab__badge" aria-hidden>
            {suggestions.length}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="editor-suggestions-sheet w-full sm:max-w-md flex flex-col gap-0 p-0"
        >
          <SheetHeader className="editor-suggestions-sheet__header shrink-0 text-left space-y-1">
            <SheetTitle className="editor-suggestions-sheet__title flex items-center gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
              AI suggestions
            </SheetTitle>
            <p className="editor-suggestions-sheet__subtitle text-sm font-medium text-foreground">
              {suggestions.length > 0
                ? `${suggestions.length} improvement${suggestions.length === 1 ? '' : 's'} for ${label}`
                : `Analyzing ${label}…`}
            </p>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ATSInlineSuggestions
              section={section}
              suggestions={suggestions}
              isAnalyzing={isAnalyzing}
              onDeepAnalyze={fetchDeepSuggestions}
              deepResult={deepResult}
              onApplyDeep={onApplyDeep}
              onDiscardDeep={onDiscardDeep}
              hasJobDescription={hasJobDescription}
              onRequestJobDescription={onRequestJobDescription}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
