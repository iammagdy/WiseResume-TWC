import { useState, useMemo, memo } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Star,
  
  Target,
  Clock,
  GitBranch,
  Crown,
  Mic,
  Sparkles,
  Pencil
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatabaseResume } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { ScoreRing } from './ScoreRing';
import { ResumeHealthScore } from '@/hooks/useResumeScore';

interface ResumeListCardProps {
  resume: DatabaseResume;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onInterview?: (id: string) => void;
  showMasterBadge?: boolean;
  showTailoredBadge?: boolean;
  healthScore?: ResumeHealthScore | null;
  isScoring?: boolean;
  /** If true, swipe actions require external confirmation (card springs back instead of animating off-screen) */
  confirmSwipeActions?: boolean;
}

const SWIPE_THRESHOLD = 80;

// Calculate resume completion percentage based on filled sections
function calculateResumeCompletion(resume: DatabaseResume): number {
  let filled = 0;
  const total = 5; // contact, summary, experience, education, skills

  // Check contact (has name and email)
  const contact = resume.contact_info as { name?: string; email?: string } | null;
  if (contact?.name && contact?.email) filled++;

  // Check summary (meaningful content)
  if (resume.summary && resume.summary.length > 20) filled++;

  // Check experience (at least one entry)
  const experience = resume.experience as unknown[] | null;
  if (experience && experience.length > 0) filled++;

  // Check education (at least one entry)
  const education = resume.education as unknown[] | null;
  if (education && education.length > 0) filled++;

  // Check skills (at least 3 skills)
  const skills = resume.skills as unknown[] | null;
  if (skills && skills.length >= 3) filled++;

  return Math.round((filled / total) * 100);
}

function getCompletionTextColor(percentage: number): string {
  if (percentage >= 80) return 'text-success';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}

export const ResumeListCard = memo(function ResumeListCard({
  resume,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
  onInterview,
  showMasterBadge = false,
  showTailoredBadge = false,
  healthScore,
  isScoring = false,
  confirmSwipeActions = true,
}: ResumeListCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Fit score badge from tailor history
  const getTailorHistoryForResume = useResumeStore(s => s.getTailorHistoryForResume);
  const latestTailor = useMemo(() => {
    const history = getTailorHistoryForResume(resume.id);
    return history.length > 0 ? history[0] : null;
  }, [resume.id, getTailorHistoryForResume]);
  
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);

  const hasTargetJob = resume.target_job_title || resume.target_company;
  const matchScore = resume.job_match_score;

  // Calculate completion percentage
  const completionPercentage = useMemo(() => calculateResumeCompletion(resume), [resume]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    const currentX = x.get();
    const newX = info.offset.x;
    
    if (
      (currentX > -SWIPE_THRESHOLD && newX <= -SWIPE_THRESHOLD) ||
      (currentX < SWIPE_THRESHOLD && newX >= SWIPE_THRESHOLD)
    ) {
      haptics.light();
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      haptics.warning();
      if (confirmSwipeActions) {
        // Spring back and let parent handle confirmation
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        onDelete(resume.id);
      } else {
        // Animate off-screen then trigger
        animate(x, -300, { type: 'tween', duration: 0.2 }).then(() => onDelete(resume.id));
      }
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      haptics.success();
      if (confirmSwipeActions) {
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        onDuplicate(resume.id);
      } else {
        animate(x, 300, { type: 'tween', duration: 0.2 }).then(() => onDuplicate(resume.id));
      }
    } else {
      // Didn't reach threshold — spring back smoothly
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const handleCardClick = () => {
    if (!isDragging) {
      haptics.light();
      onEdit(resume.id);
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-l-4 transition-colors duration-500",
      healthScore
        ? healthScore.overallScore >= 80 ? "border-l-success"
          : healthScore.overallScore >= 60 ? "border-l-warning"
          : "border-l-destructive"
        : "border-l-muted",
    )}>
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Duplicate action (right swipe) */}
        <motion.div
          className="flex-1 bg-success/15 backdrop-blur-sm flex items-center pl-4"
          style={{ opacity: duplicateOpacity }}
        >
          <div className="flex items-center gap-2 text-success">
            <Copy className="w-5 h-5" />
            <span className="font-medium text-sm">Duplicate</span>
          </div>
        </motion.div>
        
        {/* Delete action (left swipe) */}
        <motion.div
          className="flex-1 bg-destructive/15 backdrop-blur-sm flex items-center justify-end pr-4"
          style={{ opacity: deleteOpacity }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium text-sm">Delete</span>
            <Trash2 className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* Card content */}
      <motion.div
        className={cn(
          'relative glass-elevated p-4 touch-manipulation cursor-pointer',
          'active:bg-muted/30 transition-all'
        )}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.5}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        whileTap={{ scale: isDragging ? 1 : 0.98 }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon and Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Resume Health Score Ring */}
            {healthScore ? (
              <ScoreRing score={healthScore.overallScore} size={48} isLoading={isScoring} />
            ) : (
              <ScoreRing score={0} size={48} isLoading />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {resume.is_primary && (
                  <Star className="w-4 h-4 text-warning fill-warning flex-shrink-0" />
                )}
                {isRenaming ? (
                  <input
                    autoFocus
                    className="font-semibold text-foreground bg-transparent glass-input rounded-lg px-2 py-0.5 h-7 w-full max-w-[180px] text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                    defaultValue={resume.title}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== resume.title && onRename) onRename(resume.id, val);
                      setIsRenaming(false);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && val !== resume.title && onRename) onRename(resume.id, val);
                        setIsRenaming(false);
                      }
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                  />
                ) : (
                  <h3 className="font-semibold text-foreground truncate">
                    {resume.title}
                  </h3>
                )}
                {showMasterBadge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-primary/30 text-primary">
                    <Crown className="w-3 h-3" />
                    Master
                  </Badge>
                )}
                {showTailoredBadge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                    <GitBranch className="w-3 h-3" />
                    Tailored
                  </Badge>
                )}
                {latestTailor && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-success/30 text-success">
                    <Sparkles className="w-3 h-3" />
                    {latestTailor.scoreBeforeAfter.after}% • {latestTailor.jobTitle}
                  </Badge>
                )}
              </div>

              {/* Target Job */}
              {hasTargetJob ? (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Target className="w-3.5 h-3.5" />
                  <span className="truncate">
                    {resume.target_job_title}
                    {resume.target_company && ` • ${resume.target_company}`}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">
                  No target job set
                </p>
              )}

              {/* Completion Progress */}
              <div className="flex items-center gap-2 mb-2">
                <Progress 
                  value={completionPercentage} 
                  className="h-1.5 flex-1"
                />
                <span className={cn(
                  'text-xs font-medium',
                  getCompletionTextColor(completionPercentage)
                )}>
                  {completionPercentage}%
                </span>
              </div>

              {/* Bottom Row: Time + AI Nudge */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Edited {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                </span>
              </div>
              {/* AI Improvement Nudge */}
              {healthScore && healthScore.topImprovement ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate italic">
                    {healthScore.topImprovement}
                  </span>
                </div>
              ) : !healthScore ? (
                <div className="mt-1.5 h-4 w-3/4 rounded bg-muted animate-pulse" />
              ) : null}
            </div>
          </div>

          {/* Right: Menu */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                }}
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onRename && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.light();
                    setIsRenaming(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  onEdit(resume.id);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  onDuplicate(resume.id);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {onInterview && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.light();
                    onInterview(resume.id);
                  }}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Practice Interview
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.warning();
                  onDelete(resume.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </div>
  );
});
