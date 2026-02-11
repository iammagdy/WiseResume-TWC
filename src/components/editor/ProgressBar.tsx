import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  resume: ResumeData;
  className?: string;
  variant?: 'bar' | 'ring';
}

export const ProgressBar = memo(function ProgressBar({ resume, className, variant = 'bar' }: ProgressBarProps) {
  const sections = [
    { name: 'Contact', complete: Boolean(resume.contactInfo.fullName && resume.contactInfo.email) },
    { name: 'Summary', complete: resume.summary.length > 30 },
    { name: 'Experience', complete: resume.experience.length > 0 },
    { name: 'Education', complete: resume.education.length > 0 },
    { name: 'Skills', complete: resume.skills.length > 0 },
  ];

  const completedCount = sections.filter((s) => s.complete).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  if (variant === 'ring') {
    return <ProgressRing progress={progress} sections={sections} className={className} />;
  }

  return (
    <div className={cn('flex items-center gap-3 flex-1 animate-fade-in', className)}>
      {/* Section dots */}
      <div className="flex gap-1">
        {sections.map((section) => (
          <div
            key={section.name}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              section.complete ? 'bg-success' : 'bg-muted'
            )}
            title={`${section.name}: ${section.complete ? 'Complete' : 'Incomplete'}`}
          />
        ))}
      </div>
      
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          progress === 100 ? 'text-success' : 'text-muted-foreground'
        )}
      >
        {progress}%
      </span>
    </div>
  );
});

interface ProgressRingProps {
  progress: number;
  sections: { name: string; complete: boolean }[];
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'text-sm font-bold',
          progress === 100 ? 'text-success' : 'text-foreground'
        )}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
