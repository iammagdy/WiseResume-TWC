import { memo } from 'react';
import { cn } from '@/lib/utils';

type UnlimitedColor = 'amber' | 'blue' | 'green';

const UNLIMITED_COLOR_MAP: Record<UnlimitedColor, { text: string; bg: string; border: string; glow: string }> = {
  amber: {
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/40',
    glow: '0 0 10px 3px rgba(251,191,36,0.55)',
  },
  blue: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-400/40',
    glow: '0 0 10px 3px rgba(59,130,246,0.5)',
  },
  green: {
    text: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-400/40',
    glow: '0 0 10px 3px rgba(34,197,94,0.5)',
  },
};

interface CreditRingProps {
  used: number;
  limit: number;
  size?: number;
  className?: string;
  unlimitedColor?: UnlimitedColor;
}

export const CreditRing = memo(function CreditRing({
  used,
  limit,
  size = 36,
  className,
  unlimitedColor,
}: CreditRingProps) {
  const isUnlimited = !isFinite(limit);

  if (isUnlimited) {
    const style = unlimitedColor ? UNLIMITED_COLOR_MAP[unlimitedColor] : null;

    return (
      <div
        className={cn('inline-flex items-center justify-center rounded-full border', className, style?.bg ?? 'bg-primary/10', style?.border ?? 'border-primary/30')}
        style={{
          width: size,
          height: size,
          boxShadow: style ? style.glow : '0 0 8px 2px hsl(var(--primary) / 0.4)',
        }}
        aria-label="Unlimited AI credits"
      >
        <span className={cn('font-bold text-sm leading-none', style?.text ?? 'text-primary')}>
          ∞
        </span>
      </div>
    );
  }

  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 90
      ? 'hsl(var(--destructive))'
      : percentage >= 70
      ? 'hsl(var(--warning))'
      : 'hsl(var(--primary))';

  const textColor =
    percentage >= 90
      ? 'text-destructive'
      : percentage >= 70
      ? 'text-warning'
      : 'text-primary';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className={cn('absolute font-bold text-[10px]', textColor)}>
        {used}
      </span>
    </div>
  );
});
