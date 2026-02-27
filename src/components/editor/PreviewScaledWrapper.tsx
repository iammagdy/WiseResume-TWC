import { RefObject, useEffect, useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

const PDF_WIDTH = 612;

interface PreviewScaledWrapperProps {
  resumeRef: RefObject<HTMLDivElement>;
  scrollContainerRef: RefObject<HTMLDivElement>;
  isGenerating: boolean;
  previewScale: number;
  setPreviewScale: (scale: number) => void;
  children: ReactNode;
}

/**
 * Renders children (the resume template) at a fixed 612px width,
 * then CSS-scales it to fit the available container width.
 * This ensures the preview is pixel-identical to the PDF output.
 */
export function PreviewScaledWrapper({
  resumeRef,
  scrollContainerRef,
  isGenerating,
  previewScale,
  setPreviewScale,
  children,
}: PreviewScaledWrapperProps) {
  const [templateHeight, setTemplateHeight] = useState(792);

  // Measure container width and compute scale
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      const padding = 16; // p-1 sm:p-4, use small padding
      const available = container.clientWidth - padding * 2;
      setPreviewScale(Math.min(1, available / PDF_WIDTH));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [scrollContainerRef, setPreviewScale]);

  // Track template height for wrapper sizing
  useEffect(() => {
    const el = resumeRef.current;
    if (!el) return;

    const updateHeight = () => {
      setTemplateHeight(el.scrollHeight || el.offsetHeight || 792);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [resumeRef]);

  const displayScale = isGenerating ? 1 : previewScale;
  const wrapperHeight = templateHeight * displayScale;

  return (
    <div
      className="mx-auto relative"
      style={{
        width: `${PDF_WIDTH * displayScale}px`,
        height: `${wrapperHeight}px`,
      }}
    >
      <motion.div
        ref={resumeRef}
        data-resume-template
        data-capturing={isGenerating ? 'true' : undefined}
        className="bg-white text-black shadow-2xl relative"
        style={{
          width: `${PDF_WIDTH}px`,
          minHeight: '792px',
          transform: `scale(${displayScale})`,
          transformOrigin: 'top left',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
