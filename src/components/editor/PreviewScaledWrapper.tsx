import { RefObject, useEffect, useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

const PDF_WIDTH = 612;

interface PreviewScaledWrapperProps {
  resumeRef: RefObject<HTMLDivElement>;
  scrollContainerRef: RefObject<HTMLDivElement>;
  isGenerating: boolean;
  previewScale: number;
  setPreviewScale: (scale: number) => void;
  pageWidth?: number;
  pageHeight?: number;
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
  pageWidth = PDF_WIDTH,
  pageHeight = 792,
  children,
}: PreviewScaledWrapperProps) {
  const [templateHeight, setTemplateHeight] = useState(pageHeight);

  // Measure container width and compute scale
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      const padding = 16; // p-1 sm:p-4, use small padding
      const available = container.clientWidth - padding * 2;
      setPreviewScale(Math.min(1, available / pageWidth));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [pageWidth, scrollContainerRef, setPreviewScale]);

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
        width: `${pageWidth * displayScale}px`,
        height: `${wrapperHeight}px`,
      }}
    >
      <motion.div
        ref={resumeRef}
        data-resume-template
        data-capturing={isGenerating ? 'true' : undefined}
        className="bg-white text-black shadow-2xl relative"
        style={{
          width: `${pageWidth}px`,
          minHeight: `${pageHeight}px`,
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
