import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';
import { useState, useEffect, useRef, useMemo, useDeferredValue, Suspense, useCallback } from 'react';
import { preloadLazy } from '@/lib/preloadLazy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m as motion, AnimatePresence } from 'framer-motion';
import { Search, User, Sparkles, CheckSquare, X, Trash2, WifiOff, ShieldCheck, ExternalLink, AlertCircle, RefreshCw, SlidersHorizontal, Plus } from 'lucide-react';
import { DashboardSkeleton } from '@/components/layout/PageSkeletons';
import { templates } from '@/lib/templateData';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { ResumeGroup, organizeResumeHierarchy } from '@/components/dashboard/ResumeGroup';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { DashboardWorkspaceLayout } from '@/components/dashboard/DashboardWorkspaceLayout';
import { DashboardWorkspaceToolbar } from '@/components/dashboard/DashboardWorkspaceToolbar';
import { DashboardTopCommandBar } from '@/components/dashboard/DashboardTopCommandBar';
import { DashboardIntelligencePanel } from '@/components/dashboard/DashboardIntelligencePanel';
import { DashboardMetricsStrip } from '@/components/dashboard/DashboardMetricsStrip';
import { DashboardDiscoverySection } from '@/components/dashboard/DashboardDiscoverySection';
import { ImportJobSheet } from '@/components/jobs/ImportJobSheet';
import { logWorkspaceActivity, useWorkspaceActivityStore } from '@/store/workspaceActivityStore';
import {
  buildPortfolioAtsChartSeries,
  computeApplicationStrongMatches,
  computeCurrentAtsAverage,
  computePortfolioAtsDelta,
  countResumesWithJobMatchScore,
  countTailoredResumesThisWeek,
} from '@/components/dashboard/dashboardMetricsUtils';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { useSettingsStore } from '@/store/settingsStore';
import { FeatureMapSheet } from '@/components/layout/FeatureMapSheet';
import { trackSession } from '@/lib/discoveryManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlan } from '@/hooks/usePlan';
import { calculateProfileCompletion } from '@/hooks/useProfile';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
import { useAppwriteTailoredIds } from '@/hooks/useTailorHistory';
import { isNormalResume, isTailoredResume } from '@/lib/resumeLineage';
import { OnboardingChecklist, ChecklistStep } from '@/components/dashboard/OnboardingChecklist';

// Lazy-loaded dialogs
const CreateResumeDialog = lazyWithRetry(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const LinkedInImportSheet = lazyWithRetry(() => import('@/components/settings/LinkedInImportSheet').then(m => ({ default: m.LinkedInImportSheet })));
const AnalyzeJobSheet = lazyWithRetry(() => import('@/components/dashboard/AnalyzeJobSheet').then(m => ({ default: m.AnalyzeJobSheet })));

import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useJobs } from '@/hooks/useJobs';

import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore, hydrateHealthScoresForResumes } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { useProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLocale } from '@/i18n/LocaleProvider';

