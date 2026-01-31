import { cn } from '@/lib/utils';
import { findSmartBreakPositions } from '@/lib/pdfGenerator';
import { useMemo, RefObject } from 'react';

// PDF dimensions (must match pdfGenerator.ts)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

interface PageBreakIndicatorProps {
  containerWidth: number;
  containerHeight: number;
  templateRef?: RefObject<HTMLElement>;
  manualBreakSections?: string[];
  className?: string;
}

export function PageBreakIndicator({ 
  containerWidth, 
  containerHeight,
  templateRef,
  manualBreakSections,
  className 
}: PageBreakIndicatorProps) {
  const breaks = useMemo(() => {
    // Calculate scale factor and source height per page
    const scaleFactor = PAGE_WIDTH / containerWidth;
    const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;
    
    // If we have a template ref, use smart breaks
    if (templateRef?.current) {
      return findSmartBreakPositions(
        templateRef.current,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections
      );
    }
    
    // Fallback to fixed breaks
    const fixedBreaks: number[] = [];
    let position = sourceHeightPerPage;
    
    while (position < containerHeight) {
      fixedBreaks.push(position);
      position += sourceHeightPerPage;
    }
    
    return fixedBreaks;
  }, [containerWidth, containerHeight, templateRef, manualBreakSections]);

  // Different styling for manual vs auto breaks
  const isManualMode = manualBreakSections && manualBreakSections.length > 0;

  if (breaks.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {breaks.map((breakPosition, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 flex items-center gap-2 z-10"
          style={{ top: `${breakPosition}px` }}
        >
          <div className={cn(
            "flex-1 border-t-2 border-dashed",
            isManualMode ? "border-blue-400/60" : "border-orange-400/60"
          )} />
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shadow-sm",
            isManualMode 
              ? "text-blue-600 bg-blue-100" 
              : "text-orange-600 bg-orange-100"
          )}>
            Page {index + 1} ends
          </span>
          <div className={cn(
            "flex-1 border-t-2 border-dashed",
            isManualMode ? "border-blue-400/60" : "border-orange-400/60"
          )} />
        </div>
      ))}
    </div>
  );
}
