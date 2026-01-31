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
  className?: string;
}

export function PageBreakIndicator({ 
  containerWidth, 
  containerHeight,
  templateRef,
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
        containerHeight
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
  }, [containerWidth, containerHeight, templateRef]);

  if (breaks.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {breaks.map((breakPosition, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 flex items-center gap-2 z-10"
          style={{ top: `${breakPosition}px` }}
        >
          <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
          <span className="px-2 py-0.5 text-xs font-medium text-orange-600 bg-orange-100 rounded-full whitespace-nowrap shadow-sm">
            Page {index + 1} ends
          </span>
          <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
        </div>
      ))}
    </div>
  );
}
