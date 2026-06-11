import { useEffect, useRef, useState } from 'react';
import { cloneResumeTemplateElement } from '@/lib/exportDomUtils';
import { buildExportPageSegments } from '@/lib/exportPagePlan';
import { computeDialogPreviewScale, computeSpreadPreviewScale } from '@/lib/pageBreakPreviewScale';

interface PageBreakDialogPreviewProps {
  templateElement: HTMLElement | null;
  breakYs: number[];
  pageWidthPx?: number;
  pageHeightPx?: number;
  footerHeightPx?: number;
  maxPreviewHeight?: number;
  /** stack = vertical pages; spread = horizontal row (desktop). */
  layout?: 'stack' | 'spread';
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
  pageWidthPx = 612,
  pageHeightPx = 792,
  footerHeightPx = 44,
  maxPreviewHeight = 320,
  layout = 'stack',
}: PageBreakDialogPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [layoutMetrics, setLayoutMetrics] = useState<{
    scale: number;
    visualWidth: number;
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
      setLayoutMetrics(null);
      mount?.replaceChildren();
      return;
    }

    let cancelled = false;

    const paint = () => {
      if (cancelled || !mountRef.current) return;

      const designWidth = templateElement.offsetWidth || pageWidthPx;
      const clone = cloneResumeTemplateElement(templateElement, designWidth);
      const contentHeight = measureTemplateHeight(templateElement, clone);
      const printableHeight = Math.max(1, pageHeightPx - footerHeightPx);
      const segments = buildExportPageSegments({
        totalContentHeightPx: contentHeight,
        pageHeightPx: printableHeight,
        customBreakPositions: breakYs,
        breakValidationHeightPx: Math.max(
          templateElement.scrollHeight,
          templateElement.offsetHeight,
          contentHeight,
        ),
      });

      const useSpread = layout === 'spread' && segments.length > 1;
      const pageGapPx = useSpread ? 16 : 10;
      const pageBlockHeight = printableHeight + footerHeightPx;

      const { scale, visualWidth, visualHeight } = useSpread
        ? computeSpreadPreviewScale(
          containerWidth,
          designWidth,
          pageBlockHeight,
          segments.length,
          maxPreviewHeight,
          pageGapPx,
        )
        : computeDialogPreviewScale(
          containerWidth,
          designWidth,
          segments.reduce((sum, segment) => sum + segment.heightPx + footerHeightPx, 0),
        );

      const scaledGapPx = pageGapPx * Math.max(useSpread ? 1 : 0.75, scale);

      const host = document.createElement('div');
      host.style.position = 'relative';
      host.style.width = `${visualWidth}px`;
      host.style.height = `${visualHeight}px`;
      host.style.margin = '0 auto';

      let pageTop = 0;
      let pageLeft = 0;
      segments.forEach((segment) => {
        const page = document.createElement('div');
        page.setAttribute('data-pdf-exclude', '');
        page.style.position = 'absolute';
        page.style.left = `${pageLeft}px`;
        page.style.top = `${useSpread ? 0 : pageTop}px`;
        page.style.width = `${designWidth * scale}px`;
        page.style.height = `${(segment.heightPx + footerHeightPx) * scale}px`;
        page.style.background = '#fff';
        page.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08)';
        page.style.borderRadius = `${Math.max(2, 4 * scale)}px`;
        page.style.overflow = 'hidden';

        const clip = document.createElement('div');
        clip.style.position = 'relative';
        clip.style.width = `${designWidth * scale}px`;
        clip.style.height = `${segment.heightPx * scale}px`;
        clip.style.overflow = 'hidden';
        clip.style.background = '#fff';

        const source = document.createElement('div');
        source.style.position = 'absolute';
        source.style.top = `${-segment.startPx * scale}px`;
        source.style.left = '0';
        source.style.width = `${designWidth}px`;
        source.style.height = `${contentHeight}px`;
        source.style.transformOrigin = 'top left';
        source.style.transform = `scale(${scale})`;
        source.appendChild(cloneResumeTemplateElement(templateElement, designWidth));
        clip.appendChild(source);
        page.appendChild(clip);

        if (footerHeightPx > 0) {
          const footer = document.createElement('div');
          footer.style.height = `${footerHeightPx * scale}px`;
          footer.style.display = 'flex';
          footer.style.alignItems = 'center';
          footer.style.justifyContent = 'center';
          footer.style.font = `${Math.max(7, 9 * scale)}px Arial, sans-serif`;
          footer.style.color = '#737373';
          footer.style.background = '#fff';
          footer.textContent = `Page ${segment.index + 1} of ${segments.length} - Made with WiseResume`;
          page.appendChild(footer);
        }

        host.appendChild(page);
        if (useSpread) {
          pageLeft += designWidth * scale + scaledGapPx;
        } else {
          pageTop += (segment.heightPx + footerHeightPx) * scale + scaledGapPx;
        }
      });

      mountRef.current.replaceChildren(host);
      setLayoutMetrics({ scale, visualWidth, visualHeight });
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
  }, [
    templateElement,
    containerWidth,
    breakYs.join(','),
    pageWidthPx,
    pageHeightPx,
    footerHeightPx,
    maxPreviewHeight,
    layout,
  ]);

  if (!templateElement) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
        Resume preview is not ready. Wait for the live preview to load, then try again.
      </p>
    );
  }

  const visualHeight = layoutMetrics?.visualHeight ?? 120;
  const visualWidth = layoutMetrics?.visualWidth ?? containerWidth;

  return (
    <div
      ref={viewportRef}
      className="jmw-pdf-preview-viewport w-full overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: maxPreviewHeight }}
    >
      <div
        className="jmw-pdf-preview-stage relative mx-auto flex items-center justify-center"
        style={{
          width: '100%',
          minHeight: layoutMetrics ? visualHeight + 8 : 120,
        }}
      >
        <div ref={mountRef} className="relative" style={{ width: visualWidth, height: visualHeight }} />
        {!layoutMetrics && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Loading preview…
          </div>
        )}
      </div>
    </div>
  );
}
