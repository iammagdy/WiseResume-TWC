import { cn } from '@/lib/utils';
import { findSmartBreakPositions } from '@/lib/pdfGenerator';
import { useState, useEffect, RefObject, useMemo } from 'react';
import { TemplateConfig } from '@/lib/templateConfig';

// PDF dimensions (must match pdfGenerator.ts)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44;
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT;

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
  const [breaks, setBreaks] = useState<number[]>([]);

  // Create a stable key that changes when manual break sections change
  // This forces the effect to re-run and recreate the observer with fresh closures
  const breakKey = useMemo(() => 
    manualBreakSections?.join(',') || 'auto', 
    [manualBreakSections]
  );

  const isManualMode = manualBreakSections && manualBreakSections.length > 0;
  
  // Don't show indicators for fixed-sidebar templates (single-page optimized)
  const shouldShowIndicators = !templateConfig?.singlePageOptimized;

  useEffect(() => {
    // Skip if template doesn't support page breaks
    if (!shouldShowIndicators) {
      setBreaks([]);
      return;
    }
    
    const element = templateRef?.current;
    if (!element) return;

    const calculateBreaks = () => {
      // Use the SAME dimension logic as generatePDF for WYSIWYG accuracy
      const containerWidth = element.offsetWidth || PAGE_WIDTH;
      const containerHeight = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;
      
      const scaleFactor = PAGE_WIDTH / containerWidth;
      // Account for footer space - matches PDF generator
      const sourceHeightPerPage = PRINTABLE_HEIGHT / scaleFactor;

      // Pass the current manualBreakSections (captured fresh via breakKey dependency)
      const newBreaks = findSmartBreakPositions(
        element,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections,
        templateConfig
      );
      
      setBreaks(newBreaks);
    };

    // Calculate immediately when settings change
    calculateBreaks();

    // Re-calculate when content resizes
    const observer = new ResizeObserver(calculateBreaks);
    observer.observe(element);

    return () => observer.disconnect();
  }, [templateRef, breakKey, manualBreakSections, shouldShowIndicators, templateConfig]);

  // Don't render anything for single-page templates or if no breaks
  if (!shouldShowIndicators || breaks.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {breaks.map((breakPosition, index) => (
        <div
          key={`${breakKey}-${index}`}
          className="absolute left-0 right-0 z-10"
          style={{ top: `${breakPosition}px` }}
        >
          {isManualMode ? (
            // Enhanced visual for manual breaks
            <>
              {/* Gradient page boundary line */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
              
              {/* Page end badge */}
              <div className="flex justify-center -mt-3">
                <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                  📄 Page {index + 1} ends here
                </span>
              </div>
              
              {/* Visual separator space */}
              <div className="h-4 bg-gradient-to-b from-blue-100/30 to-transparent" />
            </>
          ) : (
            // Original dashed line for auto breaks
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
              <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shadow-sm text-orange-600 bg-orange-100">
                Page {index + 1} ends
              </span>
              <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
