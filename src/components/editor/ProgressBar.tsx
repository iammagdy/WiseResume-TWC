import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  resume: ResumeData;
  className?: string;
}

export function ProgressBar({ resume, className }: ProgressBarProps) {
  const sections = [
    { name: 'contact', complete: Boolean(resume.contactInfo.fullName && resume.contactInfo.email) },
    { name: 'summary', complete: resume.summary.length > 30 },
    { name: 'experience', complete: resume.experience.length > 0 },
    { name: 'education', complete: resume.education.length > 0 },
    { name: 'skills', complete: resume.skills.length > 0 },
  ];

  const completedCount = sections.filter((s) => s.complete).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return (
    <motion.div
      className={cn('flex items-center gap-3', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Progress value={progress} className="flex-1 h-2" />
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
