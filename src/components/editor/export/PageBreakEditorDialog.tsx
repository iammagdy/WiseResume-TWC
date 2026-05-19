import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Plus, RotateCcw, Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { computePreviewBreaks, getPageDimensionsForFormat } from '@/lib/pdfUtils';
import { normalizeBreakPositions } from '@/lib/exportPagePlan';
import type { ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

const MIN_BREAK_GAP = 40;

interface PageBreakEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateElement?: HTMLElement | null;
  resumeData?: ResumeData | null;
}

export function PageBreakEditorDialog({
  open,
  onOpenChange,
  templateElement,
  resumeData,
}: PageBreakEditorDialogProps) {
  const updateResume = useResumeStore((s) => s.updateResume);
  const cloneContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [totalHeight, setTotalHeight] = useState(0);
  const [suggestedBreaks, setSuggestedBreaks] = useState<number[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragStartRef = useRef<{ clientY: number; breakY: number } | null>(null);

  const pageFormat = resumeData?.customization?.pageFormat ?? 'letter';
  const pageDims = useMemo(() => getPageDimensionsForFormat(pageFormat), [pageFormat]);

  const customBreaks = useMemo(
    () =>
      normalizeBreakPositions(
        resumeData?.customization?.customBreakPositions,
        totalHeight || 1,
        MIN_BREAK_GAP,
      ),
    [resumeData?.customization?.customBreakPositions, totalHeight],
  );
  const activeBreaks = customBreaks.length > 0 ? customBreaks : suggestedBreaks;

  // Natural template width (letter=816px, A4=794px)
  const templateNaturalWidth = templateElement?.scrollWidth || pageDims.pageWidth;
  const scale = containerWidth > 0 ? containerWidth / templateNaturalWidth : 1;
  const scaledHeight = totalHeight * scale;

  const persistBreaks = useCallback(
    (positions: number[]) => {
      if (!resumeData) return;
      const normalized = normalizeBreakPositions(positions, totalHeight || 1, MIN_BREAK_GAP);
      updateResume({
        customization: {
          ...resumeData.customization,
          customBreakPositions: normalized,
        } as typeof resumeData.customization,
      });
    },
    [resumeData, totalHeight, updateResume],
  );

  // Clone the live template into the dialog on open
  useEffect(() => {
    if (!open || !cloneContainerRef.current || !templateElement) return;

    const container = cloneContainerRef.current;
    container.innerHTML = '';

    const clone = templateElement.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    clone.style.width = `${templateNaturalWidth}px`;
    clone.style.pointerEvents = 'none';
    clone.style.userSelect = 'none';
    container.appendChild(clone);

    const height = templateElement.scrollHeight;
    setTotalHeight(height);

    const smart = computePreviewBreaks(templateElement, pageDims.pageWidth, pageDims.pageHeight);
    const normalized = normalizeBreakPositions(smart, height || 1, MIN_BREAK_GAP);
    setSuggestedBreaks(normalized);

    // Auto-seed smart breaks if none are saved yet
    if (!resumeData?.customization?.customBreakPositions?.length && normalized.length > 0) {
      updateResume({
        customization: {
          ...resumeData?.customization,
          customBreakPositions: normalized,
        } as NonNullable<ResumeData['customization']>,
      });
    }
  }, [open, templateElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure container width after dialog mounts
  useEffect(() => {
    if (!open || !scrollContainerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(scrollContainerRef.current);
    return () => ro.disconnect();
  }, [open]);

  // Global pointer move/up for dragging
  useEffect(() => {
    if (draggingIndex === null) return;

    const onMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const delta = (e.clientY - dragStartRef.current.clientY) / scale;
      const newY = Math.round(dragStartRef.current.breakY + delta);
      const next = [...activeBreaks];
      next[draggingIndex] = newY;
      persistBreaks(next);
    };

    const onUp = () => {
      setDraggingIndex(null);
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingIndex, scale, activeBreaks, persistBreaks]);

  const handleBreakPointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { clientY: e.clientY, breakY: activeBreaks[index] };
    setDraggingIndex(index);
  };

  const addBreak = () => {
    const last = activeBreaks[activeBreaks.length - 1] ?? 0;
    const candidate = Math.round(last + pageDims.pageHeight * 0.9);
    const clamped = Math.min(candidate, Math.max(MIN_BREAK_GAP, totalHeight - MIN_BREAK_GAP));
    persistBreaks([...activeBreaks, clamped]);
  };

  const removeBreak = (index: number) => {
    persistBreaks(activeBreaks.filter((_, i) => i !== index));
  };

  const pageCount = activeBreaks.length + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4 text-primary shrink-0" />
            Page Break Editor
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Drag the red lines to set exactly where each page ends. Changes save automatically.
          </p>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-muted/40 shrink-0">
          <span className="text-sm font-medium tabular-nums">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </span>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={addBreak} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add break
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => persistBreaks(suggestedBreaks)}
              disabled={suggestedBreaks.length === 0}
              className="h-7 text-xs gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Smart reset
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => persistBreaks([])}
              disabled={activeBreaks.length === 0}
              className={cn('h-7 text-xs text-muted-foreground', activeBreaks.length === 0 && 'opacity-40')}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5" ref={scrollContainerRef}>
          {/* Resume preview with overlaid break lines */}
          <div
            className="relative rounded-lg border border-border overflow-hidden bg-white shadow-sm"
            style={{ height: scaledHeight > 0 ? scaledHeight : 400 }}
          >
            {/* Scaled clone of the actual resume */}
            <div
              ref={cloneContainerRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: templateNaturalWidth,
              }}
            />

            {/* Page boundary rulers */}
            {activeBreaks.map((_, index) => {
              const pageEndY = pageDims.pageHeight * (index + 1) * scale;
              return (
                <div
                  key={`ruler-${index}`}
                  className="absolute inset-x-0 border-t border-dashed border-muted-foreground/20 pointer-events-none"
                  style={{ top: pageEndY }}
                />
              );
            })}

            {/* Draggable break lines */}
            {activeBreaks.map((breakY, index) => (
              <div
                key={`break-${index}`}
                className={cn(
                  'absolute inset-x-0 group z-20',
                  draggingIndex === index ? 'cursor-grabbing' : 'cursor-row-resize',
                )}
                style={{ top: Math.max(0, breakY * scale - 10), height: 20 }}
                onPointerDown={(e) => handleBreakPointerDown(e, index)}
              >
                {/* The visible line */}
                <div className="absolute inset-x-0 top-[10px] h-[2px] bg-destructive group-hover:bg-destructive/80 transition-colors" />

                {/* Label + remove */}
                <div className="absolute left-3 top-[2px] flex items-center gap-1.5 select-none">
                  <span className="rounded bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white leading-4 whitespace-nowrap">
                    Page {index + 1} / {index + 2}
                  </span>
                  <button
                    type="button"
                    className="rounded bg-destructive/80 hover:bg-destructive text-white leading-4 px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeBreak(index)}
                    aria-label={`Remove break ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {activeBreaks.length === 0 && scaledHeight > 0 && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] text-muted-foreground">
                  This CV fits on one page · Add a break to split into multiple pages
                </span>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground text-center">
            Drag red lines to adjust cuts · Scroll to see the full CV below
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
