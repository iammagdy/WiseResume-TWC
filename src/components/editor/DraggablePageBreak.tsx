import { useRef, useState, useCallback, memo } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggablePageBreakProps {
  position: number;
  index: number;
  type: 'manual' | 'auto';
  minY: number;
  maxY: number;
  onDragEnd: (index: number, newPosition: number) => void;
}

export const DraggablePageBreak = memo(function DraggablePageBreak({
  position,
  index,
  type,
  minY,
  maxY,
  onDragEnd,
}: DraggablePageBreakProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentY, setCurrentY] = useState(position);
  const startY = useRef(0);
  const startPos = useRef(position);

  // Sync position from parent when not dragging
  const displayY = isDragging ? currentY : position;

  const clamp = useCallback((val: number) => Math.max(minY, Math.min(maxY, val)), [minY, maxY]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startY.current = e.clientY;
    startPos.current = position;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientY - startY.current;
    setCurrentY(clamp(startPos.current + delta));
  }, [isDragging, clamp]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = e.clientY - startY.current;
    const finalPos = clamp(startPos.current + delta);
    onDragEnd(index, finalPos);
  }, [isDragging, clamp, index, onDragEnd]);

  return (
    <div
      className="absolute left-0 right-0 z-20"
      style={{ top: `${displayY}px` }}
    >
      <div className={cn(
        "flex items-center gap-0 transition-all",
        isDragging && "scale-y-110"
      )}>
        {/* Left line */}
        <div className={cn(
          "flex-1 transition-all",
          isDragging
            ? "h-1 bg-gradient-to-r from-transparent via-primary to-primary"
            : type === 'manual'
              ? "h-0.5 bg-gradient-to-r from-transparent via-primary to-primary"
              : "h-0.5 border-t-2 border-dashed border-amber-500/60"
        )} />

        {/* Drag handle */}
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg cursor-grab active:cursor-grabbing touch-manipulation select-none transition-all min-h-[44px]",
            isDragging
              ? "bg-primary text-primary-foreground scale-110 shadow-xl ring-2 ring-primary/30"
              : type === 'manual'
                ? "bg-primary text-primary-foreground"
                : "bg-amber-100 text-amber-700"
          )}
          aria-label={`Drag to adjust page ${index + 1} break position`}
        >
          <GripHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold whitespace-nowrap">
            Page {index + 1} ends here
          </span>
        </button>

        {/* Right line */}
        <div className={cn(
          "flex-1 transition-all",
          isDragging
            ? "h-1 bg-gradient-to-l from-transparent via-primary to-primary"
            : type === 'manual'
              ? "h-0.5 bg-gradient-to-l from-transparent via-primary to-primary"
              : "h-0.5 border-t-2 border-dashed border-amber-500/60"
        )} />
      </div>

      {/* Visual separator when dragging */}
      {isDragging && (
        <div className="h-6 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
});
