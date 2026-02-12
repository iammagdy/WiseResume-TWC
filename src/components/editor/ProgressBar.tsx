import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { ResumeData } from '@/types/resume';
import { calcOverallScore } from '@/lib/resumeCompletionRules';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  resume: ResumeData;
  className?: string;
  variant?: 'bar' | 'ring';
}

export const ProgressBar = memo(function ProgressBar({ resume, className, variant = 'bar' }: ProgressBarProps) {
  const progress = calcOverallScore(resume);

  if (variant === 'ring') {
    return <ProgressRing progress={progress} className={className} />;
  }

  const isComplete = progress >= 100;

  return (
    <div className={cn('flex items-center gap-3 flex-1 animate-fade-in', className)}>
      <span
        className={cn(
          'text-sm font-semibold whitespace-nowrap flex items-center gap-1.5',
          isComplete ? 'text-success' : 'text-foreground'
        )}
      >
        {isComplete && <Sparkles className="w-3.5 h-3.5" />}
        Resume {progress}% Complete
      </span>

      {/* Animated bar */}
      <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            isComplete ? 'bg-success' : 'gradient-primary'
          )}
          style={{
            width: `${progress}%`,
            transition: 'width 0.7s ease-out',
          }}
        />
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

  return (
    <div className={cn('relative animate-scale-in', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={progress >= 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('text-sm font-bold', progress >= 100 ? 'text-success' : 'text-foreground')}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
