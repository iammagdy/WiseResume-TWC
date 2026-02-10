import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  isLoading?: boolean;
}

export const ScoreRing = memo(function ScoreRing({
  score,
  size = 48,
  strokeWidth = 3.5,
  isLoading = false,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const color = score >= 80
    ? 'hsl(var(--success))'
    : score >= 60
      ? 'hsl(var(--warning))'
      : 'hsl(var(--destructive))';

  if (isLoading) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
            className="animate-pulse"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">—</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'text-xs font-bold',
          score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive'
        )}>
          {score}
        </span>
      </div>
    </div>
  );
});
