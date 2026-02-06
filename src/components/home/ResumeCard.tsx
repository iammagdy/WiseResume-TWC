import { motion } from 'framer-motion';
import { FileText, ChevronRight, Trash2 } from 'lucide-react';
import { ResumeData, JobMatchScore } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ResumeCardProps {
  resume: ResumeData;
  matchScore?: JobMatchScore | null;
  onContinue: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ResumeCard({
  resume,
  matchScore,
  onContinue,
  onDelete,
  className,
}: ResumeCardProps) {
  const hasName = resume.contactInfo.fullName.trim().length > 0;
  const displayName = hasName ? resume.contactInfo.fullName : 'Untitled Resume';
  
  // Calculate completion percentage
  const sections = [
    resume.contactInfo.fullName.length > 0,
    resume.contactInfo.email.length > 0,
    resume.summary.length > 50,
    resume.experience.length > 0,
    resume.education.length > 0,
    resume.skills.length > 0,
  ];
  const completionPercent = Math.round(
    (sections.filter(Boolean).length / sections.length) * 100
  );

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl glass-card overflow-hidden glow-subtle-hover transition-all duration-300',
        'hover:border-primary/30',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Main clickable area */}
      <button
        className="w-full p-4 flex items-center gap-4 text-left touch-manipulation active:bg-muted/50 transition-colors"
        onClick={onContinue}
      >
        {/* Resume icon/preview */}
        <div className="w-14 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <FileText className="w-7 h-7 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{displayName}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completionPercent}% complete
          </p>
          {matchScore && (
            <div className="flex items-center gap-2 mt-1.5">
              <div
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  matchScore.overallScore >= 70 && 'bg-success/20 text-success',
                  matchScore.overallScore >= 40 &&
                    matchScore.overallScore < 70 &&
                    'bg-warning/20 text-warning',
                  matchScore.overallScore < 40 && 'bg-destructive/20 text-destructive'
                )}
              >
                {matchScore.overallScore}% match
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </button>

      {/* Delete button (optional) */}
      {onDelete && (
        <button
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
