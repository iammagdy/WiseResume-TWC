import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
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
  Share2,
  CloudOff,
  ArrowLeft,
  ArrowRight,
  Timer,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useResumeStore } from '@/store/resumeStore';
import { ScoreRing } from './ScoreRing';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { ATSScoreBreakdown } from './ATSScoreBreakdown';
import { SetTargetJobSheet } from './SetTargetJobSheet';
import { useNavigate } from 'react-router-dom';
import { useDoubleTap } from '@/hooks/useDoubleTap';
interface ResumeListCardProps {
  resume: DatabaseResume;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void | Promise<void>;
  onInterview?: (id: string) => void;
  showMasterBadge?: boolean;
  showTailoredBadge?: boolean;
  healthScore?: ResumeHealthScore | null;
  isScoring?: boolean;
  /** If true, swipe actions require external confirmation (card springs back instead of animating off-screen) */
  confirmSwipeActions?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** Externally driven processing state (e.g. when parent's async mutation is in-flight for this card) */
  isProcessing?: boolean;
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
  selectionMode = false,
  selected = false,
  onToggleSelect,
  isProcessing = false,
}: ResumeListCardProps) {

  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [showTargetJobSheet, setShowTargetJobSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const navigateToEditor = useNavigate();

  const SWIPE_HINT_KEY = 'wr-swipe-hint-seen';
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try {
      return !localStorage.getItem(SWIPE_HINT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        try { localStorage.setItem(SWIPE_HINT_KEY, '1'); } catch {}
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint]);

  // Only show processing overlay after 300ms to avoid flicker on fast network
  useEffect(() => {
    if (!isProcessing) {
      setShowProcessingOverlay(false);
      return;
    }
    const timer = setTimeout(() => setShowProcessingOverlay(true), 300);
    return () => clearTimeout(timer);
  }, [isProcessing]);

  // Fit score badge from tailor history
  const getTailorHistoryForResume = useResumeStore(s => s.getTailorHistoryForResume);

  const latestTailor = useMemo(() => {
    const history = getTailorHistoryForResume(resume.$id);
    return history.length > 0 ? history[0] : null;
  }, [resume.$id, getTailorHistoryForResume]);

  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);

  const hasTargetJob = resume.target_job_title || resume.target_company;

  const trialBadge = useMemo(() => {
    if (!resume.is_trial) return null;
    if (!resume.trial_expires_at) return { label: 'Trial', expired: false, hoursLeft: 0 };
    const expiresAt = new Date(resume.trial_expires_at || Date.now());
    const now = new Date();
    if (expiresAt <= now) return { label: 'Trial expired', expired: true, hoursLeft: 0 };
    const hoursLeft = Math.max(1, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return { label: `Trial · ${hoursLeft}h left`, expired: false, hoursLeft };
  }, [resume.is_trial, resume.trial_expires_at]);
  const isPending = useOfflineSyncStore(s => s.pendingChanges.some(c => c.resumeId === resume.$id));
  const matchScore = resume.job_match_score;
  const resumeForProgress = useMemo(() => dbToResumeData(resume), [resume.$id, resume.$updatedAt]);

  const verifiedScoreClass = (score: number) => {
    if (score >= 75) return 'bg-success/10 text-success border-success/30';
    if (score >= 50) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  const handleDragStart = () => {
    setIsDragging(true);
    if (showSwipeHint) {
      setShowSwipeHint(false);
      try { localStorage.setItem(SWIPE_HINT_KEY, '1'); } catch {}
    }
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
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        onDelete(resume.$id);
      } else {
        animate(x, -300, { type: 'tween', duration: 0.2 }).then(() => onDelete(resume.$id));
      }
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      haptics.success();
      if (confirmSwipeActions) {
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        onDuplicate(resume.$id);
      } else {
        animate(x, 300, { type: 'tween', duration: 0.2 }).then(() => onDuplicate(resume.$id));
      }
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const handleSingleTap = useCallback(() => {
    if (selectionMode && onToggleSelect) {
      haptics.light();
      onToggleSelect(resume.$id);
      return;
    }
    if (!isDragging) {
      haptics.light();
      navigateToEditor(`/resume/${resume.$id}`);
    }
  }, [selectionMode, onToggleSelect, isDragging, resume.$id, navigateToEditor]);

  const handleDoubleTapAction = useCallback(() => {
    if (selectionMode || isDragging) return;
    haptics.medium();
    // Load resume and go directly to preview
    const { setCurrentResumeId, setCurrentResume } = useResumeStore.getState();
    setCurrentResumeId(resume.$id);
    setCurrentResume(dbToResumeData(resume));
    navigateToEditor('/preview');
  }, [selectionMode, isDragging, resume, navigateToEditor]);

  const handleCardClick = useDoubleTap(handleSingleTap, handleDoubleTapAction);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-l-4 transition-colors duration-500",
      "border-l-primary/20",
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
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={cn(
          'relative bg-card border border-border shadow-soft p-3 sm:p-4 touch-manipulation cursor-pointer',
          'active:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
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
        {/* Processing overlay — shown only after 300ms to avoid flicker on fast networks */}
        <AnimatePresence>
          {showProcessingOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center z-20 bg-background/70 backdrop-blur-[2px] rounded-2xl pointer-events-none"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MiniSpinner size={16} />
                <span>Processing…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe hint overlay — shown once on first load */}
        <AnimatePresence>
          {showSwipeHint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-between px-5 pointer-events-none z-10 bg-background/60 backdrop-blur-[2px] rounded-2xl"
            >
              <motion.div
                animate={{ x: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="flex items-center gap-1.5 text-success text-xs font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Duplicate</span>
              </motion.div>
              <span className="text-[11px] text-muted-foreground">swipe cards</span>
              <motion.div
                animate={{ x: [6, -6, 6] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="flex items-center gap-1.5 text-destructive text-xs font-medium"
              >
                <span>Delete</span>
                <ArrowLeft className="w-4 h-4" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon and Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Selection checkbox */}
            {selectionMode && (
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSelect?.(resume.$id)}
                  className="w-5 h-5"
                />
              </div>
            )}
            {/* Resume Health Score Ring */}
            <div className="shrink-0">
              {healthScore ? (
                <ScoreRing score={healthScore.overallScore} size={44} isLoading={isScoring} />
              ) : (
                <ScoreRing score={0} size={44} isLoading />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 mb-1 overflow-hidden">
                {resume.is_primary && (
                  <Star className="w-4 h-4 text-warning fill-warning flex-shrink-0" />
                )}
                {isRenaming ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      autoFocus
                      disabled={isSavingRename}
                      className="font-semibold text-foreground bg-transparent bg-input border border-border rounded-lg px-2 py-0.5 h-7 w-full max-w-[180px] text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
                      defaultValue={resume.title}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={async (e) => {
                        if (isSavingRename) return;
                        const val = e.target.value.trim();
                        if (val && val !== resume.title && onRename) {
                          setIsSavingRename(true);
                          try {
                            await onRename(resume.$id, val);
                          } finally {
                            setIsSavingRename(false);
                          }
                        }
                        setIsRenaming(false);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                        if (e.key === 'Escape') setIsRenaming(false);
                      }}
                    />
                    {isSavingRename && <MiniSpinner size={14} className="shrink-0 text-muted-foreground" />}
                  </div>
                ) : (
                  <h3 className="font-semibold text-foreground truncate text-base flex-1 min-w-0" title={resume.title}>
                    {resume.title}
                  </h3>
                )}
                {showMasterBadge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-primary/30 text-primary shrink-0">
                    <Crown className="w-3 h-3" />
                    Master
                  </Badge>
                )}
                {showTailoredBadge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1 shrink-0">
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
                {trialBadge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-5 gap-1 shrink-0',
                      trialBadge.expired
                        ? 'border-destructive/40 text-destructive'
                        : 'border-amber-400/60 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {trialBadge.expired ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Timer className="w-3 h-3" />
                    )}
                    {trialBadge.label}
                  </Badge>
                )}
              </div>

              {/* Target Job */}
              {hasTargetJob ? (
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground mb-1 hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); setShowTargetJobSheet(true); }}
                >
                  <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate flex-1">
                    {resume.target_company && `${resume.target_company} – `}{resume.target_job_title}
                  </span>
                  {matchScore !== null && matchScore !== undefined && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] px-1.5 py-0 h-4 gap-0.5 font-medium',
                        verifiedScoreClass(matchScore),
                      )}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {matchScore}% Verified
                    </Badge>
                  )}
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 text-sm text-primary/80 hover:text-primary mb-1 transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); setShowTargetJobSheet(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Set Target Job
                </button>
              )}

              {/* Completion Progress */}
              <div className="mb-1">
                <ProgressBar resume={resumeForProgress} compact className="" />
              </div>

              {/* Bottom Row: Time + AI Nudge */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Edited {safeFormatDistanceToNow(resume.$updatedAt || resume.$createdAt || Date.now(), { addSuffix: true })}
                </span>
                {isPending && (
                  <span className="flex items-center gap-1 text-[10px] text-warning font-medium">
                    <CloudOff className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>
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
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); navigateToEditor(`/resume/${resume.$id}`); }}>
              <Eye className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Preview</span>
            </button>
            {onRename && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); setTimeout(() => setIsRenaming(true), 350); }}>
                <Pencil className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Rename</span>
              </button>
            )}
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onEdit(resume.$id); }}>
              <Edit2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Edit</span>
            </button>
          </div>

          <Separator className="my-2" />

          {/* Actions */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">Actions</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => {
              haptics.light(); setShowActionsSheet(false);
              // Load resume into store and navigate to preview for download
              const { setCurrentResumeId, setCurrentResume, setSelectedTemplate } = useResumeStore.getState();
              setCurrentResumeId(resume.$id);
              setCurrentResume(dbToResumeData(resume));
              if (resume.template_id) setSelectedTemplate(resume.template_id as import('@/types/resume').TemplateId);
              navigateToEditor('/preview?action=download');
            }}>
              <Download className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Download PDF</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={async () => {
              haptics.light(); setShowActionsSheet(false);
              try {
                await navigator.clipboard.writeText(`${getAppUrl()}/resume/${resume.$id}`);
                toast.success('Link copied to clipboard');
              } catch { toast.error('Failed to copy link'); }
            }}>
              <Share2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Share</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onDuplicate(resume.$id); }}>
              <Copy className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Duplicate</span>
            </button>
            {onInterview && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onInterview(resume.$id); }}>
                <Mic className="w-5 h-5 text-muted-foreground" /><span className="text-sm">Practice Interview</span>
              </button>
            )}
          </div>

          <Separator className="my-2" />

          {/* Manage */}
          <div className="space-y-1 pb-2">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">Manage</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors text-destructive" onClick={() => { haptics.warning(); setShowActionsSheet(false); onDelete(resume.$id); }}>
              <Trash2 className="w-5 h-5" /><span className="text-sm">Delete</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
