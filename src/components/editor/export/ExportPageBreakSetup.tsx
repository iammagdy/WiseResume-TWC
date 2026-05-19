import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Scissors, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ResumeData } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import {
  addBreakBeforeSection,
  computeBreaksForTargetPages,
  computePreviewBreaks,
  getPageDimensionsForFormat,
  getSectionLabelForBreakY,
  getSectionsInDOMOrder,
} from '@/lib/pdfUtils';
import { normalizeBreakPositions } from '@/lib/exportPagePlan';
import { cn } from '@/lib/utils';
import { SECTION_LABELS } from '@/lib/sectionLabels';
import { PageBreakDialogPreview } from './PageBreakDialogPreview';
import { toast } from 'sonner';

function getLiveTotalHeight(el: HTMLElement): number {
  return Math.max(el.scrollHeight || 0, el.offsetHeight || 0, 1);
}

interface ExportPageBreakSetupProps {
  /** When true, measure template and show controls (dialog open or legacy embed). */
  active: boolean;
  templateElement?: HTMLElement | null;
  resumeData?: ResumeData | null;
}

const MIN_BREAK_GAP = 40;

export function ExportPageBreakSetup({ active, templateElement, resumeData }: ExportPageBreakSetupProps) {
  const updateResume = useResumeStore((s) => s.updateResume);
  const [suggestedBreaks, setSuggestedBreaks] = useState<number[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [resolvedTemplate, setResolvedTemplate] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      setResolvedTemplate(null);
      return;
    }
    const pick = () =>
      templateElement ?? document.querySelector<HTMLElement>('[data-resume-template]');
    setResolvedTemplate(pick());
    const timers = [0, 50, 150, 400].map((ms) =>
      window.setTimeout(() => setResolvedTemplate(pick()), ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active, templateElement, resumeData?.id]);

  const effectiveTemplate = templateElement ?? resolvedTemplate;

  const pageFormat = resumeData?.customization?.pageFormat ?? 'letter';
  const pageDims = useMemo(() => getPageDimensionsForFormat(pageFormat), [pageFormat]);
  const savedBreaks = useMemo(
    () => normalizeBreakPositions(resumeData?.customization?.customBreakPositions, totalHeight || 1, MIN_BREAK_GAP),
    [resumeData?.customization?.customBreakPositions, totalHeight],
  );
  const hasCustomBreaks = (resumeData?.customization?.customBreakPositions?.length ?? 0) > 0;
  const activeBreaks = hasCustomBreaks ? savedBreaks : [];

  const targetPreset: 'custom' | '1' | '2' | '3' = useMemo(() => {
    if (!hasCustomBreaks) return 'custom';
    const n = savedBreaks.length + 1;
    if (n === 1) return '1';
    if (n === 2) return '2';
    if (n === 3) return '3';
    return 'custom';
  }, [hasCustomBreaks, savedBreaks.length]);

  const sectionIds = useMemo(() => {
    if (!effectiveTemplate) return [];
    return getSectionsInDOMOrder(effectiveTemplate).filter((id) => SECTION_LABELS[id]);
  }, [effectiveTemplate, totalHeight]);

  const persistBreaks = (positions: number[]) => {
    if (!resumeData || !effectiveTemplate) return;
    const liveHeight = getLiveTotalHeight(effectiveTemplate);
    const normalized = normalizeBreakPositions(positions, liveHeight, MIN_BREAK_GAP);
    updateResume({
      customization: {
        ...resumeData.customization,
        customBreakPositions: normalized,
      } as typeof resumeData.customization,
    });
  };

  useEffect(() => {
    if (!active || !effectiveTemplate || !resumeData) return;
    const measure = () => {
      const height = Math.max(
        effectiveTemplate.scrollHeight || 0,
        effectiveTemplate.offsetHeight || 0,
      );
      setTotalHeight(height);
      const smart = computePreviewBreaks(
        effectiveTemplate,
        pageDims.pageWidth,
        pageDims.pageHeight,
      );
      setSuggestedBreaks(normalizeBreakPositions(smart, height || 1, MIN_BREAK_GAP));
    };
    const timer = window.setTimeout(measure, 100);
    const observer = new ResizeObserver(measure);
    observer.observe(effectiveTemplate);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [active, effectiveTemplate, resumeData, pageDims.pageHeight, pageDims.pageWidth]);

  if (!active || !resumeData) return null;

  if (!effectiveTemplate) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
        Resume preview is not ready. Wait for the live preview to load, then try again.
      </p>
    );
  }

  const displayBreaks = hasCustomBreaks ? activeBreaks : suggestedBreaks;
  const pageCount = hasCustomBreaks ? savedBreaks.length + 1 : suggestedBreaks.length + 1;
  const maxPreviewHeight = 320;

  const addBreak = () => {
    const base = hasCustomBreaks ? activeBreaks : suggestedBreaks;
    const last = base[base.length - 1] ?? 0;
    const next = Math.min(
      Math.max(last + pageDims.pageHeight - 44, MIN_BREAK_GAP),
      Math.max(MIN_BREAK_GAP, totalHeight - MIN_BREAK_GAP),
    );
    persistBreaks([...base, next]);
  };

  const moveBreak = (index: number, nextValue: number) => {
    const next = [...activeBreaks];
    next[index] = nextValue;
    persistBreaks(next);
  };

  const removeBreak = (index: number) => {
    persistBreaks(activeBreaks.filter((_position, i) => i !== index));
  };

  const resetToSmart = () => persistBreaks(suggestedBreaks);
  const clearBreaks = () => persistBreaks([]);

  const applyTargetPages = (pages: 1 | 2 | 3) => {
    persistBreaks(
      computeBreaksForTargetPages(
        effectiveTemplate,
        pages,
        pageDims.pageWidth,
        pageDims.pageHeight,
      ),
    );
  };

  const breakBeforeSection = (sectionId: string) => {
    const liveHeight = getLiveTotalHeight(effectiveTemplate);
    const base = hasCustomBreaks ? activeBreaks : [];
    const { breaks, applied } = addBreakBeforeSection(
      base,
      effectiveTemplate,
      sectionId,
      liveHeight,
    );
    if (!applied) {
      toast.error('This section is too close to the top or bottom for a page cut.');
      return;
    }
    persistBreaks(breaks);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Scissors className="h-4 w-4 text-primary" />
          Where each page ends
        </div>
        <span className="text-xs rounded-full bg-background px-2 py-1 border border-border whitespace-nowrap">
          {pageCount} page{pageCount === 1 ? '' : 's'}
          {!hasCustomBreaks ? ' (auto)' : ''}
        </span>
      </div>

      {!hasCustomBreaks && (
        <p className="text-xs text-muted-foreground">
          No custom cuts saved yet. Export uses automatic pagination until you set cuts below.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Target pages</p>
        <ToggleGroup
          type="single"
          value={targetPreset}
          onValueChange={(v) => {
            if (!v) return;
            if (v === 'custom') return;
            applyTargetPages(Number(v) as 1 | 2 | 3);
          }}
          className="justify-start flex-wrap"
        >
          <ToggleGroupItem value="1" aria-label="1 page" className="text-xs h-8 px-3">
            1 page
          </ToggleGroupItem>
          <ToggleGroupItem value="2" aria-label="2 pages" className="text-xs h-8 px-3">
            2 pages
          </ToggleGroupItem>
          <ToggleGroupItem value="3" aria-label="3 pages" className="text-xs h-8 px-3">
            3 pages
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" aria-label="Custom breaks" className="text-xs h-8 px-3">
            Custom
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {sectionIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Start a new page before section</p>
          <div className="flex flex-wrap gap-1.5">
            {sectionIds.map((id) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => breakBeforeSection(id)}
              >
                {SECTION_LABELS[id] ?? id}
              </Button>
            ))}
          </div>
        </div>
      )}

      <PageBreakDialogPreview
        templateElement={effectiveTemplate}
        breakYs={displayBreaks}
        maxPreviewHeight={maxPreviewHeight}
      />

      {hasCustomBreaks && activeBreaks.length > 0 ? (
        <div className="space-y-3">
          {activeBreaks.map((breakY, index) => {
            const previous = index === 0 ? MIN_BREAK_GAP : activeBreaks[index - 1] + MIN_BREAK_GAP;
            const next =
              index === activeBreaks.length - 1
                ? totalHeight - MIN_BREAK_GAP
                : activeBreaks[index + 1] - MIN_BREAK_GAP;
            const breakLabel = getSectionLabelForBreakY(
              effectiveTemplate,
              breakY,
              MIN_BREAK_GAP,
            );
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    Break {index + 1}
                    {breakLabel.description ? ` · ${breakLabel.description}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBreak(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove break ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Slider
                  value={[breakY]}
                  min={Math.max(MIN_BREAK_GAP, previous)}
                  max={Math.max(Math.max(MIN_BREAK_GAP, previous), next)}
                  step={1}
                  onValueChange={([value]) => moveBreak(index, value)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {suggestedBreaks.length === 0
            ? 'This CV currently fits on one page.'
            : 'Use target pages or section buttons above, or add a break manually.'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addBreak} className="h-8">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add break
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetToSmart}
          className="h-8"
          disabled={suggestedBreaks.length === 0}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Smart reset
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearBreaks}
          className={cn('h-8 text-muted-foreground', !hasCustomBreaks && 'opacity-50')}
          disabled={!hasCustomBreaks}
        >
          Clear custom cuts
        </Button>
      </div>
    </div>
  );
}
