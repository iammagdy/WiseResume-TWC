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
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={cn(
        "flex-1 min-h-[280px] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50',
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
