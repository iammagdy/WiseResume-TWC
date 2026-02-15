import { cn } from '@/lib/utils';
import { findSmartBreakPositionsTagged, TaggedBreakPosition } from '@/lib/pdfGenerator';
import { useState, useEffect, RefObject, useMemo, useCallback, useRef } from 'react';
import { TemplateConfig } from '@/lib/templateConfig';

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
  templateConfig?: TemplateConfig;
  className?: string;
}

export function PageBreakIndicator({ 
  templateRef,
  manualBreakSections,
  templateConfig,
  className 
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

  // Memoized calculation function with debouncing
  const calculateBreaks = useCallback(() => {
    const element = templateRef?.current;
    if (!element || !shouldShowIndicators) {
      setBreaks([]);
      return;
    }

    // Use requestAnimationFrame to ensure layout is stable
    requestAnimationFrame(() => {
      const containerWidth = element.offsetWidth || PAGE_WIDTH;
      const containerHeight = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;
      
      const scaleFactor = PAGE_WIDTH / containerWidth;
      // Account for footer space - matches PDF generator
      const sourceHeightPerPage = PRINTABLE_HEIGHT / scaleFactor;

      // SINGLE-PAGE GUARD: Don't show any breaks if content fits on one page
      const isSinglePage = containerHeight <= sourceHeightPerPage * 1.05;
      
      if (isSinglePage && !manualBreakSections?.length) {
        setBreaks([]);
        return;
      }

      const newBreaks = findSmartBreakPositionsTagged(
        element,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections,
        templateConfig
      );
      
      setBreaks(newBreaks);
    });
  }, [templateRef, manualBreakSections, shouldShowIndicators, templateConfig]);

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

  // Don't render anything for single-page templates or if no breaks
  if (!shouldShowIndicators || breaks.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {breaks.map((breakItem, index) => (
        <div
          key={`${breakKey}-${index}`}
          className="absolute left-0 right-0 z-10"
          style={{ top: `${breakItem.position}px` }}
        >
          {breakItem.type === 'manual' ? (
            // Enhanced visual for manual breaks
            <>
              {/* Gradient page boundary line */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              {/* Page end badge */}
              <div className="flex justify-center -mt-3">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                  📄 Page {index + 1} ends here
                </span>
              </div>
              
              {/* Visual separator space */}
              <div className="h-4 bg-gradient-to-b from-primary/10 to-transparent" />
            </>
          ) : (
            // Subtle dashed line for auto breaks
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t-2 border-dashed border-amber-500/60" />
              <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shadow-sm text-amber-600 bg-amber-100">
                Page {index + 1} ends
              </span>
              <div className="flex-1 border-t-2 border-dashed border-amber-500/60" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
