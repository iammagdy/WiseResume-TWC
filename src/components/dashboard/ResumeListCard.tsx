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
  Pencil,
  Plus,
  Eye,
  Download,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TemplateId } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { ScoreRing } from './ScoreRing';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { ATSScoreBreakdown } from './ATSScoreBreakdown';
import { SetTargetJobSheet } from './SetTargetJobSheet';
import { useNavigate } from 'react-router-dom';

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
  
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showTargetJobSheet, setShowTargetJobSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const navigateToEditor = useNavigate();
  
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
  const resumeForProgress = useMemo(() => dbToResumeData(resume), [resume.id, resume.updated_at]);

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
      navigateToEditor(`/resume/${resume.id}`);
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
          'relative glass-elevated p-4 touch-manipulation cursor-pointer min-h-[180px] sm:min-h-[120px]',
          'active:bg-muted/30 transition-all'
        )}
        style={{ x, touchAction: 'pan-y' }}
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
                  <h3 className="font-semibold text-foreground truncate text-lg sm:text-base">
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
                  <Badge variant="outline" className="text-[13px] px-1.5 py-0 h-5 gap-1 border-success/30 text-success">
                    <Sparkles className="w-3 h-3" />
                    {latestTailor.scoreBeforeAfter.after}% • {latestTailor.jobTitle}
                  </Badge>
                )}
              </div>

              {/* Target Job */}
              {hasTargetJob ? (
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground mb-2 hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); setShowTargetJobSheet(true); }}
                >
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate">
                    🎯 {resume.target_company && `${resume.target_company} - `}{resume.target_job_title}
                    {matchScore ? ` (${matchScore}% match)` : ''}
                  </span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 text-sm text-primary/80 hover:text-primary mb-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); setShowTargetJobSheet(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Set Target Job
                </button>
              )}

              {/* Completion Progress */}
              <div className="mb-2">
                <ProgressBar resume={resumeForProgress} compact className="" />
              </div>

              {/* Bottom Row: Time + AI Nudge */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Edited {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                </span>
              </div>
              {/* ATS Score Breakdown */}
              {healthScore ? (
                <div className="mt-2 border-t border-border pt-2">
                  <ATSScoreBreakdown
                    healthScore={healthScore}
                    isScoring={isScoring}
                    compact
                    onImprove={() => {
                      haptics.medium();
                      navigateToEditor(`/editor?openTailor=1`);
                    }}
                  />
                </div>
              ) : !healthScore ? (
                <div className="mt-1.5 h-4 w-3/4 rounded bg-muted animate-pulse" />
              ) : null}
            </div>
          </div>

          {/* Right: Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px] h-11 w-11 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              haptics.light();
              setShowActionsSheet(true);
            }}
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      <SetTargetJobSheet
        open={showTargetJobSheet}
        onOpenChange={setShowTargetJobSheet}
        resume={resume}
      />

      {/* Actions Bottom Sheet */}
      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent side="bottom" className="pb-safe max-h-[80dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{resume.title}</SheetTitle>
          </SheetHeader>

          {/* View & Edit */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">View & Edit</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); navigateToEditor(`/resume/${resume.id}`); }}>
              <Eye className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Preview</span>
            </button>
            {onRename && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); setIsRenaming(true); }}>
                <Pencil className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Rename</span>
              </button>
            )}
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onEdit(resume.id); }}>
              <Edit2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Edit</span>
            </button>
          </div>

          <Separator className="my-2" />

          {/* Actions */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">Actions</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={async () => {
              haptics.light(); setShowActionsSheet(false);
              try {
                const { generatePDF } = await import('@/lib/pdfGenerator');
                const { downloadFile } = await import('@/lib/downloadUtils');
                const resumeData = dbToResumeData(resume);
                const blob = await generatePDF(resumeData, (resume.template_id || 'modern') as TemplateId);
                const fileName = `${resumeData.contactInfo.fullName || resume.title}_Resume.pdf`.replace(/\s+/g, '_');
                await downloadFile({ blob, fileName });
                toast.success('PDF downloaded');
              } catch { toast.error('Failed to download PDF'); }
            }}>
              <Download className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Download PDF</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={async () => {
              haptics.light(); setShowActionsSheet(false);
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/resume/${resume.id}`);
                toast.success('Link copied to clipboard');
              } catch { toast.error('Failed to copy link'); }
            }}>
              <Share2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Share</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onDuplicate(resume.id); }}>
              <Copy className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Duplicate</span>
            </button>
            {onInterview && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onInterview(resume.id); }}>
                <Mic className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Practice Interview</span>
              </button>
            )}
          </div>

          <Separator className="my-2" />

          {/* Manage */}
          <div className="space-y-1 pb-2">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">Manage</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted/50 active:scale-95 touch-manipulation transition-colors text-destructive" onClick={() => { haptics.warning(); setShowActionsSheet(false); onDelete(resume.id); }}>
              <Trash2 className="w-5 h-5" /><span className="text-sm">Delete</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
