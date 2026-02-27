import { cn } from '@/lib/utils';
import { findSmartBreakPositionsTagged, TaggedBreakPosition } from '@/lib/pdfGenerator';
import { useState, useEffect, RefObject, useMemo, useCallback, useRef } from 'react';
import { TemplateConfig } from '@/lib/templateConfig';
import { DraggablePageBreak } from './DraggablePageBreak';

// PDF dimensions (must match pdfGenerator.ts)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44;
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT;

// Debounce delay for stable measurements
const DEBOUNCE_MS = 150;

interface PageBreakIndicatorProps {
  templateRef?: RefObject<HTMLElement>;
  manualBreakSections?: string[];
  customBreakPositions?: number[];
  templateConfig?: TemplateConfig;
  className?: string;
  draggable?: boolean;
  onBreakPositionChange?: (positions: number[]) => void;
}

export function PageBreakIndicator({ 
  templateRef,
  manualBreakSections,
  customBreakPositions,
  templateConfig,
  className,
  draggable = false,
  onBreakPositionChange,
}: PageBreakIndicatorProps) {
  const [breaks, setBreaks] = useState<TaggedBreakPosition[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create a stable key that changes when manual break sections change
  const breakKey = useMemo(() => 
    manualBreakSections?.join(',') || 'auto', 
    [manualBreakSections]
  );

  // Don't show indicators for fixed-sidebar templates (single-page optimized)
  const shouldShowIndicators = !templateConfig?.singlePageOptimized && 
    templateConfig?.layout !== 'fixed-sidebar';

  // If custom positions are provided, use them directly
  const useCustomPositions = customBreakPositions && customBreakPositions.length > 0;

  // Memoized calculation function with debouncing
  const calculateBreaks = useCallback(() => {
    const element = templateRef?.current;
    if (!element || !shouldShowIndicators) {
      setBreaks([]);
      return;
    }

    // If using custom dragged positions (stored in 612px PDF coordinates), 
    // scale them to preview coordinates for display
    if (useCustomPositions) {
      const previewWidth = element.offsetWidth || PAGE_WIDTH;
      const displayScale = previewWidth / PAGE_WIDTH;
      setBreaks(customBreakPositions!.map((pos) => ({
        position: pos * displayScale,
        type: 'manual' as const,
      })));
      return;
    }

    // Use requestAnimationFrame to ensure layout is stable
    requestAnimationFrame(() => {
      const previewWidth = element.offsetWidth || PAGE_WIDTH;

      // === CRITICAL FIX: Measure at PDF width (612px) for accuracy ===
      // Save original styles
      const origWidth = element.style.width;
      const origMaxWidth = element.style.maxWidth;
      const origMinWidth = element.style.minWidth;

      // Force PDF width for measurement
      element.style.width = `${PAGE_WIDTH}px`;
      element.style.maxWidth = `${PAGE_WIDTH}px`;
      element.style.minWidth = `${PAGE_WIDTH}px`;

      // Force synchronous reflow at 612px
      const containerHeight612 = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;

      // At 612px width, scaleFactor is 1.0, so sourceHeightPerPage = PRINTABLE_HEIGHT
      const sourceHeightPerPage = PRINTABLE_HEIGHT;

      // SINGLE-PAGE GUARD: Don't show any breaks if content fits on one page
      const isSinglePage = containerHeight612 <= sourceHeightPerPage * 1.05;
      
      if (isSinglePage && !manualBreakSections?.length) {
        // Restore original styles
        element.style.width = origWidth;
        element.style.maxWidth = origMaxWidth;
        element.style.minWidth = origMinWidth;
        element.offsetHeight; // force reflow back
        setBreaks([]);
        return;
      }

      // Calculate breaks at 612px width — positions are now in PDF coordinate space
      const newBreaks612 = findSmartBreakPositionsTagged(
        element,
        sourceHeightPerPage,
        containerHeight612,
        manualBreakSections,
        templateConfig
      );

      // Restore original styles immediately
      element.style.width = origWidth;
      element.style.maxWidth = origMaxWidth;
      element.style.minWidth = origMinWidth;
      element.offsetHeight; // force reflow back to preview width

      // Scale break positions from 612px coordinates to preview coordinates
      const displayScale = previewWidth / PAGE_WIDTH;
      const scaledBreaks: TaggedBreakPosition[] = newBreaks612.map(b => ({
        position: b.position * displayScale,
        type: b.type,
      }));
      
      setBreaks(scaledBreaks);
    });
  }, [templateRef, manualBreakSections, shouldShowIndicators, templateConfig, useCustomPositions, customBreakPositions]);

  // Debounced version for ResizeObserver
  const debouncedCalculateBreaks = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(calculateBreaks, DEBOUNCE_MS);
  }, [calculateBreaks]);

  useEffect(() => {
    // Skip if template doesn't support page breaks
    if (!shouldShowIndicators) {
      setBreaks([]);
      return;
    }
    
    const element = templateRef?.current;
    if (!element) return;

    // Calculate immediately when settings change
    calculateBreaks();

    // Re-calculate when content resizes (with debounce for stability)
    const observer = new ResizeObserver(debouncedCalculateBreaks);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [templateRef, breakKey, shouldShowIndicators, calculateBreaks, debouncedCalculateBreaks]);

  // Handle drag end from DraggablePageBreak
  // Dragged position is in preview coordinates — scale to 612px PDF coordinates before storing
  const handleDragEnd = useCallback((index: number, newPosition: number) => {
    const element = templateRef?.current;
    const previewWidth = element?.offsetWidth || PAGE_WIDTH;
    const pdfScale = PAGE_WIDTH / previewWidth;

    const newPositions = breaks.map((b, i) => {
      const pos612 = i === index ? newPosition * pdfScale : b.position * pdfScale;
      return pos612;
    });
    // Sort positions to maintain order
    newPositions.sort((a, b) => a - b);
    onBreakPositionChange?.(newPositions);
  }, [breaks, onBreakPositionChange, templateRef]);

  // Don't render anything for single-page templates or if no breaks
  if (!shouldShowIndicators || breaks.length === 0) return null;

  // Get container height for drag bounds
  const containerHeight = templateRef?.current?.scrollHeight || templateRef?.current?.offsetHeight || PAGE_HEIGHT;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", draggable && "pointer-events-auto", className)}>
      {breaks.map((breakItem, index) => {
        if (draggable) {
          const minY = index === 0 ? 50 : breaks[index - 1].position + 50;
          const maxY = index === breaks.length - 1 ? containerHeight - 50 : breaks[index + 1].position - 50;

          return (
            <DraggablePageBreak
              key={`drag-${breakKey}-${index}`}
              position={breakItem.position}
              index={index}
              type={breakItem.type}
              minY={minY}
              maxY={maxY}
              onDragEnd={handleDragEnd}
            />
          );
        }

        return (
          <div
            key={`${breakKey}-${index}`}
            className="absolute left-0 right-0 z-10"
            style={{ top: `${breakItem.position}px` }}
          >
            {breakItem.type === 'manual' ? (
              <>
                <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="flex justify-center -mt-3">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                    📄 Page {index + 1} ends here
                  </span>
                </div>
                <div className="h-4 bg-gradient-to-b from-primary/10 to-transparent" />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t-2 border-dashed border-amber-500/60" />
                <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shadow-sm text-amber-600 bg-amber-100">
                  Page {index + 1} ends
                </span>
                <div className="flex-1 border-t-2 border-dashed border-amber-500/60" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
