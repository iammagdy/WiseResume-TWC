import { useEffect, useRef, useState } from 'react';
import { cloneResumeTemplateElement } from '@/lib/exportDomUtils';
import { computeDialogPreviewScale } from '@/lib/pageBreakPreviewScale';

interface PageBreakDialogPreviewProps {
  templateElement: HTMLElement | null;
  breakYs: number[];
  maxPreviewHeight?: number;
}

function measureTemplateHeight(templateElement: HTMLElement, clone: HTMLElement): number {
  return Math.max(
    templateElement.scrollHeight,
    templateElement.offsetHeight,
    templateElement.clientHeight,
    clone.scrollHeight,
    clone.offsetHeight,
    100,
  );
}

export function PageBreakDialogPreview({
  templateElement,
  breakYs,
  maxPreviewHeight = 320,
}: PageBreakDialogPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [layout, setLayout] = useState<{
    scale: number;
    contentHeight: number;
    designWidth: number;
    visualHeight: number;
  } | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      setContainerWidth(Math.max(viewport.clientWidth, 1));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [templateElement]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !templateElement || containerWidth <= 0) {
      setLayout(null);
      mount?.replaceChildren();
      return;
    }

    let cancelled = false;

    const paint = () => {
      if (cancelled || !mountRef.current) return;

      const designWidth = templateElement.offsetWidth || 612;
      const clone = cloneResumeTemplateElement(templateElement, designWidth);
      const contentHeight = measureTemplateHeight(templateElement, clone);
      const { scale, visualHeight } = computeDialogPreviewScale(
        containerWidth,
        designWidth,
        contentHeight,
      );

      const host = document.createElement('div');
      host.style.position = 'relative';
      host.style.width = `${containerWidth}px`;
      host.style.height = `${visualHeight}px`;

      const pageBounds = [0, ...breakYs, contentHeight];
      for (let i = 0; i < pageBounds.length - 1; i++) {
        const top = pageBounds[i] * scale;
        const height = (pageBounds[i + 1] - pageBounds[i]) * scale;
        const band = document.createElement('div');
        band.setAttribute('data-pdf-exclude', '');
        band.style.position = 'absolute';
        band.style.left = '0';
        band.style.width = '100%';
        band.style.top = `${top}px`;
        band.style.height = `${height}px`;
        band.style.background = i % 2 === 1 ? 'rgba(0,0,0,0.03)' : 'transparent';
        band.style.pointerEvents = 'none';
        host.appendChild(band);
      }

      const content = document.createElement('div');
      content.style.position = 'absolute';
      content.style.top = '0';
      content.style.left = '0';
      content.style.width = `${designWidth}px`;
      content.style.height = `${contentHeight}px`;
      content.style.transformOrigin = 'top left';
      content.style.transform = `scale(${scale})`;
      content.appendChild(clone);
      host.appendChild(content);

      mountRef.current.replaceChildren(host);
      setLayout({ scale, contentHeight, designWidth, visualHeight });
    };

    paint();
    const raf = requestAnimationFrame(() => requestAnimationFrame(paint));
    const observer = new ResizeObserver(paint);
    observer.observe(templateElement);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      mount.replaceChildren();
    };
  }, [templateElement, containerWidth, breakYs.join(','), maxPreviewHeight]);

  if (!templateElement) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
        Resume preview is not ready. Wait for the live preview to load, then try again.
      </p>
    );
  }

  const scale = layout?.scale ?? (containerWidth > 0 ? containerWidth / 612 : 0.5);
  const visualHeight = layout?.visualHeight ?? 120;
  const visualWidth = containerWidth > 0 ? containerWidth : '100%';

  return (
    <div
      ref={viewportRef}
      className="w-full rounded-lg border border-border bg-muted/30 overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: maxPreviewHeight }}
    >
      <div
        className="relative mx-auto"
        style={{ width: visualWidth, minHeight: layout ? visualHeight : 120 }}
      >
        <div ref={mountRef} className="relative" />
        {!layout && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Loading preview…
          </div>
        )}
        {layout && breakYs.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            aria-hidden
            data-pdf-exclude
          >
            {breakYs.map((breakY, index) => (
              <div
                key={`dialog-break-${breakY}-${index}`}
                className="absolute inset-x-0 border-t-2 border-primary"
                style={{ top: `${breakY * scale}px` }}
              >
                <span className="absolute left-1 -translate-y-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                  P{index + 2}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
