import { memo } from 'react';
import { cn } from '@/lib/utils';

interface CreditRingProps {
  used: number;
  limit: number;
  size?: number;
  className?: string;
}

export const CreditRing = memo(function CreditRing({
  used,
  limit,
  size = 36,
  className,
}: CreditRingProps) {
  const remaining = Math.max(0, limit - used);
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
      <span className={cn('absolute text-[10px] font-bold', textColor)}>
        {remaining}
      </span>
    </div>
  );
});
