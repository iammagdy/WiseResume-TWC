import { motion } from 'framer-motion';
import { ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  resume: ResumeData;
  className?: string;
  variant?: 'bar' | 'ring';
}

export function ProgressBar({ resume, className, variant = 'bar' }: ProgressBarProps) {
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
    <motion.div
      className={cn('flex items-center gap-3 flex-1', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Section dots */}
      <div className="flex gap-1">
        {sections.map((section, i) => (
          <motion.div
            key={section.name}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              section.complete ? 'bg-success' : 'bg-muted'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
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
    </motion.div>
  );
}

interface ProgressRingProps {
  progress: number;
  sections: { name: string; complete: boolean }[];
  className?: string;
}

function ProgressRing({ progress, sections, className }: ProgressRingProps) {
  const size = 64;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'text-sm font-bold',
          progress === 100 ? 'text-success' : 'text-foreground'
        )}>
          {progress}%
        </span>
      </div>
    </motion.div>
  );
}
