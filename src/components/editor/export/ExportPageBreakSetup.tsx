import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RotateCcw, Scissors, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { ResumeData } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import {
  addBreakBeforeSection,
  computeBreaksForTargetPages,
  computePreviewBreaks,
  getPageDimensionsForFormat,
  getSectionLabelForBreakY,
  getSectionsInDOMOrder,
  getSectionsWithBreaksBefore,
  resolveExportPageCount,
} from '@/lib/pdfUtils';
import { normalizeBreakPositions, snapBreakPositionsToSectionHeadings } from '@/lib/exportPagePlan';
import { collectSectionLayoutBounds, getSectionBreakBoundary } from '@/lib/exportLayoutMetrics';
import { cn } from '@/lib/utils';
import { SECTION_LABELS } from '@/lib/sectionLabels';
import { PageBreakDialogPreview } from './PageBreakDialogPreview';
import { toast } from 'sonner';
import { getPageCutsForLayout, setPageCutsForLayout } from '@/i18n/resumeLocale';
import { getDefaultCustomization } from '@/lib/templateCustomization';

function getLiveTotalHeight(el: HTMLElement): number {
  return Math.max(el.scrollHeight || 0, el.offsetHeight || 0, 1);
}

interface ExportPageBreakSetupProps {
  /** When true, measure template and show controls (dialog open or legacy embed). */
  active: boolean;
  templateElement?: HTMLElement | null;
  resumeData?: ResumeData | null;
  /** Streamlined = preview-first layout for quick export dialogs. */
  variant?: 'default' | 'streamlined';
  /** Override preview viewport height (px). */
  maxPreviewHeight?: number;
  /** Horizontal page spread for wide desktop previews. */
  previewLayout?: 'stack' | 'spread';
  /** When set, seeds a single section break on first open if no custom breaks exist. */
  defaultBreakSection?: string;
  className?: string;
}

const MIN_BREAK_GAP = 40;

