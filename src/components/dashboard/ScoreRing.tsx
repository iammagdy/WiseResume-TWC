import { memo, useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

type ScoreTier = 'excellent' | 'good' | 'fair' | 'low';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  isLoading?: boolean;
  /** Accessible label prefix, e.g. "ATS match" */
  label?: string;
  /** Compact: `78%` centered. Labeled: large score + "ATS" caption (hero/dialog). */
  variant?: 'compact' | 'labeled';
  className?: string;
}

function getTier(score: number): ScoreTier {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
}

const TIER_THEME: Record<
  ScoreTier,
  { stroke: string; strokeEnd: string; text: string; glow: string }
> = {
  excellent: {
    stroke: 'hsl(142 71% 45%)',
    strokeEnd: 'hsl(158 64% 52%)',
    text: 'text-emerald-400',
    glow: 'hsl(142 71% 45% / 0.45)',
  },
  good: {
    stroke: 'hsl(38 92% 50%)',
    strokeEnd: 'hsl(45 96% 56%)',
    text: 'text-amber-400',
    glow: 'hsl(38 92% 50% / 0.4)',
  },
  fair: {
    stroke: 'hsl(32 95% 44%)',
    strokeEnd: 'hsl(38 92% 50%)',
    text: 'text-amber-500',
    glow: 'hsl(32 95% 44% / 0.35)',
  },
  low: {
    stroke: 'hsl(var(--primary))',
    strokeEnd: 'hsl(340 68% 52%)',
    text: 'text-primary',
    glow: 'hsl(var(--primary) / 0.4)',
  },
};

function strokeForSize(size: number, override?: number) {
  if (override != null) return override;
  if (size >= 80) return 4.5;
  if (size >= 56) return 4;
  if (size >= 40) return 3.5;
  return 3;
}

function fontSizeForScore(size: number, labeled: boolean) {
  if (labeled) {
    if (size >= 100) return 'text-[26px]';
    if (size >= 80) return 'text-xl';
    if (size >= 56) return 'text-lg';
    return 'text-base';
  }
  if (size >= 56) return 'text-xs';
  if (size >= 44) return 'text-[11px]';
  return 'text-[10px]';
}

export const ScoreRing = memo(function ScoreRing({
  score,
  size = 48,
  strokeWidth: strokeWidthProp,
  isLoading = false,
  label = 'ATS match',
  variant = 'compact',
  className,
}: ScoreRingProps) {
  const gradId = useId().replace(/:/g, '');
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const strokeWidth = strokeForSize(size, strokeWidthProp);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;
  const labeled = variant === 'labeled';
  const innerInset = Math.round(size * (labeled ? 0.2 : 0.22));
  const innerSize = size - innerInset * 2;

  const tier = useMemo(() => getTier(clamped), [clamped]);
  const theme = TIER_THEME[tier];

  const ariaLabel = isLoading
    ? `${label}: calculating`
    : `${label}: ${clamped} out of 100`;

  return (
    <div
      className={cn('score-ring relative shrink-0', className)}
      style={{ width: size, height: size }}
      role={isLoading ? 'status' : 'img'}
      aria-live={isLoading ? 'polite' : undefined}
      aria-label={ariaLabel}
    >
      <svg
        className="score-ring__svg absolute inset-0 w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <defs>
          <linearGradient id={`scoreRingGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.stroke} />
            <stop offset="100%" stopColor={theme.strokeEnd} />
          </linearGradient>
          <filter id={`scoreRingGlow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--border) / 0.55)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--muted) / 0.35)"
          strokeWidth={strokeWidth - 1}
          fill="none"
          className="opacity-80"
        />
        {!isLoading && clamped > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#scoreRingGrad-${gradId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={`url(#scoreRingGlow-${gradId})`}
            className="score-ring__progress transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
        {isLoading && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
            className="animate-pulse opacity-60"
          />
        )}
      </svg>

      <div
        className="score-ring__core absolute flex flex-col items-center justify-center rounded-full border border-border/40 bg-card/95 text-center shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]"
        style={{
          width: innerSize,
          height: innerSize,
          left: innerInset,
          top: innerInset,
        }}
      >
        {isLoading ? (
          <span
            className={cn(
              fontSizeForScore(size, labeled),
              'font-bold text-muted-foreground animate-pulse tabular-nums leading-none',
            )}
          >
            —
          </span>
        ) : labeled ? (
          <>
            <span
              className={cn(
                fontSizeForScore(size, true),
                'font-bold tabular-nums leading-none',
                theme.text,
              )}
            >
              {clamped}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 mt-0.5">
              ATS
            </span>
          </>
        ) : (
          <span className={cn(fontSizeForScore(size, false), 'font-bold tabular-nums leading-none', theme.text)}>
            {clamped}%
          </span>
        )}
      </div>
    </div>
  );
});
