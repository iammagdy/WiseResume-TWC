import { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Star,
  FileText,
  Target,
  Clock,
  GitBranch,
  Crown
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

interface ResumeListCardProps {
  resume: DatabaseResume;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  delay?: number;
  showMasterBadge?: boolean;
  showTailoredBadge?: boolean;
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

function getCompletionColor(percentage: number): string {
  if (percentage >= 80) return 'bg-success';
  if (percentage >= 50) return 'bg-warning';
  return 'bg-destructive';
}

function getCompletionTextColor(percentage: number): string {
  if (percentage >= 80) return 'text-success';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}

export function ResumeListCard({
  resume,
  onEdit,
  onDuplicate,
  onDelete,
  delay = 0,
  showMasterBadge = false,
  showTailoredBadge = false,
}: ResumeListCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD], [1.1, 1]);
  const duplicateScale = useTransform(x, [SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5], [1, 1.1]);

  const hasTargetJob = resume.target_job_title || resume.target_company;
  const matchScore = resume.job_match_score;

  // Calculate completion percentage
  const completionPercentage = useMemo(() => calculateResumeCompletion(resume), [resume]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    // Haptic feedback when crossing thresholds
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
      // Swiped left - delete
      haptics.warning();
      onDelete(resume.id);
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      // Swiped right - duplicate
      haptics.success();
      onDuplicate(resume.id);
    }
    
    // Reset position
    x.set(0);
  };

  const handleCardClick = () => {
    if (!isDragging) {
      haptics.light();
      onEdit(resume.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Duplicate action (right swipe) */}
        <motion.div
          className="flex-1 bg-success/20 flex items-center pl-4"
          style={{ opacity: duplicateOpacity, scale: duplicateScale }}
        >
          <div className="flex items-center gap-2 text-success">
            <Copy className="w-5 h-5" />
            <span className="font-medium text-sm">Duplicate</span>
          </div>
        </motion.div>
        
        {/* Delete action (left swipe) */}
        <motion.div
          className="flex-1 bg-destructive/20 flex items-center justify-end pr-4"
          style={{ opacity: deleteOpacity, scale: deleteScale }}
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
          'relative glass border border-border p-4 touch-manipulation cursor-pointer',
          'active:bg-muted/50 transition-colors'
        )}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        whileTap={{ scale: isDragging ? 1 : 0.98 }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon and Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Resume Icon with match score ring */}
            <div className="relative">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              {matchScore !== null && (
                <div 
                  className={cn(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background',
                    matchScore >= 80 ? 'bg-success text-success-foreground' :
                    matchScore >= 60 ? 'bg-warning text-warning-foreground' :
                    'bg-destructive text-destructive-foreground'
                  )}
                >
                  {matchScore}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {resume.is_primary && (
                  <Star className="w-4 h-4 text-warning fill-warning flex-shrink-0" />
                )}
                <h3 className="font-semibold text-foreground truncate">
                  {resume.title}
                </h3>
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

              {/* Bottom Row: Time */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Edited {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                </span>
              </div>
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
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
      
      {/* Swipe hint on first card */}
      {delay === 0 && (
        <motion.div
          initial={{ opacity: 0.5, x: 0 }}
          animate={{ opacity: 0, x: -10 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
        >
          ← Swipe
        </motion.div>
      )}
    </motion.div>
  );
}
