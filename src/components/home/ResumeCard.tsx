import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Trash2, Sparkles, MoreVertical, Eye, Edit2, Download, Copy } from 'lucide-react';
import { ResumeData, JobMatchScore } from '@/types/resume';
import { cn } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';
import haptics from '@/lib/haptics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ResumeCardProps {
  resume: ResumeData;
  matchScore?: JobMatchScore | null;
  onContinue: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDownload?: () => void;
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
  onPreview,
  onEdit,
  onDuplicate,
  onDownload,
  className,
}: ResumeCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  const hasQuickActions = onPreview || onEdit || onDuplicate || onDownload;

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
        'border-glow',
        'shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)]',
        'hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.25)]',
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >

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

        {/* Continue arrow - static, no infinite loop */}
        <div className="shrink-0 flex items-center gap-1 text-primary">
          <span className="text-xs font-medium hidden sm:inline">Continue</span>
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>

      {/* Three-dot menu (top-right) */}
      {hasQuickActions && (
        <div className="absolute top-2 right-10 z-20">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-w-[44px] min-h-[44px] h-9 w-9 rounded-full hover:bg-muted/50"
                onClick={(e) => { e.stopPropagation(); haptics.light(); }}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onPreview && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); haptics.light(); onPreview(); }}>
                  <Eye className="w-4 h-4 mr-2" />Preview
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); haptics.light(); onEdit(); }}>
                  <Edit2 className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); haptics.light(); onDownload(); }}>
                  <Download className="w-4 h-4 mr-2" />Download PDF
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); haptics.light(); onDuplicate(); }}>
                  <Copy className="w-4 h-4 mr-2" />Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Delete button (only if no menu) */}
      {onDelete && !hasQuickActions && (
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
