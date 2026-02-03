import { cn } from '@/lib/utils';
import { findSmartBreakPositions } from '@/lib/pdfGenerator';
import { useState, useEffect, RefObject } from 'react';

// PDF dimensions (must match pdfGenerator.ts)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44;
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT;

interface PageBreakIndicatorProps {
  templateRef?: RefObject<HTMLElement>;
  manualBreakSections?: string[];
  className?: string;
}

export function PageBreakIndicator({ 
  templateRef,
  manualBreakSections,
  className 
}: PageBreakIndicatorProps) {
  const [breaks, setBreaks] = useState<number[]>([]);

  useEffect(() => {
    const element = templateRef?.current;
    if (!element) return;

    const calculateBreaks = () => {
      // Use the SAME dimension logic as generatePDF for WYSIWYG accuracy
      const containerWidth = element.offsetWidth || PAGE_WIDTH;
      const containerHeight = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;
      
      const scaleFactor = PAGE_WIDTH / containerWidth;
      // Account for footer space - matches PDF generator
      const sourceHeightPerPage = PRINTABLE_HEIGHT / scaleFactor;

      const newBreaks = findSmartBreakPositions(
        element,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections
      );
      
      setBreaks(newBreaks);
    };

    // Calculate initially
    calculateBreaks();

    // Re-calculate when content changes
    const observer = new ResizeObserver(calculateBreaks);
    observer.observe(element);

    return () => observer.disconnect();
  }, [templateRef, manualBreakSections]);

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