export function ExportPageBreakSetup({
  active,
  templateElement,
  resumeData,
  variant = 'default',
  maxPreviewHeight: maxPreviewHeightProp,
  previewLayout = 'stack',
  defaultBreakSection,
  className,
}: ExportPageBreakSetupProps) {
  const updateResume = useResumeStore((s) => s.updateResume);
  const defaultBreakAppliedRef = useRef(false);
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
  const templateId = resumeData?.templateId ?? 'modern';
  const layoutCuts = useMemo(
    () => getPageCutsForLayout(templateId, resumeData?.customization),
    [templateId, resumeData?.customization],
  );
  const pageDims = useMemo(() => getPageDimensionsForFormat(pageFormat), [pageFormat]);
  const savedBreaks = useMemo(
    () => normalizeBreakPositions(layoutCuts, totalHeight || 1, MIN_BREAK_GAP),
    [layoutCuts, totalHeight],
  );
  const hasCustomBreaks = layoutCuts.length > 0;
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
    const sections = collectSectionLayoutBounds(effectiveTemplate);
    const normalized = normalizeBreakPositions(positions, liveHeight, MIN_BREAK_GAP);
    const snapped = snapBreakPositionsToSectionHeadings(
      normalized,
      sections,
      liveHeight,
      MIN_BREAK_GAP,
    );
    const customization = resumeData.customization ?? getDefaultCustomization();
    updateResume({ customization: setPageCutsForLayout(templateId, customization, snapped) });
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
    const timer = window.setTimeout(() => {
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      void fontsReady.then(measure);
    }, 100);
    const observer = new ResizeObserver(measure);
    observer.observe(effectiveTemplate);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [active, effectiveTemplate, resumeData, pageDims.pageHeight, pageDims.pageWidth]);

  useEffect(() => {
    if (!active) {
      defaultBreakAppliedRef.current = false;
      return;
    }
    if (variant !== 'streamlined' || !defaultBreakSection || !effectiveTemplate || !resumeData) return;
    if (defaultBreakAppliedRef.current) return;
    if (getPageCutsForLayout(templateId, resumeData.customization).length > 0) {
      defaultBreakAppliedRef.current = true;
      return;
    }
    if (totalHeight <= MIN_BREAK_GAP) return;

    const liveHeight = getLiveTotalHeight(effectiveTemplate);
    const { breaks, applied } = addBreakBeforeSection(
      [],
      effectiveTemplate,
      defaultBreakSection,
      liveHeight,
    );
    if (applied) {
      persistBreaks(breaks);
    } else {
      const fallback = computeBreaksForTargetPages(
        effectiveTemplate,
        2,
        pageDims.pageWidth,
        pageDims.pageHeight,
      );
      if (fallback.length) persistBreaks(fallback);
    }
    defaultBreakAppliedRef.current = true;
  }, [
    active,
    defaultBreakSection,
    effectiveTemplate,
    variant,
    pageDims.pageHeight,
    pageDims.pageWidth,
    resumeData,
    totalHeight,
  ]);

  if (!active || !resumeData) return null;

  if (!effectiveTemplate) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
        Resume preview is not ready. Wait for the live preview to load, then try again.
      </p>
    );
  }

  const displayBreaks = hasCustomBreaks ? activeBreaks : suggestedBreaks;
  const pageCount = resolveExportPageCount(
    effectiveTemplate,
    pageDims.pageWidth,
    pageDims.pageHeight,
    hasCustomBreaks ? savedBreaks : undefined,
  );
  const maxPreviewHeight = maxPreviewHeightProp ?? (variant === 'streamlined' ? 280 : 320);
  const isStreamlined = variant === 'streamlined';

  const activeSectionBreakIds = new Set(
    hasCustomBreaks
      ? getSectionsWithBreaksBefore(effectiveTemplate, activeBreaks, MIN_BREAK_GAP)
      : [],
  );

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

  const toggleSectionBreak = (sectionId: string) => {
    const sectionEl = effectiveTemplate.querySelector(
      `[data-section="${sectionId}"]`,
    ) as HTMLElement | null;
    if (!sectionEl) return;

    const boundary = getSectionBreakBoundary(sectionEl, effectiveTemplate, MIN_BREAK_GAP);

    if (activeSectionBreakIds.has(sectionId)) {
      if (hasCustomBreaks) {
        persistBreaks(activeBreaks.filter((breakY) => Math.abs(breakY - boundary) > MIN_BREAK_GAP));
      }
      return;
    }

    const liveHeight = getLiveTotalHeight(effectiveTemplate);

    if (isStreamlined && !hasCustomBreaks) {
      const { breaks, applied } = addBreakBeforeSection(
        [],
        effectiveTemplate,
        sectionId,
        liveHeight,
      );
      if (!applied) {
        toast.error('This section is too close to the top or bottom for a page cut.');
        return;
      }
      persistBreaks(breaks);
      return;
    }

    const base = hasCustomBreaks ? activeBreaks : suggestedBreaks;
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

  const pageToggle = (
    <ToggleGroup
      type="single"
      value={targetPreset}
      onValueChange={(v) => {
        if (!v) return;
        if (v === 'custom') return;
        applyTargetPages(Number(v) as 1 | 2 | 3);
      }}
      className={cn('justify-start', isStreamlined ? 'jmw-page-setup__page-toggle' : 'flex-wrap')}
    >
      <ToggleGroupItem value="1" aria-label="1 page" className="text-xs h-8 px-3">
        {isStreamlined ? '1' : '1 page'}
      </ToggleGroupItem>
      <ToggleGroupItem value="2" aria-label="2 pages" className="text-xs h-8 px-3">
        {isStreamlined ? '2' : '2 pages'}
      </ToggleGroupItem>
      <ToggleGroupItem value="3" aria-label="3 pages" className="text-xs h-8 px-3">
        {isStreamlined ? '3' : '3 pages'}
      </ToggleGroupItem>
      <ToggleGroupItem value="custom" aria-label="Custom breaks" className="text-xs h-8 px-3">
        Custom
      </ToggleGroupItem>
    </ToggleGroup>
  );

  const sectionChips = sectionIds.length > 0 && (
    <div className={cn(isStreamlined ? 'jmw-page-setup__sections-block' : 'space-y-2')}>
      {!isStreamlined ? (
        <p className="text-xs font-medium text-muted-foreground">Start a new page before section</p>
      ) : (
        <p className="jmw-page-setup__sections-hint">
          Click a section to start a new page there. Selected sections are highlighted.
        </p>
      )}
      <div
        className={cn(
          isStreamlined ? 'jmw-page-setup__section-grid' : 'flex flex-wrap gap-1.5',
        )}
        role="group"
        aria-label="Start a new page before section"
      >
        {sectionIds.map((id) => {
          const isActive = activeSectionBreakIds.has(id);
          return (
            <Button
              key={id}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              aria-pressed={isActive}
              className={cn(
                'text-xs transition-colors',
                isStreamlined ? 'jmw-page-setup__section-chip h-8' : 'h-7',
                isStreamlined && isActive && 'jmw-page-setup__section-chip--active',
              )}
              onClick={() => toggleSectionBreak(id)}
            >
              {SECTION_LABELS[id] ?? id}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const preview = (
    <PageBreakDialogPreview
      templateElement={effectiveTemplate}
      breakYs={displayBreaks}
      pageWidthPx={pageDims.pageWidth}
      pageHeightPx={pageDims.pageHeight}
      footerHeightPx={44}
      maxPreviewHeight={maxPreviewHeight}
      layout={previewLayout}
    />
  );

  const breakSliders = hasCustomBreaks && activeBreaks.length > 0 ? (
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
  ) : !isStreamlined ? (
    <p className="text-xs text-muted-foreground">
      {suggestedBreaks.length === 0
        ? 'This CV currently fits on one page.'
        : 'Use target pages or section buttons above, or add a break manually.'}
    </p>
  ) : null;

  const breakActions = (
    <div className={cn('flex flex-wrap gap-2', isStreamlined && 'jmw-page-setup__actions')}>
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
        Clear
      </Button>
    </div>
  );

  if (isStreamlined) {
    return (
      <div className={cn('jmw-page-setup jmw-page-setup--streamlined', className)}>
        <div className="jmw-page-setup__preview-card">{preview}</div>

        <div className="jmw-page-setup__sidebar-stack">
          <div className="jmw-page-setup__controls-card">
            <div className="jmw-page-setup__controls-head">
              <div className="jmw-page-setup__controls-title">
                <Scissors className="h-3.5 w-3.5 text-primary" aria-hidden />
                Page layout
              </div>
              <span className="jmw-page-setup__page-pill">
                {pageCount} page{pageCount === 1 ? '' : 's'}
                {!hasCustomBreaks ? ' · auto' : ''}
              </span>
            </div>

            <div className="jmw-page-setup__row jmw-page-setup__row--pages">
              <span className="jmw-page-setup__row-label">Pages</span>
              {pageToggle}
            </div>

            {sectionChips}
          </div>

          <Accordion type="single" collapsible className="jmw-page-setup__accordion">
            <AccordionItem value="fine-tune" className="border-none">
              <AccordionTrigger className="jmw-page-setup__accordion-trigger py-3 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Fine-tune page cuts
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0 space-y-3">
                {breakSliders}
                {breakActions}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
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
        {pageToggle}
      </div>

      {sectionChips}

      {preview}

      {breakSliders}

      {breakActions}
    </div>
  );
}
