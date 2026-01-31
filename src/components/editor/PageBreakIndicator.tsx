import { cn } from '@/lib/utils';

// PDF dimensions (must match pdfGenerator.ts)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

interface PageBreakIndicatorProps {
  containerWidth: number;
  containerHeight: number;
  className?: string;
}

export function PageBreakIndicator({ 
  containerWidth, 
  containerHeight,
  className 
}: PageBreakIndicatorProps) {
  // Calculate page breaks using same math as PDF generator
  const scaleFactor = PAGE_WIDTH / containerWidth;
  const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;
  
  // Generate break positions
  const breaks: number[] = [];
  let position = sourceHeightPerPage;
  
  while (position < containerHeight) {
    breaks.push(position);
    position += sourceHeightPerPage;
  }

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
