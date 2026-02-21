import { memo, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ResumeData } from '@/types/resume';
import { calcOverallScore } from '@/lib/resumeCompletionRules';
import { cn } from '@/lib/utils';

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'hsl(var(--success))';
  if (progress >= 67) return 'hsl(140, 70%, 45%)';
  if (progress >= 34) return 'hsl(40, 90%, 50%)';
  return 'hsl(0, 80%, 55%)';
}

const CONFETTI_COLORS = ['bg-success', 'bg-primary', 'bg-warning', 'bg-amber-400', 'bg-success', 'bg-primary', 'bg-warning', 'bg-amber-400'];
const CONFETTI_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

interface ProgressBarProps {
  resume: ResumeData;
  className?: string;
  variant?: 'bar' | 'ring';
  compact?: boolean;
}

export const ProgressBar = memo(function ProgressBar({ resume, className, variant = 'bar', compact = false }: ProgressBarProps) {
  const progress = calcOverallScore(resume);
  const isComplete = progress >= 100;
  const color = getProgressColor(progress);
  const prevProgress = useRef(progress);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (progress >= 100 && prevProgress.current < 100) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(t);
    }
    prevProgress.current = progress;
  }, [progress]);

  if (variant === 'ring') {
    return <ProgressRing progress={progress} className={className} />;
  }

  return (
    <div className={cn('flex items-center gap-3 flex-1 min-w-0 animate-fade-in relative', className)}>

      <span
        className={cn(
          'text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors duration-500',
          isComplete && 'text-success',
          compact && 'text-xs'
        )}
        style={{
          color: isComplete ? undefined : color,
          animation: showConfetti ? 'progress-text-pulse 400ms ease-out' : undefined,
        }}
      >
        {isComplete && !compact && <Sparkles className="w-3.5 h-3.5" />}
        {!compact && <span className="hidden min-[375px]:inline">Resume </span>}{progress}%{!compact && <span className="hidden min-[375px]:inline"> Complete</span>}
      </span>

      {/* Animated bar */}
      <div className={cn('flex-1 rounded-full bg-secondary/30 overflow-hidden relative', compact ? 'h-2' : 'h-2.5')} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Resume completion">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
            transition: 'width 0.7s ease-out, background-color 0.5s ease',
          }}
        />
        {/* Confetti particles */}
        {showConfetti && CONFETTI_ANGLES.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const dist = 28;
          return (
            <span
              key={i}
              className={cn('absolute w-1.5 h-1.5 rounded-full pointer-events-none', CONFETTI_COLORS[i])}
              style={{
                top: '50%',
                left: '50%',
                '--tx': `${Math.cos(rad) * dist}px`,
                '--ty': `${Math.sin(rad) * dist}px`,
                animation: 'progress-confetti-burst 800ms ease-out forwards',
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
});

interface ProgressRingProps {
  progress: number;
  className?: string;
}

function ProgressRing({ progress, className }: ProgressRingProps) {
  const size = 64;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const color = getProgressColor(progress);

  return (
    <div className={cn('relative animate-scale-in', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('text-sm font-bold')} style={{ color }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
