import { memo } from 'react';
import { cn } from '@/lib/utils';

interface HeroAtsScoreRingProps {
  score: number;
  size?: number;
  isLoading?: boolean;
  className?: string;
}

/** Large conic ATS ring for dashboard spotlight hero (Atlas visual reference). */
export const HeroAtsScoreRing = memo(function HeroAtsScoreRing({
  score,
  size = 88,
  isLoading = false,
  className,
}: HeroAtsScoreRingProps) {
  const inner = Math.round(size * 0.72);
  const scoreTextClass = size >= 100 ? 'text-[28px]' : size >= 80 ? 'text-xl' : 'text-lg';
  const clamped = Math.min(100, Math.max(0, score));
  const fillColor =
    clamped >= 80
      ? 'hsl(var(--success))'
      : clamped >= 60
        ? 'hsl(var(--warning))'
        : 'hsl(var(--primary))';

  const ariaLabel = isLoading
    ? 'ATS match: calculating'
    : `ATS match: ${clamped} out of 100`;

  return (
    <div
      className={cn('relative shrink-0 mx-auto', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="rounded-full flex items-center justify-center shadow-soft-lg"
        style={{
          width: size,
          height: size,
          background: isLoading
            ? `conic-gradient(hsl(var(--muted)) 0 100%)`
            : `conic-gradient(${fillColor} 0 ${clamped}%, hsl(var(--primary) / 0.18) ${clamped}% 100%)`,
        }}
      >
        <div
          className="rounded-full bg-card border border-border flex flex-col items-center justify-center text-center shadow-inner"
          style={{ width: inner, height: inner }}
        >
          {isLoading ? (
            <span className={cn(scoreTextClass, 'font-bold text-muted-foreground animate-pulse')}>—</span>
          ) : (
            <>
              <span className={cn(scoreTextClass, 'font-bold leading-none tabular-nums text-foreground')}>
                {clamped}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">ATS</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