function DashboardPageContent() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authReady, authSettled, signOut } = useAuth();
  const { isMigrating } = useGuestMigration();
  const {
    data: resumes = [],
    isFetched: resumesFetched,
    isPlaceholderData: resumesPlaceholder,
    error: resumesError,
    refetch,
    isLoading: resumesLoading,
    isFetching: resumesFetching,
  } = useResumes();
  const resumesQueryLoading = resumesLoading || resumesFetching || resumesPlaceholder || !resumesFetched;
  const { data: savedJobs = [], isLoading: savedJobsLoading } = useJobs();
  const { deleteResume, deleteMultipleResumes, duplicateResume, updateResume } = useResumeMutations();

  const { setCurrentResume, setCurrentResumeId, tailorHistory } = useResumeStore();
  const { data: appwriteTailoredIds } = useAppwriteTailoredIds();
  const tailoredResumeIds = useMemo(() => {
    const ids = new Set<string>();
    tailorHistory.forEach((h) => { if (h.tailoredResumeId) ids.add(h.tailoredResumeId); });
    appwriteTailoredIds?.forEach((id) => ids.add(id));
    return ids;
  }, [tailorHistory, appwriteTailoredIds]);
  const { scoreResume, scoringId } = useResumeScore();
  const { profile } = useProfile(user?.id);
  const { plan } = usePlan();
  const { hasNew: hasNewChangelog } = useChangelogBadge();
  usePlanUpgradeCelebration();
  const [healthScores, setHealthScores] = useState<Record<string, ResumeHealthScore>>({});

  const cachedHealthScores = useMemo(
    () => (resumes?.length ? hydrateHealthScoresForResumes(resumes, dbToResumeData) : {}),
    [resumes],
  );

  const effectiveHealthScores = useMemo(
    () => ({ ...cachedHealthScores, ...healthScores }),
    [cachedHealthScores, healthScores],
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTailoredParentId, setCreateTailoredParentId] = useState<string | null>(null);
  // searchQuery state moved below with sessionStorage initializer
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [duplicateResumeId, setDuplicateResumeId] = useState<string | null>(null);
  const [deletedResume, setDeletedResume] = useState<{ id: string; title: string } | null>(null);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [showAnalyzeJob, setShowAnalyzeJob] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(false);

  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // tipVisible state removed - tip merged into DashboardStats
  const [isCreating, setIsCreating] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drop legacy persisted list filter from the old dashboard search bar.
  useEffect(() => {
    sessionStorage.removeItem('wr-dash-search');
  }, []);
  const [showTrustBanner, setShowTrustBanner] = useState(() => {
    const visitCount = parseInt(localStorage.getItem('wr-trust-banner-visits') || '0', 10);
    if (visitCount >= 3 || localStorage.getItem('wr-trust-banner-seen')) return false;
    try { localStorage.setItem('wr-trust-banner-visits', String(visitCount + 1)); } catch { /* localStorage full or disabled */ }
    return true;
  });
  const [showFeatureMap, setShowFeatureMap] = useState(false);
  const [importJobOpen, setImportJobOpen] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [exportedChecked, setExportedChecked] = useState(false);
  const { isOnline } = useNetworkStatus();
  const isOffline = !isOnline;


  const [resumeListTab, setResumeListTab] = useState<'all' | 'normal' | 'tailored'>('all');

  // Track session count for progressive disclosure
  useEffect(() => { trackSession(); }, []);

  // Initialize checklist dismissed/exported state from localStorage once user is known
  useEffect(() => {
    if (!user?.id) return;
    setChecklistDismissed(!!localStorage.getItem(`wr-checklist-dismissed-${user.id}`));
    setExportedChecked(!!localStorage.getItem(`wr-checklist-exported-${user.id}`));
  }, [user?.id]);

  // Listen for export completion events dispatched by ExportOptionsSheet
  useEffect(() => {
    if (!user?.id) return;
    const handleExportCompleted = () => {
      localStorage.setItem(`wr-checklist-exported-${user.id}`, 'true');
      setExportedChecked(true);
    };
    window.addEventListener('wr-export-completed', handleExportCompleted);
    return () => window.removeEventListener('wr-export-completed', handleExportCompleted);
  }, [user?.id]);


  // Reset loading state when dialog opens
  useEffect(() => {
    if (showCreateDialog) setIsCreating(false);
  }, [showCreateDialog]);

  // Handle ?action=create query param (from Editor tab redirect)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateDialog(true);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreateNew = useCallback(() => {
    setIsCreating(true);
    setShowCreateDialog(true);
  }, []);

  const handleHeroTailor = useCallback(() => {
    if (resumes && resumes.length > 0) {
      const latest = resumes[0];
      setCurrentResumeId(latest.$id);
      setCurrentResume(dbToResumeData(latest));
    }
    navigate('/tailoring-hub');
  }, [resumes, setCurrentResumeId, setCurrentResume, navigate]);

  const handleContinueEditing = useCallback(() => {
    if (!resumes || resumes.length === 0) return;
    const latest = resumes[0];
    setCurrentResumeId(latest.$id);
    setCurrentResume(dbToResumeData(latest));
    navigate('/editor');
  }, [resumes, setCurrentResumeId, setCurrentResume, navigate]);

  const defaultResumeId = useSettingsStore((s) => s.defaultResumeId);

  const featuredResume = useMemo(() => {
    if (!resumes?.length) return null;
    if (defaultResumeId) {
      const d = resumes.find((r) => r.$id === defaultResumeId);
      if (d) return d;
    }
    return resumes.find((r) => r.is_primary) ?? resumes[0];
  }, [resumes, defaultResumeId]);

  const featuredHealthScore = featuredResume ? effectiveHealthScores[featuredResume.$id] : undefined;

  const atsHistory = useATSScoreHistoryStore((s) => s.history);
  const activeResumeIds = useMemo(() => resumes?.map((r) => r.$id) ?? [], [resumes]);

  const savedJobsCount = savedJobs.length;

  const applicationMatches = useMemo(
    () => (resumes ? computeApplicationStrongMatches(resumes) : 0),
    [resumes],
  );

  const hasJobMatchScores = useMemo(
    () => (resumes ? countResumesWithJobMatchScore(resumes) > 0 : false),
    [resumes],
  );
  const atsAverage = useMemo(
    () => computeCurrentAtsAverage(effectiveHealthScores, activeResumeIds),
    [effectiveHealthScores, activeResumeIds],
  );
  const scoredResumeCount = useMemo(
    () =>
      activeResumeIds.filter((id) => (effectiveHealthScores[id]?.overallScore ?? 0) > 0).length,
    [activeResumeIds, effectiveHealthScores],
  );
  const atsTrendDelta = useMemo(
    () => computePortfolioAtsDelta(atsHistory, activeResumeIds, atsAverage),
    [atsHistory, activeResumeIds, atsAverage],
  );
  const atsChartSeries = useMemo(
    () => buildPortfolioAtsChartSeries(atsHistory, activeResumeIds, atsAverage),
    [atsHistory, activeResumeIds, atsAverage],
  );
  const metricsScoringActive = scoringId !== null;
  const tailoredThisWeek = useMemo(
    () => (resumes ? countTailoredResumesThisWeek(resumes, tailoredResumeIds) : 0),
    [resumes, tailoredResumeIds],
  );

  const handleTailorResume = useCallback(
    (resumeId: string) => {
      const target = resumes?.find((r) => r.$id === resumeId);
      if (!target) return;
      setCurrentResumeId(target.$id);
      setCurrentResume(dbToResumeData(target));
      navigate('/tailoring-hub');
    },
    [resumes, setCurrentResumeId, setCurrentResume, navigate],
  );

  const handleFeaturedTailor = useCallback(() => {
    if (featuredResume) {
      handleTailorResume(featuredResume.$id);
      return;
    }
    handleHeroTailor();
  }, [featuredResume, handleTailorResume, handleHeroTailor]);

  const handleFeaturedEdit = useCallback(() => {
    if (!featuredResume) {
      handleContinueEditing();
      return;
    }
    setCurrentResumeId(featuredResume.$id);
    setCurrentResume(dbToResumeData(featuredResume));
    navigate('/editor');
  }, [featuredResume, setCurrentResumeId, setCurrentResume, navigate, handleContinueEditing]);

  const handleImportJob = useCallback(() => {
    haptics.light();
    setImportJobOpen(true);
  }, []);

  const handleOpenWiseAI = useCallback(() => {
    haptics.light();
    window.dispatchEvent(new Event('open-wise-ai'));
  }, []);

  // Check onboarding status for authenticated users.
  // If the flag is false but the user actually has a resume, that's a
  // half-completed save (network drop between resume insert and the
  // onboarding_completed flip). Reconcile it transparently so the user
  // isn't pushed back through onboarding on next login.
  //
  // First-time users (no profile row, or onboarding_completed=false with no
  // existing resume) are auto-redirected to /onboarding once per browser
  // session. The per-user `wr-onboarding-redirect-attempted-<uid>` flag
  // prevents loops if the user navigates back here without finishing
  // onboarding — in that case the legacy "complete profile" banner is
  // shown so they can dismiss it and stay on the dashboard.
  useEffect(() => {
    if (!user || resumesQueryLoading) return;
    const run = async () => {
      try {
        // Per-user completion key — avoids shared-browser bleed where User A
        // finishing onboarding would silently skip the probe for User B
        // after a sign-out / sign-in on the same device.
        const completedKey = `wr-onboarding-completed-${user.id}`;
        if (localStorage.getItem(completedKey) === 'true') return;

        let data: Record<string, unknown> | null = null;
        try {
          const { databases: db, DATABASE_ID: dbId, Query: q } = await import('@/lib/appwrite');
          const { COLLECTIONS: cols } = await import('@/lib/appwrite-collections');
          const profileRes = await db.listDocuments(dbId, cols.profiles, [
            q.equal('user_id', user.id),
            q.select(['$id', 'onboarding_completed']),
            q.limit(1),
          ]);
          data = (profileRes.documents[0] as Record<string, unknown>) ?? null;
        } catch (apiErr) {
          // Network / Appwrite error — show the banner as a fallback so
          // the user can still get to onboarding manually. Do NOT cache the
          // outcome so the next mount retries.
          console.warn('[DashboardPage] Onboarding profile check error:', apiErr);
          if (!sessionStorage.getItem('wr-dismissed-profile-banner')) {
            setShowProfileBanner(true);
          }
          return;
        }

        if (data?.onboarding_completed) {
          localStorage.setItem(completedKey, 'true');
          // Clean up the per-user redirect flag so a future signed-out /
          // signed-in cycle on the same browser starts clean.
          try { sessionStorage.removeItem(`wr-onboarding-redirect-attempted-${user.id}`); } catch { /* ignore */ }
          return;
        }

        // Decide whether onboarding still needs to run.
        let needsOnboarding = false;
        if (data && !data.onboarding_completed) {
          // Try to reconcile: if a resume row already exists, the earlier
          // writes succeeded — flip the flag and treat as completed.
          const { reconcileOnboardingCompletion } = await import('@/lib/onboardingProfile');
          const fixed = await reconcileOnboardingCompletion(user.id);
          if (fixed) {
            localStorage.setItem(completedKey, 'true');
            try { sessionStorage.removeItem(`wr-onboarding-redirect-attempted-${user.id}`); } catch { /* ignore */ }
            return;
          }
          needsOnboarding = true;
        }
        // data === null means brand-new user with no profile row yet — treat as onboarding needed.
        if (!data) {
          needsOnboarding = true;
        }

        if (needsOnboarding) {
          // First time we hit this branch in the session: send the user to
          // /onboarding so they actually see the flow. The redirect is
          // intentionally NOT gated on the dismissed-profile-banner flag —
          // a brand-new user must always be taken to onboarding, even if a
          // previous tab in the same session dismissed the banner. The
          // per-user redirect-attempted session flag self-throttles to one
          // attempt per user per session, so loops are not possible. If
          // they navigate back here without completing onboarding, fall
          // through to the dismissable banner instead.
          const redirectFlag = `wr-onboarding-redirect-attempted-${user.id}`;
          if (!sessionStorage.getItem(redirectFlag)) {
            sessionStorage.setItem(redirectFlag, '1');
            navigate('/onboarding', { replace: true });
            return;
          }
          if (!sessionStorage.getItem('wr-dismissed-profile-banner')) {
            setShowProfileBanner(true);
          }
        }
      } catch (err) {
        console.warn('[DashboardPage] Onboarding check unexpected exception:', err);
        if (!sessionStorage.getItem('wr-dismissed-profile-banner')) {
          setShowProfileBanner(true);
        }
      }
    };
    run();
  }, [user, navigate, resumesQueryLoading]);

  // Persist flag when user has at least one resume (guards against stale quickstart localStorage)
  useEffect(() => {
    if (resumes && resumes.length > 0) {
      try { localStorage.setItem('wr-quickstart-had-resume', 'true'); } catch { /* ignore */ }
    }
  }, [resumes]);

  // Keyboard shortcuts for empty state
  useEffect(() => {
    if (resumes && resumes.length > 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'n') handleCreateNew();
      if (e.key.toLowerCase() === 'i') navigate('/upload');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resumes, handleCreateNew, navigate]);

  // Scores are hydrated synchronously in cachedHealthScores (local cache + deterministic calc).

  const [onboardingTemplateId, setOnboardingTemplateId] = useState<string | null>(null);

  // Consume onboarding template selection if present
  useEffect(() => {
    const savedTemplate = localStorage.getItem('wr-onboarding-template');
    if (savedTemplate) {
      localStorage.removeItem('wr-onboarding-goal');
      localStorage.removeItem('wr-onboarding-template');
      setOnboardingTemplateId(savedTemplate);
      setShowCreateDialog(true);
    }
  }, []);

  const handleRefresh = async () => {
    await refetch();
    haptics.success();
    toast.success(t('app.dashboardPage.resumesRefreshed', 'Resumes refreshed'));
  };

  const handleEdit = useCallback((resumeId: string) => {
    haptics.light();
    const resume = resumes?.find(r => r.$id === resumeId);
    if (resume) {
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      if (isTailoredResume(resume, tailoredResumeIds)) {
        const histEntry = tailorHistory.find((h) => h.tailoredResumeId === resumeId);
        navigate(`/tailoring-hub/result/${resumeId}`, {
          state: histEntry
            ? {
                jobTitle: histEntry.jobTitle,
                company: histEntry.company,
                jobUrl: histEntry.jobUrl ?? null,
                scoreBeforeAfter: histEntry.scoreBeforeAfter,
                appliedSections: histEntry.appliedSections,
              }
            : undefined,
        });
      } else {
        navigate('/editor');
      }
    }
  }, [resumes, setCurrentResumeId, setCurrentResume, navigate, tailoredResumeIds, tailorHistory]);

  const handleDuplicate = useCallback((resumeId: string) => {
    setDuplicateResumeId(resumeId);
  }, []);

  const confirmDuplicate = useCallback(async () => {
    if (!duplicateResumeId) return;
    haptics.success();
    try {
      const source = resumes?.find((r) => r.$id === duplicateResumeId);
      const dupDoc = await duplicateResume.mutateAsync(duplicateResumeId);
      logWorkspaceActivity({
        type: 'resume_duplicated',
        resumeId: dupDoc.$id,
        resumeTitle: (dupDoc as { title?: string }).title ?? source?.title,
        parentResumeTitle: source?.title,
      });
      toast.success(t('app.dashboardPage.resumeDuplicated', 'Resume duplicated successfully'));
    } catch {
      // error handled by mutation
    } finally {
      setDuplicateResumeId(null);
    }
  }, [duplicateResumeId, duplicateResume, resumes]);

  const handleInterview = useCallback((resumeId: string) => {
    const resume = resumes?.find(r => r.$id === resumeId);
    if (resume) {
      haptics.light();
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      navigate('/interview');
    }
  }, [resumes, setCurrentResumeId, setCurrentResume, navigate]);

  const handleRename = useCallback(async (resumeId: string, newTitle: string) => {
    try {
      const prev = resumes?.find((r) => r.$id === resumeId);
      await updateResume.mutateAsync({ resumeId, updates: {}, title: newTitle });
      logWorkspaceActivity({
        type: 'resume_renamed',
        resumeId,
        resumeTitle: prev?.title,
        newTitle,
      });
      toast.success(t('app.dashboardPage.resumeRenamed', 'Resume renamed'));
    } catch {
      toast.error(t('app.dashboardPage.resumeRenameFailed', 'Failed to rename resume'));
    }
  }, [updateResume, resumes]);

  const handleDelete = useCallback((resumeId: string) => {
    setDeleteResumeId(resumeId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteResumeId) return;
    const resumeToDelete = resumes?.find(r => r.$id === deleteResumeId);
    if (resumeToDelete) {
      setDeletedResume({ id: resumeToDelete.$id, title: resumeToDelete.title });
    }
    haptics.warning();
    try {
      await deleteResume.mutateAsync(deleteResumeId);
      logWorkspaceActivity({
        type: 'resume_deleted',
        resumeId: deleteResumeId,
        resumeTitle: resumeToDelete?.title,
      });
      useATSScoreHistoryStore.getState().clearHistory(deleteResumeId!);
      useWorkspaceActivityStore.getState().pruneResume(deleteResumeId);
      toast.success(t('app.dashboardPage.resumeDeleted', '"{{title}}" deleted', { title: resumeToDelete?.title ?? '' }), { duration: 3000 });
    } catch {
      // error handled by mutation
    } finally {
      setDeleteResumeId(null);
    }
  }, [deleteResumeId, resumes, deleteResume]);

  // Deferred search for smoother typing
  const deferredSearch = useDeferredValue(searchQuery);

  // Filter resumes by search query
  const filteredResumes = useMemo(() => {
    if (!resumes) return undefined;
    let result = resumes;

    // Text search
    if (deferredSearch) {
      const query = deferredSearch.toLowerCase();
      result = result.filter(resume =>
        resume.title.toLowerCase().includes(query) ||
        resume.target_job_title?.toLowerCase().includes(query) ||
        resume.target_company?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [resumes, deferredSearch]);

  const tailoredResumes = useMemo(
    () => filteredResumes?.filter((r) => isTailoredResume(r, tailoredResumeIds)) ?? [],
    [filteredResumes, tailoredResumeIds],
  );

  const normalResumes = useMemo(
    () => filteredResumes?.filter((r) => isNormalResume(r, tailoredResumeIds)) ?? [],
    [filteredResumes, tailoredResumeIds],
  );

  const displayedResumes = useMemo(() => {
    const pool =
      resumeListTab === 'tailored'
        ? tailoredResumes
        : resumeListTab === 'normal'
          ? normalResumes
          : filteredResumes ?? [];
    return [...pool].sort(
      (a, b) =>
        new Date(b.$updatedAt || b.$createdAt || 0).getTime() -
        new Date(a.$updatedAt || a.$createdAt || 0).getTime(),
    );
  }, [resumeListTab, tailoredResumes, normalResumes, filteredResumes]);

  // Organize resumes into hierarchy
  const resumeHierarchy = useMemo(() => {
    if (!filteredResumes) return null;
    return organizeResumeHierarchy(filteredResumes);
  }, [filteredResumes]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!filteredResumes) return;
    setSelectedIds(new Set(filteredResumes.map(r => r.$id)));
  }, [filteredResumes]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    haptics.warning();
    setShowBulkDeleteConfirm(false);

    const count = selectedIds.size;
    const idsToDelete = [...selectedIds];

    // Show undo toast immediately
    toast.success(t('app.dashboardPage.bulkDeleted', '{{count}} resume(s) deleted', { count }), {
      description: t('app.dashboardPage.undoHint', 'You can undo this action within 5 seconds.'),
      action: {
        label: t('common.undo', 'Undo'),
        onClick: () => {
          if (pendingDeleteRef.current) {
            clearTimeout(pendingDeleteRef.current);
            pendingDeleteRef.current = null;
          }
          toast.info(t('app.dashboardPage.deleteCancelled', 'Delete cancelled'));
        },
      },
    });

    // Buffer the actual delete for 5 seconds
    pendingDeleteRef.current = setTimeout(() => {
      deleteMultipleResumes.mutate(idsToDelete, {
        onSuccess: () => {
          logWorkspaceActivity({
            type: 'resumes_bulk_deleted',
            count: idsToDelete.length,
          });
          idsToDelete.forEach((id) => {
            useATSScoreHistoryStore.getState().clearHistory(id);
            useWorkspaceActivityStore.getState().pruneResume(id);
          });
          exitSelectionMode();
        },
      });
    }, 5000);
  }, [selectedIds, deleteMultipleResumes, exitSelectionMode]);

  const checklistSteps = useMemo((): ChecklistStep[] => {
    const hasAnyScore = Object.values(effectiveHealthScores).some(s => (s.overallScore ?? 0) > 0);
    const hasTargetJob = resumes.some(r => r.target_job_title);
    return [
      { id: 'first-resume', label: t('app.dashboardPage.checklist.createResume', 'Create your first resume'), description: t('app.dashboardPage.checklist.createResumeDesc', 'Build a professional resume to get started.'), done: resumes.length > 0, href: '/dashboard?action=create' },
      { id: 'ats-check', label: t('app.dashboardPage.checklist.atsCheck', 'Run an ATS check'), description: t('app.dashboardPage.checklist.atsCheckDesc', 'See how well your resume scores with recruiters.'), done: hasAnyScore, href: '/editor' },
      { id: 'export', label: t('app.dashboardPage.checklist.export', 'Export your resume'), description: t('app.dashboardPage.checklist.exportDesc', 'Download your resume as PDF or PNG.'), done: exportedChecked, href: '/editor' },
      { id: 'target-job', label: t('app.dashboardPage.checklist.targetJob', 'Set a target job'), description: t('app.dashboardPage.checklist.targetJobDesc', 'Tailor your resume for specific roles.'), done: hasTargetJob, href: '/tailoring-hub' },
      { id: 'portfolio', label: t('app.dashboardPage.checklist.portfolio', 'View your portfolio'), description: t('app.dashboardPage.checklist.portfolioDesc', 'Share your professional portfolio online.'), done: !!profile?.portfolioEnabled, href: '/portfolio' },
    ];
  }, [resumes, effectiveHealthScores, exportedChecked, profile?.portfolioEnabled]);

  const onboardingCompleted = user?.id ? localStorage.getItem(`wr-onboarding-completed-${user.id}`) === 'true' : false;
  const isPowerUser = resumes.length >= 3 || resumes.some(r => r.parent_resume_id);
  const showChecklist = !!user && onboardingCompleted && !checklistDismissed && !showProfileBanner && !isPowerUser && !checklistSteps.every(s => s.done);

  const handleDismissChecklist = useCallback(() => {
    setChecklistDismissed(true);
    if (user?.id) localStorage.setItem(`wr-checklist-dismissed-${user.id}`, 'true');
  }, [user?.id]);

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } }
  };

  // Handle creating a tailored version
  const handleCreateTailored = useCallback((parentId: string) => {
    setCreateTailoredParentId(parentId);
    setShowCreateDialog(true);
  }, []);

  // Auth guard handled by ProtectedRoute

  const authBootstrapping = !authSettled;

  const resumesKnownEmpty =
    !resumesQueryLoading && !resumesError && resumes.length === 0;

  const resumesBootstrapping =
    authReady &&
    !!user &&
    !resumesError &&
    resumesQueryLoading;

  if (authBootstrapping) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-6 pb-3">
          <p className="text-sm font-medium text-foreground">{t('app.loadingWorkspace', 'Loading your workspace')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.syncingWorkspaceDescription', "We're syncing your resumes, scores, and recent activity.")}
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (resumesBootstrapping) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="px-4 pt-6 pb-3">
          <p className="text-sm font-medium text-foreground">{t('app.loadingResumes', 'Loading your resumes')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.syncingFromCloudDescription', 'Syncing your workspace from the cloud…')}
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Only show error if we're online and the fetch actually failed after the bridge was ready
  if (resumesError && !isOffline && authReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t('errors.somethingWentWrong', 'Something went wrong')}</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">{t('errors.couldNotLoadResumesDescription', "We couldn't load your resumes. Please check your connection and try again.")}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  const hasWorkspace = resumes.length > 0;
  const showEmptyDashboard = resumesKnownEmpty;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* All scrollable content inside PullToRefresh */}
      <PullToRefresh
        onRefresh={handleRefresh}
        className={cn(
          'flex flex-1 min-h-0 flex-col',
          hasWorkspace
            ? 'overflow-hidden dashboard-workspace-os-bg'
            : 'overflow-y-auto overscroll-y-contain dashboard-atlas-bg',
        )}
      >
        <div
          className={cn(
            'pb-safe w-full mx-auto',
            hasWorkspace && 'flex min-h-0 flex-1 flex-col',
          )}
        >
          {showEmptyDashboard && (
            <>
              <DashboardTopBar
                hasResumes={false}
                compact={false}
                onOptimize={handleFeaturedTailor}
                onBuild={handleCreateNew}
              />
              <DashboardStats
                totalResumes={0}
                healthScores={effectiveHealthScores}
                userName={profile?.fullName}
                userId={user?.id}
              />
            </>
          )}

          {showEmptyDashboard && (
            <DashboardHero
              hasResumes={false}
              onBuild={handleCreateNew}
              onTailor={handleHeroTailor}
            />
          )}

          {/* Filter/Sort bar removed — simplified UI */}

          {/* Content */}
          {resumesError && !resumes && !navigator.onLine ? (
            /* Offline and no cached data — show specific offline state */
            <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t('errors.youAreOffline', "You're offline")}</h3>
                <p className="text-sm text-muted-foreground">{t('errors.connectToInternet', 'Connect to the internet to load your resumes.')}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="text-sm text-primary hover:underline min-h-[44px] touch-manipulation flex items-center"
                aria-label={t('errors.retryLoadingResumes', 'Retry loading resumes')}
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          ) : resumesError && !resumes ? (
            /* Server error while online — show actionable error state (D-2) */
            <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t('errors.somethingWentWrong', 'Something went wrong')}</h3>
                <p className="text-sm text-muted-foreground">{t('errors.couldNotLoadResumes', "We couldn't load your resumes.")}</p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="min-h-[44px] gap-2" aria-label={t('errors.retryLoadingResumes', 'Retry loading resumes')}>
                <RefreshCw className="w-4 h-4" />
                {t('errors.tapToRetry', 'Tap to retry')}
              </Button>
            </div>
          ) : showEmptyDashboard ? (
            <>
              <EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => navigate('/onboarding')} onImportProfile={() => setShowLinkedInImport(true)} />
            </>
          ) : (
            <DashboardWorkspaceLayout
              topBar={
                <DashboardTopCommandBar
                  onImportJob={handleImportJob}
                  onOpenWiseAI={handleOpenWiseAI}
                />
              }
              intelligence={
                <DashboardIntelligencePanel
                  healthScore={featuredHealthScore}
                  featuredResume={featuredResume}
                  resumes={resumes}
                  healthScores={effectiveHealthScores}
                  atsAverage={atsAverage}
                  scoringId={scoringId}
                  scoresLoading={scoringId !== null && !featuredHealthScore}
                  onOpenImportJob={handleImportJob}
                  onEditResume={handleEdit}
                  onTailorResume={handleTailorResume}
                />
              }
            >
              <div className="dashboard-workspace-main-inner flex min-h-0 flex-1 flex-col overflow-hidden">
              <DashboardWorkspaceToolbar userName={profile?.fullName} />

              <DashboardMetricsStrip
                resumes={resumes}
                healthScores={effectiveHealthScores}
                atsAverage={atsAverage}
                scoredResumeCount={scoredResumeCount}
                tailoredThisWeek={tailoredThisWeek}
                applicationMatches={applicationMatches}
                hasJobMatchScores={hasJobMatchScores}
                savedJobsCount={savedJobsCount}
                savedJobs={savedJobs}
                isSavedJobsLoading={savedJobsLoading && savedJobs.length === 0}
                onImportJob={handleImportJob}
                atsTrendDelta={atsTrendDelta}
                atsChartSeries={atsChartSeries}
                isScoring={metricsScoringActive}
                scoringId={scoringId}
                onEditResume={handleEdit}
                onTailorResume={handleTailorResume}
                tailoredIds={tailoredResumeIds}
              />

              <div className="dashboard-workspace-main-body flex min-h-0 flex-1 flex-col xl:overflow-y-auto xl:overscroll-y-contain">
                <div className="dashboard-recent-resumes-head flex w-full min-w-0 flex-col gap-2.5 mb-2.5 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <Tabs
                      value={resumeListTab}
                      onValueChange={(v) => {
                        haptics.selection();
                        setResumeListTab(v as 'all' | 'normal' | 'tailored');
                      }}
                    >
                      <TabsList className="h-9 p-0.5 rounded-xl bg-muted/40 border border-border/40">
                        <TabsTrigger
                          value="all"
                          className="h-8 px-3 text-xs rounded-lg data-[state=active]:shadow-none data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border/50"
                        >
                          {t('app.dashboardPage.tabAll', 'All')}
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center tabular-nums"
                          >
                            {filteredResumes?.length ?? 0}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                          value="normal"
                          className="h-8 px-3 text-xs rounded-lg data-[state=active]:shadow-none data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border/50"
                        >
                          {t('app.dashboardPage.tabNormal', 'Normal')}
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center tabular-nums"
                          >
                            {normalResumes.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                          value="tailored"
                          className="h-8 px-3 text-xs rounded-lg data-[state=active]:shadow-none data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border/50"
                        >
                          {t('app.dashboardPage.tabTailored', 'Tailored')}
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center tabular-nums"
                          >
                            {tailoredResumes.length}
                          </Badge>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  <div className="flex items-center gap-1.5 sm:ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs rounded-lg gap-1.5 hidden sm:flex"
                      onClick={() => {
                        haptics.light();
                        setShowCreateDialog(true);
                      }}
                      aria-label={t('app.dashboardPage.newResume', 'Create new resume')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('app.dashboardPage.newResume', 'New Resume')}
                    </Button>
                    <div className="relative min-w-0 sm:w-52">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t('app.dashboardPage.searchPlaceholder', 'Search resumes...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-7 text-xs rounded-lg border-border/50 bg-card/50"
                        aria-label={t('app.dashboardPage.searchPlaceholder', 'Search recent resumes')}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-8 w-8 rounded-lg',
                            selectionMode ? 'text-primary bg-primary/10' : 'text-muted-foreground',
                          )}
                          onClick={() => haptics.light()}
                          aria-label={t('app.dashboardPage.listActions', 'Resume list actions')}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {!selectionMode ? (
                          <DropdownMenuItem
                            onClick={() => {
                              haptics.selection();
                              setSelectionMode(true);
                            }}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {t('app.dashboardPage.selectResumes', 'Select resumes')}
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                              {t('app.dashboardPage.selectedCount', '{{count}} selected', { count: selectedIds.size })}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                haptics.light();
                                handleSelectAll();
                              }}
                            >
                              {t('common.selectAll', 'Select all')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={selectedIds.size === 0}
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                haptics.warning();
                                setShowBulkDeleteConfirm(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('app.dashboardPage.deleteSelected', 'Delete selected')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                haptics.light();
                                exitSelectionMode();
                              }}
                            >
                              {t('app.dashboardPage.cancelSelection', 'Cancel selection')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  </div>
                </div>

                <div className="dashboard-resume-list-scroll w-full min-w-0 flex-1 xl:overflow-y-auto xl:overscroll-y-contain">
                <motion.div
                  className="space-y-2 pb-20 lg:pb-1"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                >
                  {(() => {
                    return (
                      <>
                        {displayedResumes.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-border/50 bg-card/40 px-4 py-10 text-center">
                            <p className="text-sm font-medium text-foreground">
                              {deferredSearch && resumeListTab === 'all'
                                ? t('app.dashboardPage.noMatchSearch', 'No resumes match "{{q}}"', { q: deferredSearch })
                                : resumeListTab === 'tailored'
                                  ? t('app.dashboardPage.noTailoredYet', 'No tailored resumes yet')
                                  : resumeListTab === 'normal'
                                    ? t('app.dashboardPage.noNormalYet', 'No normal resumes yet')
                                    : t('app.dashboardPage.noResumesYet', 'No resumes yet')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                              {deferredSearch && resumeListTab === 'all'
                                ? t('app.dashboardPage.tryDifferentKeyword', 'Try a different keyword or clear your search.')
                                : resumeListTab === 'tailored'
                                  ? t('app.dashboardPage.createTailoredHint', 'Create a tailored copy from any master resume using Tailor to Job.')
                                  : resumeListTab === 'normal'
                                    ? t('app.dashboardPage.normalResumeHint', 'Normal resumes are your original CVs — not job-specific tailored copies.')
                                    : t('app.dashboardPage.createFirstHint', 'Create your first resume to get started.')}
                            </p>
                            {deferredSearch && resumeListTab === 'all' && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => setSearchQuery('')}
                                className="mt-2 h-8"
                              >
                              {t('app.dashboardPage.clearSearch', 'Clear search')}
                              </Button>
                            )}
                            {resumeListTab === 'tailored' && normalResumes.length > 0 && (
                              <Button
                                size="sm"
                                className="mt-4 h-9 rounded-xl text-xs"
                                onClick={() => {
                                  const master = normalResumes[0];
                                  if (master) handleTailorResume(master.$id);
                                }}
                              >
                                {t('app.dashboardPage.tailorResume', 'Tailor a resume')}
                              </Button>
                            )}
                          </div>
                        )}
                        {displayedResumes.map((resume) => {
                          const tailored = isTailoredResume(resume, tailoredResumeIds);
                          const isMaster = !tailored;
                          return (
                            <motion.div key={resume.$id} variants={itemVariants}>
                              <ResumeListCard
                                resume={resume}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRename={handleRename}
                                onInterview={handleInterview}
                                showMasterBadge={
                                  isMaster && !!resumeHierarchy?.tailoredByParent[resume.$id]?.length
                                }
                                showTailoredBadge={tailored}
                                healthScore={effectiveHealthScores[resume.$id]}
                                isScoring={scoringId === resume.$id}
                                selectionMode={selectionMode}
                                selected={selectedIds.has(resume.$id)}
                                onToggleSelect={toggleSelection}
                                presentation="workspace"
                                onTailor={handleTailorResume}
                                isProcessing={
                                  (deleteResume.isPending && deleteResume.variables === resume.$id) ||
                                  (duplicateResume.isPending && duplicateResume.variables === resume.$id)
                                }
                              />
                            </motion.div>
                          );
                        })}
                      </>
                    );
                  })()}
                </motion.div>
                </div>

              <div className="dashboard-workspace-bottom shrink-0 hidden lg:block">
              {!resumesBootstrapping && <DashboardDiscoverySection compact className="shrink-0" />}

              {(showTrustBanner || showProfileBanner || showChecklist) && (
                <div className="dashboard-workspace-footer mt-2 space-y-1.5 pb-1">
                  {showTrustBanner && (
                    <div className="flex items-center gap-2 py-1.5 text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground flex-1">{t('app.dashboardPage.footerEncrypted', 'Your career data is encrypted, private, and never shared.')}</p>
                      <button
                        onClick={() => { setShowTrustBanner(false); localStorage.setItem('wr-trust-banner-seen', 'true'); }}
                        className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted/50"
                        aria-label={t('common.dismiss', 'Dismiss')}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {showProfileBanner && (
                    <div className="flex items-center gap-2 py-1.5">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs font-medium text-foreground flex-1">{t('app.dashboardPage.footerCompleteProfile', 'Complete your profile for the best experience.')}</p>
                      <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="shrink-0 h-8 text-xs">
                        {t('common.complete', 'Complete')}
                      </Button>
                      <button
                        onClick={() => { setShowProfileBanner(false); sessionStorage.setItem('wr-dismissed-profile-banner', 'true'); }}
                        className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {showChecklist && (
                    <OnboardingChecklist
                      steps={checklistSteps}
                      onDismiss={handleDismissChecklist}
                      defaultCollapsed
                    />
                  )}
                </div>
              )}
              </div>
              </div>
              </div>
            </DashboardWorkspaceLayout>
          )}

          {showEmptyDashboard && (
            <div className="px-3 sm:px-4 lg:px-6 max-w-3xl mx-auto w-full">
              <DashboardDiscoverySection />
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Create Resume Dialog - lazy loaded */}
      <Suspense fallback={null}>
        {showCreateDialog && (
          <CreateResumeDialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setCreateTailoredParentId(null);
                setOnboardingTemplateId(null);
              }
            }}
            existingResumes={resumes || []}
            parentResumeId={createTailoredParentId}
            defaultTemplateId={onboardingTemplateId}
            onLinkedInImport={() => setShowLinkedInImport(true)}
          />
        )}
      </Suspense>



      <ImportJobSheet open={importJobOpen} onOpenChange={setImportJobOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={(open) => { if (!open && !deleteResume.isPending) setDeleteResumeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('app.dashboardPage.deleteTitle', 'Delete Resume?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('app.dashboardPage.deleteDesc', 'This will permanently delete this resume. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()} disabled={deleteResume.isPending}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteResume.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2"
            >
              {deleteResume.isPending && <MiniSpinner size={14} />}
              {deleteResume.isPending ? t('app.dashboardPage.deleting', 'Deleting…') : t('app.dashboardPage.deletePermanently', 'Delete Permanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('app.dashboardPage.bulkDeleteTitle', 'Delete {{count}} Resume(s)?', { count: selectedIds.size })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('app.dashboardPage.bulkDeleteDesc', 'This will permanently delete these resumes. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('app.dashboardPage.deletePermanently', 'Delete Permanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={!!duplicateResumeId} onOpenChange={(open) => { if (!open && !duplicateResume.isPending) setDuplicateResumeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('app.dashboardPage.duplicateTitle', 'Duplicate Resume?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('app.dashboardPage.duplicateDesc', 'This will create a copy of this resume with all its content.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()} disabled={duplicateResume.isPending}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDuplicate(); }}
              disabled={duplicateResume.isPending}
              className="inline-flex items-center gap-2"
            >
              {duplicateResume.isPending && <MiniSpinner size={14} />}
              {duplicateResume.isPending ? t('app.dashboardPage.duplicating', 'Duplicating…') : t('common.duplicate', 'Duplicate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LinkedIn Import Sheet - only mount when open */}
      {showLinkedInImport && (
        <Suspense fallback={null}>
          <LinkedInImportSheet
            open={showLinkedInImport}
            onOpenChange={setShowLinkedInImport}
            onImport={async (data) => {
              // Create a new resume from LinkedIn data
              if (!user) return;
              const contactInfo = {
                fullName: '',
                email: user.email || '',
                phone: '',
                location: '',
              };
              const newResume = {
                title: 'LinkedIn Import',
                user_id: user.id,
                contact_info: contactInfo,
                summary: data.summary || '',
                experience: (data.experience || []).map((exp, i) => ({
                  id: String(i + 1),
                  company: exp.company,
                  position: exp.title,
                  startDate: exp.startDate,
                  endDate: exp.endDate,
                  current: exp.current,
                  description: exp.description,
                  achievements: [],
                })),
                education: (data.education || []).map((edu, i) => ({
                  id: String(i + 1),
                  institution: edu.institution,
                  degree: edu.degree,
                  field: edu.field || '',
                  startDate: edu.startYear || '',
                  endDate: edu.endYear || '',
                })),
                skills: data.skills || [],
              };
              const { databases: db, DATABASE_ID: dbId, ID: aw_id } = await import('@/lib/appwrite');
              const { COLLECTIONS: cols } = await import('@/lib/appwrite-collections');
              let createdId: string | null = null;
              try {
                const doc = await db.createDocument(dbId, cols.resumes, aw_id.unique(), {
                  user_id: user.id,
                  title: newResume.title,
                  contact_info: JSON.stringify(contactInfo),
                  summary: newResume.summary || '',
                  experience: JSON.stringify(newResume.experience || []),
                  education: JSON.stringify(newResume.education || []),
                  skills: JSON.stringify(newResume.skills || []),
                  template: DEFAULT_RESUME_TEMPLATE_ID,
                });
                createdId = doc.$id;
              } catch (e) {
                console.error('Failed to create resume from LinkedIn import', e);
              }
              if (createdId) {
                setCurrentResumeId(createdId);
                setCurrentResume({
                  id: createdId,
                  contactInfo: contactInfo,
                  summary: newResume.summary || '',
                  experience: (newResume.experience || []) as never,
                  education: (newResume.education || []) as never,
                  skills: (newResume.skills || []) as never,
                  certifications: [],
                  templateId: DEFAULT_RESUME_TEMPLATE_ID,
                });
                haptics.success();
                toast.success(t('app.dashboardPage.linkedInImported', 'Resume created from LinkedIn!'));
                refetch();
                navigate('/editor');
              }
            }}
            linkedinUsername={profile?.linkedinUrl?.replace(/.*linkedin\.com\/in\//, '').replace(/\/$/, '')}
          />
        </Suspense>
      )}

      {/* Analyze Job Sheet - only mount when open */}
      {showAnalyzeJob && (
        <Suspense fallback={null}>
          <AnalyzeJobSheet open={showAnalyzeJob} onOpenChange={setShowAnalyzeJob} />
        </Suspense>
      )}
      {/* Feature Map Sheet */}
      <FeatureMapSheet open={showFeatureMap} onOpenChange={setShowFeatureMap} />

    </div>
  );
}

export default function DashboardPage() {
  return (
    <LazyMotion features={domAnimation}>
      <DashboardPageContent />
    </LazyMotion>
  );
}
