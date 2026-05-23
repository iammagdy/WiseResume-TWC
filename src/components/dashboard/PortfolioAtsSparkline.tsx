import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PortfolioAtsChartPoint } from '@/components/dashboard/dashboardMetricsUtils';

interface PortfolioAtsSparklineProps {
  points: PortfolioAtsChartPoint[];
  className?: string;
}

/** Real portfolio ATS scores on a fixed 0–100 scale (no axis labels). */
export const PortfolioAtsSparkline = memo(function PortfolioAtsSparkline({
  points,
  className,
}: PortfolioAtsSparklineProps) {
  const path = useMemo(() => {
    if (points.length < 2) return null;

    const w = 88;
    const h = 36;
    const padX = 2;
    const padY = 4;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const coords = points.map((p, i) => {
      const x = padX + (i / (points.length - 1)) * innerW;
      const clamped = Math.min(100, Math.max(0, p.score));
      const y = padY + innerH - (clamped / 100) * innerH;
      return { x, y };
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${h - padY} L ${coords[0].x.toFixed(1)} ${h - padY} Z`;

    return { line, area, w, h, last: points[points.length - 1].score };
  }, [points]);

  if (!path) return null;

  return (
    <div
      className={cn('portfolio-ats-sparkline shrink-0', className)}
      role="img"
      aria-label={`ATS portfolio trend, latest ${path.last}%`}
    >
      <svg width={path.w} height={path.h} viewBox={`0 0 ${path.w} ${path.h}`} className="block overflow-visible">
        <defs>
          <linearGradient id="atsSparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={path.area} fill="url(#atsSparkFill)" />
        <path
          d={path.line}
          fill="none"
          stroke="hsl(38 92% 50%)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
