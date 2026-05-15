import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Scissors, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { ResumeData } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { computePreviewBreaks, getPageDimensionsForFormat } from '@/lib/pdfUtils';
import { normalizeBreakPositions } from '@/lib/exportPagePlan';
import { cn } from '@/lib/utils';

interface ExportPageBreakSetupProps {
  visible: boolean;
  templateElement?: HTMLElement | null;
  resumeData?: ResumeData | null;
}

const MIN_BREAK_GAP = 40;

export function ExportPageBreakSetup({ visible, templateElement, resumeData }: ExportPageBreakSetupProps) {
  const updateResume = useResumeStore((s) => s.updateResume);
  const [suggestedBreaks, setSuggestedBreaks] = useState<number[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);

  const pageFormat = resumeData?.customization?.pageFormat ?? 'letter';
  const pageDims = useMemo(() => getPageDimensionsForFormat(pageFormat), [pageFormat]);
  const customBreaks = useMemo(
    () => normalizeBreakPositions(resumeData?.customization?.customBreakPositions, totalHeight || 1, MIN_BREAK_GAP),
    [resumeData?.customization?.customBreakPositions, totalHeight],
  );
  const activeBreaks = customBreaks.length > 0 ? customBreaks : suggestedBreaks;

  const persistBreaks = (positions: number[]) => {
    if (!resumeData) return;
    const normalized = normalizeBreakPositions(positions, totalHeight || 1, MIN_BREAK_GAP);
    updateResume({
      customization: {
        ...resumeData.customization,
        customBreakPositions: normalized,
      } as typeof resumeData.customization,
    });
  };

  useEffect(() => {
    if (!visible || !templateElement || !resumeData) return;
    const measure = () => {
      const height = Math.max(templateElement.scrollHeight || 0, templateElement.offsetHeight || 0);
      setTotalHeight(height);
      const smart = computePreviewBreaks(templateElement, pageDims.pageWidth, pageDims.pageHeight);
      const normalizedSmart = normalizeBreakPositions(smart, height || 1, MIN_BREAK_GAP);
      setSuggestedBreaks(normalizedSmart);
      if (!resumeData.customization?.customBreakPositions?.length && normalizedSmart.length > 0) {
        updateResume({
          customization: {
            ...resumeData.customization,
            customBreakPositions: normalizedSmart,
          } as typeof resumeData.customization,
        });
      }
    };
    const timer = window.setTimeout(measure, 100);
    const observer = new ResizeObserver(measure);
    observer.observe(templateElement);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [visible, templateElement, resumeData, pageDims.pageHeight, pageDims.pageWidth, updateResume]);

  if (!visible || !resumeData || !templateElement) return null;

  const addBreak = () => {
    const last = activeBreaks[activeBreaks.length - 1] ?? 0;
    const next = Math.min(Math.max(last + pageDims.pageHeight - 44, MIN_BREAK_GAP), Math.max(MIN_BREAK_GAP, totalHeight - MIN_BREAK_GAP));
    persistBreaks([...activeBreaks, next]);
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

  const pageCount = activeBreaks.length + 1;
  const previewHeight = 180;
  const scale = totalHeight > 0 ? previewHeight / totalHeight : 1;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Scissors className="h-4 w-4 text-primary" />
            Export page setup
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Drag each break line until every page ends exactly where you want.
          </p>
        </div>
        <span className="text-xs rounded-full bg-background px-2 py-1 border border-border whitespace-nowrap">
          {pageCount} page{pageCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="relative rounded-lg border border-border bg-white overflow-hidden" style={{ height: previewHeight }}>
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-neutral-100 to-white" style={{ height: Math.max(16, totalHeight * scale) }} />
        {activeBreaks.map((breakY, index) => (
          <div
            key={`${breakY}-${index}`}
            className="absolute inset-x-0 border-t-2 border-primary"
            style={{ top: `${breakY * scale}px` }}
          >
            <span className="absolute left-2 -translate-y-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              break {index + 1}
            </span>
          </div>
        ))}
      </div>

      {activeBreaks.length > 0 ? (
        <div className="space-y-3">
          {activeBreaks.map((breakY, index) => {
            const previous = index === 0 ? MIN_BREAK_GAP : activeBreaks[index - 1] + MIN_BREAK_GAP;
            const next = index === activeBreaks.length - 1 ? totalHeight - MIN_BREAK_GAP : activeBreaks[index + 1] - MIN_BREAK_GAP;
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">Break {index + 1}</span>
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
        <p className="text-xs text-muted-foreground">This CV currently fits on one page.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addBreak} className="h-8">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add break
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetToSmart} className="h-8" disabled={suggestedBreaks.length === 0}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Smart reset
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearBreaks}
          className={cn('h-8 text-muted-foreground', activeBreaks.length === 0 && 'opacity-50')}
          disabled={activeBreaks.length === 0}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
