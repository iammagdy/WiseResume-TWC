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

  // Memoized calculation function
  const calculateBreaks = useCallback(() => {
    const element = templateRef?.current;
    if (!element || !shouldShowIndicators) {
      setBreaks([]);
      return;
    }

    // If using custom dragged positions, use them directly (already in 612px space)
    if (useCustomPositions) {
      setBreaks(customBreakPositions!.map((pos) => ({
        position: pos,
        type: 'manual' as const,
      })));
      return;
    }

    // Use requestAnimationFrame to ensure layout is stable
    requestAnimationFrame(() => {
      const containerHeight = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;

      // Template is always rendered at 612px, so scaleFactor = 1.0
      const sourceHeightPerPage = PRINTABLE_HEIGHT;

      // SINGLE-PAGE GUARD
      const isSinglePage = containerHeight <= sourceHeightPerPage * 1.05;
      
      if (isSinglePage && !manualBreakSections?.length) {
        setBreaks([]);
        return;
      }

      // Calculate breaks — positions are in 612px PDF coordinate space (same as preview)
      const newBreaks = findSmartBreakPositionsTagged(
        element,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections,
        templateConfig
      );

      setBreaks(newBreaks);
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

  // Handle drag end — positions are already in 612px PDF coordinates
  const handleDragEnd = useCallback((index: number, newPosition: number) => {
    const newPositions = breaks.map((b, i) => {
      return i === index ? newPosition : b.position;
    });
    newPositions.sort((a, b) => a - b);
    onBreakPositionChange?.(newPositions);
  }, [breaks, onBreakPositionChange]);

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
