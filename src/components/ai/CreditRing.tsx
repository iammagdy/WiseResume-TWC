import { memo } from 'react';
import { cn } from '@/lib/utils';

type UnlimitedColor = 'amber' | 'blue' | 'green';

const UNLIMITED_COLOR_MAP: Record<UnlimitedColor, { stroke: string; text: string; glow: string }> = {
  amber: { stroke: '#f59e0b', text: 'text-amber-500', glow: '0 0 8px 3px rgba(251,191,36,0.55)' },
  blue:  { stroke: '#3b82f6', text: 'text-blue-500',  glow: '0 0 8px 3px rgba(59,130,246,0.5)' },
  green: { stroke: '#22c55e', text: 'text-green-500', glow: '0 0 8px 3px rgba(34,197,94,0.5)' },
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
  const percentage = isUnlimited ? 100 : limit > 0 ? (used / limit) * 100 : 0;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = isUnlimited ? 0 : circumference - (percentage / 100) * circumference;

  const unlimitedStyle = unlimitedColor ? UNLIMITED_COLOR_MAP[unlimitedColor] : null;

  const color = isUnlimited
    ? (unlimitedStyle?.stroke ?? 'hsl(var(--primary))')
    : percentage >= 90
    ? 'hsl(var(--destructive))'
    : percentage >= 70
    ? 'hsl(var(--warning))'
    : 'hsl(var(--primary))';

  const textColor = isUnlimited
    ? (unlimitedStyle?.text ?? 'text-primary')
    : percentage >= 90
    ? 'text-destructive'
    : percentage >= 70
    ? 'text-warning'
    : 'text-primary';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={isUnlimited && unlimitedStyle ? { filter: `drop-shadow(${unlimitedStyle.glow})` } : undefined}
      >
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
      <span className={cn('absolute font-bold', textColor, isUnlimited ? 'text-xs' : 'text-[10px]')}>
        {isUnlimited ? '∞' : used}
      </span>
    </div>
  );
});
