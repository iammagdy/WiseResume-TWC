import { useState, useMemo, memo, useCallback, useEffect, Suspense } from 'react';
import { migrateTemplateId } from '@/lib/templateMigration';
import { getAppUrl } from '@/lib/portfolioUrl';
import { motion, useMotionValue, useTransform, animate, useReducedMotion, PanInfo } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Star,
  Target,
  Wand2,
  Clock,
  GitBranch,
  Crown,
  Mic,
  Sparkles,
  FileText,
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

import { useLocale } from '@/i18n/LocaleProvider';

import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ScoreRing } from './ScoreRing';
import { MiniTemplateThumbnail } from './MiniTemplateThumbnail';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
  /** Dashboard row density: workspace = primary surface cards */
  presentation?: 'default' | 'atlas-row' | 'workspace';
  onTailor?: (id: string) => void;
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
  presentation = 'default',
  onTailor,
}: ResumeListCardProps) {
  const { t, locale } = useLocale();
  const isAtlasRow = presentation === 'atlas-row';
  const isWorkspace = presentation === 'workspace';
  const isCompactRow = isAtlasRow || isWorkspace;

  const aiInsightPreview = useMemo(() => {
    if (!healthScore) return null;
    const gaps = healthScore.keywordGaps?.length ?? 0;
    if (gaps > 0) {
      return t('app.resumeCard.keywordGapsCount', '{{count}} keyword gap(s) — tailor to align with your target role.', { count: gaps });
    }
    if (healthScore.topImprovement) return healthScore.topImprovement;
    return null;
  }, [healthScore, t]);

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
      return !sessionStorage.getItem(SWIPE_HINT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        try { sessionStorage.setItem(SWIPE_HINT_KEY, '1'); } catch {}
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
  const prefersReducedMotion = useReducedMotion();
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
  const defaultResumeId = useSettingsStore(s => s.defaultResumeId);
  const setDefaultResumeId = useSettingsStore(s => s.setDefaultResumeId);
  const isDefault = defaultResumeId === resume.$id;

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

    const settle = prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

    if (info.offset.x <= -SWIPE_THRESHOLD) {
      haptics.warning();
      // Always settle back and trigger confirmation dialog (never direct delete)
      animate(x, 0, settle);
      onDelete(resume.$id);
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      haptics.success();
      // Always settle back and trigger duplicate
      animate(x, 0, settle);
      onDuplicate(resume.$id);
    } else {
      animate(x, 0, settle);
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

  const scoreTint = (() => {
    const score = healthScore?.overallScore;
    if (score == null || score === 0) return '';
    if (score >= 80) return 'bg-success/[0.04]';
    if (score >= 50) return 'bg-warning/[0.04]';
    return 'bg-destructive/[0.04]';
  })();

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl transition-colors duration-500',
      !isCompactRow && scoreTint,
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
            <span className="font-medium text-sm">{t('common.duplicate', 'Duplicate')}</span>
          </div>
        </motion.div>

        {/* Delete action (left swipe) */}
        <motion.div
          className="flex-1 bg-destructive/15 backdrop-blur-sm flex items-center justify-end pr-4"
          style={{ opacity: deleteOpacity }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium text-sm">{t('common.delete', 'Delete')}</span>
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
          'relative rounded-2xl touch-manipulation cursor-pointer transition-all duration-200',
          'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isWorkspace
            ? 'resume-workspace-row resume-workspace-card rounded-2xl border border-border/40 px-3 py-2.5 shadow-none hover:border-primary/20'
            : isAtlasRow
              ? 'dashboard-atlas-row border-border/70 shadow-none p-3 sm:p-3.5 hover:border-primary/20 hover:bg-card border'
              : cn(
                'bg-card border border-border/80 shadow-soft p-4 sm:p-5',
                'hover:border-primary/25 hover:shadow-soft-md hover:bg-card',
                healthScore && healthScore.overallScore >= 80 && 'ring-1 ring-success/20',
              ),
        )}
        style={isWorkspace ? undefined : { x, touchAction: 'pan-y' }}
        drag={isWorkspace ? false : 'x'}
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
                <span>{t('common.duplicate', 'Duplicate')}</span>
              </motion.div>
              <span className="text-[11px] text-muted-foreground">{t('app.resumeCard.swipeCards', 'swipe cards')}</span>
              <motion.div
                animate={{ x: [6, -6, 6] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="flex items-center gap-1.5 text-destructive text-xs font-medium"
              >
                <span>{t('common.delete', 'Delete')}</span>
                <ArrowLeft className="w-4 h-4" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isWorkspace ? (
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full">
            {selectionMode && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSelect?.(resume.$id)}
                  className="w-4 h-4"
                />
              </div>
            )}
            <div
              className={cn(
                'resume-workspace-doc-tile flex items-center justify-center shrink-0 w-9 h-9 rounded-xl',
                showTailoredBadge && 'resume-workspace-doc-tile--tailored',
              )}
            >
              <FileText
                className={cn('w-4 h-4', showTailoredBadge ? 'text-primary' : 'text-muted-foreground/90')}
              />
            </div>
            <div className="shrink-0">
              <ScoreRing
                score={healthScore?.overallScore ?? 0}
                size={40}
                isLoading={isScoring || healthScore == null}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {resume.is_primary && (
                  <Star className="w-3 h-3 text-amber-500/90 fill-amber-400/80 shrink-0" />
                )}
                <h3
                  className="text-[15px] font-semibold text-foreground leading-tight flex-1 min-w-0 truncate"
                  title={resume.title}
                >
                  {resume.title}
                </h3>
                {showMasterBadge && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 border-border/60 text-muted-foreground">
                    {t('app.resumeCard.master', 'Master')}
                  </Badge>
                )}
                {showTailoredBadge && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                    {t('app.resumeCard.tailored', 'Tailored')}
                  </Badge>
                )}
              </div>
              {resume.target_job_title && (
                <p className="text-xs text-foreground/85 truncate mt-0.5">{resume.target_job_title}</p>
              )}
              <p className="text-[11px] text-muted-foreground/90 truncate mt-0.5">
                {resume.template && (
                  <span>
                    {resume.template.charAt(0).toUpperCase()}
                    {resume.template.slice(1)} {t('app.resumeCard.template', 'template')}
                  </span>
                )}
                <span>
                  {resume.template ? ' · ' : ''}
                  {t('app.resumeCard.edited', 'Edited')}{' '}
                  {safeFormatDistanceToNow(resume.$updatedAt || resume.$createdAt || Date.now(), {
                    addSuffix: true,
                  })}
                </span>
              </p>
              {aiInsightPreview && (
                <p className="resume-workspace-card__insight mt-1 line-clamp-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mr-1">{t('app.resumeCard.topSuggestion', 'Top suggestion:')}</span>
                  {aiInsightPreview}
                </p>
              )}
            </div>
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                className="resume-workspace-action h-8 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                onClick={() => {
                  haptics.light();
                  onEdit(resume.$id);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                {t('common.edit', 'Edit')}
              </Button>
              {onTailor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="resume-workspace-action h-8 px-2.5 rounded-lg text-xs font-medium shadow-none border-border/80 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => {
                    haptics.light();
                    onTailor(resume.$id);
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t('common.tailor', 'Tailor')}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 rounded-lg"
                onClick={() => {
                  haptics.light();
                  setShowActionsSheet(true);
                }}
                aria-label={t('app.resumeCard.moreOptions', 'More options')}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : isAtlasRow ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {selectionMode && (
                <div className="flex items-center justify-center pt-1" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleSelect?.(resume.$id)}
                    className="w-5 h-5"
                  />
                </div>
              )}
              {!selectionMode && (
                <div className="shrink-0 pt-0.5 hidden sm:flex">
                  <ScoreRing
                    score={healthScore?.overallScore ?? 0}
                    size={44}
                    isLoading={isScoring || healthScore == null}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  {resume.is_primary && (
                    <Star className="w-3.5 h-3.5 text-amber-500/90 fill-amber-400/80 shrink-0" />
                  )}
                  <h3 className="font-semibold text-[15px] truncate flex-1 min-w-0 text-foreground" title={resume.title}>
                    {resume.title}
                  </h3>
                  {showMasterBadge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-border text-muted-foreground shrink-0">
                      <Crown className="w-3 h-3" />
                      {t('app.resumeCard.master', 'Master')}
                    </Badge>
                  )}
                  {showTailoredBadge && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 shrink-0 font-medium">
                      <GitBranch className="w-3 h-3" />
                      {t('app.resumeCard.tailored', 'Tailored')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  <span>
                    {safeFormatDistanceToNow(resume.$updatedAt || resume.$createdAt || Date.now(), { addSuffix: true })}
                  </span>
                  {resume.template && (
                    <span>
                      {' '}
                      · {resume.template.charAt(0).toUpperCase()}
                      {resume.template.slice(1)}
                    </span>
                  )}
                </p>
                {hasTargetJob && (
                  <p className="text-xs text-foreground/75 mt-0.5 truncate flex items-center gap-1">
                    <Target className="w-3 h-3 text-primary/70 shrink-0" />
                    {[resume.target_job_title, resume.target_company].filter(Boolean).join(' @ ')}
                  </p>
                )}
                {healthScore && (
                  <p className="text-[11px] text-muted-foreground mt-1 tabular-nums sm:hidden">
                    {t('app.resumeCard.atsPercentage', 'ATS {{score}}%', { score: healthScore.overallScore })}
                    {healthScore.keywordGaps && healthScore.keywordGaps.length > 0
                      ? ` · ${t('app.resumeCard.keywordGapsCount', '{{count}} gap(s)', { count: healthScore.keywordGaps.length })}`
                      : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl min-w-[5.25rem] flex-1 sm:flex-none font-medium border-border/80"
                onClick={() => {
                  haptics.light();
                  onEdit(resume.$id);
                }}
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                {t('common.edit', 'Edit')}
              </Button>
              {onTailor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl min-w-[5.25rem] flex-1 sm:flex-none font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => {
                    haptics.light();
                    onTailor(resume.$id);
                  }}
                >
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  {t('common.tailor', 'Tailor')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="min-w-[44px] min-h-[44px] h-10 w-10 shrink-0"
                onClick={() => {
                  haptics.light();
                  setShowActionsSheet(true);
                }}
                aria-label={t('app.resumeCard.moreOptions', 'More options')}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
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
            {/* Template thumbnail */}
            {!selectionMode && (
              <div className="shrink-0 w-11 h-[62px] rounded-xl overflow-hidden border border-border shadow-soft-sm ring-1 ring-black/5 dark:ring-white/5">
                <ErrorBoundary fallback={<div className="w-10 h-[56px] rounded-lg bg-muted" />}>
                  <Suspense fallback={<div className="w-10 h-[56px] rounded-lg bg-muted animate-pulse" />}>
                    <MiniTemplateThumbnail templateId={migrateTemplateId(resume.template)} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {/* Resume health / ATS score ring */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              {healthScore ? (
                <ScoreRing score={healthScore.overallScore} size={48} isLoading={isScoring} />
              ) : (
                <ScoreRing score={0} size={48} isLoading />
              )}
              <span className="text-[10px] font-medium text-muted-foreground leading-none">ATS</span>
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
                  <h3 className="text-h3 !text-base truncate flex-1 min-w-0" title={resume.title}>
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
                {isDefault && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 gap-1 shrink-0 border-amber-400/60 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    {t('app.resumeCard.default', 'Default')}
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
                      {t('app.resumeCard.verifiedScore', '{{score}}% Verified', { score: matchScore })}
                    </Badge>
                  )}
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 text-sm text-primary/80 hover:text-primary mb-1 transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); setShowTargetJobSheet(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('app.resumeCard.setTargetJob', 'Set Target Job')}
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
                  {t('app.resumeCard.editedTime', 'Edited {{time}}', { time: safeFormatDistanceToNow(resume.$updatedAt || resume.$createdAt || Date.now(), { addSuffix: true }) })}
                </span>
                {isPending && (
                  <span className="flex items-center gap-1 text-[10px] text-warning font-medium">
                    <CloudOff className="w-3 h-3" />
                    {t('app.resumeCard.pending', 'Pending')}
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
            aria-label={t('app.resumeCard.moreOptions', 'More options')}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
        )}
      </motion.div>

      <SetTargetJobSheet
        open={showTargetJobSheet}
        onOpenChange={setShowTargetJobSheet}
        resume={resume}
      />

      {/* Actions Bottom Sheet */}
      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent
          side="bottom"
          className="pb-safe max-h-[80dvh] overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setShowActionsSheet(false);
            }
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-base">{resume.title}</SheetTitle>
          </SheetHeader>

          {/* View & Edit */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">{t('app.resumeCard.viewAndEdit', 'View & Edit')}</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); navigateToEditor(`/resume/${resume.$id}`); }}>
              <Eye className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('common.preview', 'Preview')}</span>
            </button>
            {onRename && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); setTimeout(() => setIsRenaming(true), 350); }}>
                <Pencil className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('common.rename', 'Rename')}</span>
              </button>
            )}
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onEdit(resume.$id); }}>
              <Edit2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('common.edit', 'Edit')}</span>
            </button>
          </div>

          <Separator className="my-2" />

          {/* Actions */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">{t('app.resumeCard.actions', 'Actions')}</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => {
              haptics.light(); setShowActionsSheet(false);
              // Load resume into store and navigate to preview for download
              const { setCurrentResumeId, setCurrentResume, setSelectedTemplate } = useResumeStore.getState();
              setCurrentResumeId(resume.$id);
              setCurrentResume(dbToResumeData(resume));
              if (resume.template_id) setSelectedTemplate(resume.template_id as import('@/types/resume').TemplateId);
              navigateToEditor('/preview?action=download');
            }}>
              <Download className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('app.resumeCard.downloadPdf', 'Download PDF')}</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={async () => {
              haptics.light(); setShowActionsSheet(false);
              try {
                await navigator.clipboard.writeText(`${getAppUrl()}/resume/${resume.$id}`);
                toast.success(t('app.resumeCard.linkCopied', 'Link copied to clipboard'));
              } catch { toast.error(t('app.resumeCard.failedToCopyLink', 'Failed to copy link')); }
            }}>
              <Share2 className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('common.share', 'Share')}</span>
            </button>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onDuplicate(resume.$id); }}>
              <Copy className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('common.duplicate', 'Duplicate')}</span>
            </button>
            {onInterview && (
              <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors" onClick={() => { haptics.light(); setShowActionsSheet(false); onInterview(resume.$id); }}>
                <Mic className="w-5 h-5 text-muted-foreground" /><span className="text-sm">{t('app.resumeCard.practiceInterview', 'Practice Interview')}</span>
              </button>
            )}
            <button
              className={`flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors ${isDefault ? 'text-amber-500' : ''}`}
              onClick={() => {
                haptics.medium();
                setDefaultResumeId(isDefault ? null : resume.$id);
                setShowActionsSheet(false);
                toast.success(isDefault ? t('app.resumeCard.defaultCleared', 'Default resume cleared') : t('app.resumeCard.defaultSet', 'Set as default resume'), { duration: 2000 });
              }}
            >
              <Star className={`w-5 h-5 ${isDefault ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">{isDefault ? t('app.resumeCard.unsetAsDefault', 'Unset as Default') : t('app.resumeCard.setAsDefault', 'Set as Default Resume')}</span>
            </button>
          </div>

          <Separator className="my-2" />

          {/* Manage */}
          <div className="space-y-1 pb-2">
            <p className="text-xs text-muted-foreground font-medium px-2 mb-1">{t('app.resumeCard.manage', 'Manage')}</p>
            <button className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-lg hover:bg-muted active:scale-95 touch-manipulation transition-colors text-destructive" onClick={() => { haptics.warning(); setShowActionsSheet(false); onDelete(resume.$id); }}>
              <Trash2 className="w-5 h-5" /><span className="text-sm">{t('common.delete', 'Delete')}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
