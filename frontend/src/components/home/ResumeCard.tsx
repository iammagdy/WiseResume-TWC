import { motion } from 'framer-motion';
import { ChevronRight, Trash2, Sparkles } from 'lucide-react';
import { ResumeData, JobMatchScore } from '@/types/resume';
import { cn } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';
import haptics from '@/lib/haptics';

interface ResumeCardProps {
  resume: ResumeData;
  matchScore?: JobMatchScore | null;
  onContinue: () => void;
  onDelete?: () => void;
  className?: string;
}

// AI suggestions based on completion state
function getAISuggestion(resume: ResumeData): string | null {
  if (!resume.contactInfo.fullName) return 'Add your name to get started';
  if (!resume.contactInfo.email) return 'Add your email address';
  if (resume.experience.length === 0) return 'Add your work experience';
  if (resume.summary.length < 50) return 'Write a compelling summary';
  if (resume.skills.length === 0) return 'Add your key skills';
  if (resume.education.length === 0) return 'Add your education';
  return null;
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

  const aiSuggestion = getAISuggestion(resume);

  const handleContinue = () => {
    haptics.medium();
    onContinue();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.warning();
    onDelete?.();
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl glass-elevated overflow-hidden transition-all duration-300',
        'border border-border/40 hover:border-primary/40',
        'shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)]',
        'hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.25)]',
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.1), transparent)',
          }}
        />
      </div>

      {/* Main clickable area */}
      <button
        className="w-full p-4 flex items-center gap-4 text-left touch-manipulation active:bg-muted/30 transition-colors relative z-10"
        onClick={handleContinue}
      >
        {/* Progress Ring instead of static icon */}
        <div className="shrink-0">
          <ProgressRing percent={completionPercent} size={56} strokeWidth={4} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate text-foreground">{displayName}</h3>
          
          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                Next: {aiSuggestion}
              </p>
            </div>
          )}

          {/* Match score badge */}
          {matchScore && (
            <div className="flex items-center gap-2 mt-2">
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

        {/* Animated Continue arrow */}
        <motion.div
          className="shrink-0 flex items-center gap-1 text-primary"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-xs font-medium hidden sm:inline">Continue</span>
          <ChevronRight className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Delete button (optional) */}
      {onDelete && (
        <button
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation z-20"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
