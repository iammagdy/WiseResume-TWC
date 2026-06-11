import { memo, useEffect, useRef, useState, Suspense, useCallback } from 'react';
import type { ResumeData, TemplateId } from '@/types/resume';
import templateComponents from '@/components/templates/registry';
import { migrateTemplateId } from '@/lib/templateMigration';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const PAGE_WIDTH = 612;
const MIN_PAGE_HEIGHT = 792;

export interface ResumeDocumentLayout {
  /** Scaled height in pixels (what the parent should allocate). */
  scaledHeight: number;
  /** Unscaled content height in design pixels. */
  contentHeight: number;
  scale: number;
  width: number;
}

interface ScaledResumePageProps {
  resume: ResumeData;
  templateId: TemplateId;
  className?: string;
  innerClassName?: string;
  onMount?: (root: HTMLElement | null) => void;
  onLayout?: (layout: ResumeDocumentLayout) => void;
  /** Extra uniform scale for compare sync (1 = default). */
  extraScale?: number;
  /** Pad container to this height (white space below shorter CVs). */
  minContainerHeight?: number;
  /** Skip letter-page min height (section-only previews). */
  compact?: boolean;
}

function PageSkeleton() {
  return (
    <div className="w-full min-h-[792px] bg-white p-8 space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full mt-4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export const ScaledResumePage = memo(function ScaledResumePage({
  resume,
  templateId,
  className,
  innerClassName,
  onMount,
  onLayout,
  extraScale = 1,
  minContainerHeight = 0,
  compact = false,
}: ScaledResumePageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(MIN_PAGE_HEIGHT);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const width = container.offsetWidth;
    const baseScale = width > 0 ? width / PAGE_WIDTH : 1;
    const naturalHeight = compact
      ? inner.offsetHeight
      : Math.max(MIN_PAGE_HEIGHT, inner.offsetHeight);
    setScale(baseScale);
    setContentHeight(naturalHeight);
    onLayout?.({
      scaledHeight: naturalHeight * baseScale,
      contentHeight: naturalHeight,
      scale: baseScale,
      width,
    });
  }, [onLayout]);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [compact, measure, resume, templateId, extraScale]);

  useEffect(() => {
    onMount?.(innerRef.current);
  }, [onMount, resume, templateId, scale, contentHeight]);

  const safeId: TemplateId = templateComponents[templateId] ? templateId : migrateTemplateId(templateId);
  const TemplateComponent = templateComponents[safeId] ?? templateComponents['modern'];
  const effectiveScale = scale * extraScale;
  const scaledHeight = contentHeight * effectiveScale;
  const containerHeight = Math.max(scaledHeight, minContainerHeight);

  return (
    <div
      ref={containerRef}
      className={cn('jmw-scaled-page', className)}
      style={{ height: containerHeight, minHeight: minContainerHeight || undefined }}
    >
      <div
        ref={innerRef}
        className={cn('jmw-scaled-page__inner origin-top-left bg-white', innerClassName)}
        style={{
          width: PAGE_WIDTH,
          minHeight: compact ? undefined : MIN_PAGE_HEIGHT,
          transform: `scale(${effectiveScale})`,
        }}
      >
        <Suspense fallback={<PageSkeleton />}>
          <TemplateComponent resume={resume} accentColor={resume.customization?.accentColor} />
        </Suspense>
      </div>
    </div>
  );
});
