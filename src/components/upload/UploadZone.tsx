import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

interface UploadZoneProps extends HTMLMotionProps<"div"> {
  isDragging?: boolean;
  isProcessing?: boolean;
  onUploadClick?: () => void;
}

export function UploadZone({
  isDragging,
  isProcessing,
  onUploadClick,
  className,
  children,
  ...props
}: UploadZoneProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isProcessing) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onUploadClick?.();
    }
  };

  const handleClick = () => {
    if (!isProcessing) {
      onUploadClick?.();
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={isProcessing ? -1 : 0}
      aria-disabled={isProcessing}
      aria-label="Upload resume file"
      aria-busy={isProcessing}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={cn(
        "flex-1 min-h-[240px] sm:min-h-[280px] rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 sm:p-8 cursor-pointer outline-none bg-card shadow-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDragging
          ? 'border-primary bg-primary/10 shadow-soft-md ring-2 ring-primary/25 scale-[1.01]'
          : 'border-border hover:border-primary/40 hover:shadow-soft-md',
        isProcessing ? 'pointer-events-none opacity-80' : '',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
