import { useState, useEffect, useRef, useMemo, useDeferredValue, lazy, Suspense, useCallback } from 'react';
import { preloadLazy } from '@/lib/preloadLazy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m as motion, AnimatePresence } from 'framer-motion';
import { Search, User, Sparkles, CheckSquare, X, Trash2, WifiOff, ShieldCheck, ExternalLink, AlertCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';
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
  computeTotalMissingKeywords,
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
import { OnboardingChecklist, ChecklistStep } from '@/components/dashboard/OnboardingChecklist';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const LinkedInImportSheet = lazy(() => import('@/components/settings/LinkedInImportSheet').then(m => ({ default: m.LinkedInImportSheet })));
const AnalyzeJobSheet = lazy(() => import('@/components/dashboard/AnalyzeJobSheet').then(m => ({ default: m.AnalyzeJobSheet })));

import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';

import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore, backgroundScore } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
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

function DashboardPageContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authReady, authSettled, signOut } = useAuth();
  const { isMigrating } = useGuestMigration();
  const { 
    data: resumes = [], 
    isLoading: resumesLoading, 
    isInitialLoading: resumesInitialLoading,
    error: resumesError,
    refetch 
  } = useResumes();
  const { deleteResume, deleteMultipleResumes, duplicateResume, updateResume } = useResumeMutations();

  const { setCurrentResume, setCurrentResumeId, tailorHistory } = useResumeStore();
  const { data: appwriteTailoredIds } = useAppwriteTailoredIds();
  const tailoredResumeIds = useMemo(() => {
    const ids = new Set<string>();
    tailorHistory.forEach((h) => { if (h.tailoredResumeId) ids.add(h.tailoredResumeId); });
    appwriteTailoredIds?.forEach((id) => ids.add(id));
    return ids;
  }, [tailorHistory, appwriteTailoredIds]);
  const { scoreResume, getCachedScore, scoringId } = useResumeScore();
  const { profile } = useProfile(user?.id);
  const { plan } = usePlan();
  const { hasNew: hasNewChangelog } = useChangelogBadge();
  usePlanUpgradeCelebration();
  const [healthScores, setHealthScores] = useState<Record<string, ResumeHealthScore>>({});

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
  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem('wr-dash-search') || ''
  );
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


  const [resumeListTab, setResumeListTab] = useState<'all' | 'tailored'>('all');

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


  // Persist helpers for sessionStorage sync (D-3)
  const handleSetSearchQuery = useCallback((q: string) => {
    sessionStorage.setItem('wr-dash-search', q);
    setSearchQuery(q);
  }, []);


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

  const featuredHealthScore = featuredResume ? healthScores[featuredResume.$id] : undefined;

  const atsHistory = useATSScoreHistoryStore((s) => s.history);
  const activeResumeIds = useMemo(() => resumes?.map((r) => r.$id) ?? [], [resumes]);

  const missingKeywordsCount = useMemo(
    () => computeTotalMissingKeywords(healthScores, activeResumeIds),
    [healthScores, activeResumeIds],
  );

  const applicationMatches = useMemo(
    () => (resumes ? computeApplicationStrongMatches(resumes) : 0),
    [resumes],
  );

  const hasJobMatchScores = useMemo(
    () => (resumes ? countResumesWithJobMatchScore(resumes) > 0 : false),
    [resumes],
  );
  const atsAverage = useMemo(
    () => computeCurrentAtsAverage(healthScores, activeResumeIds),
    [healthScores, activeResumeIds],
  );
  const scoredResumeCount = useMemo(
    () =>
      activeResumeIds.filter((id) => (healthScores[id]?.overallScore ?? 0) > 0).length,
    [activeResumeIds, healthScores],
  );
  const atsTrendDelta = useMemo(
    () => computePortfolioAtsDelta(atsHistory, activeResumeIds, atsAverage),
    [atsHistory, activeResumeIds, atsAverage],
  );
  const atsChartSeries = useMemo(
    () => buildPortfolioAtsChartSeries(atsHistory, activeResumeIds, atsAverage),
    [atsHistory, activeResumeIds, atsAverage],
  );
  const tailoredThisWeek = useMemo(
    () => (resumes ? countTailoredResumesThisWeek(resumes) : 0),
    [resumes],
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
    if (!user) return;
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
  }, [user, navigate]);

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

  // Auto-score resumes in background (up to 3 concurrent, debounced)
  useEffect(() => {
    if (!resumes || resumes.length === 0) return;

    let cancelled = false;

    const scoreOne = async (resume: typeof resumes[0]) => {
      if (cancelled) return;
      const rid = resume.$id;
      const rUpdatedAt = resume.$updatedAt;
      const cached = getCachedScore(rid, rUpdatedAt);
      if (cached) {
        setHealthScores(prev => ({ ...prev, [rid]: cached }));
        return;
      }
      const resumeData = dbToResumeData(resume);
      await backgroundScore(rid, resumeData, rUpdatedAt);
      const newCached = getCachedScore(rid, rUpdatedAt);
      if (newCached && !cancelled) {
        setHealthScores(prev => ({ ...prev, [rid]: newCached }));
      }
    };

    const scoreAll = async () => {
      if (cancelled) return;
      // Concurrency limit of 3: process resumes in batches to avoid
      // overwhelming the main thread while still parallelising scoring.
      const CONCURRENCY = 3;
      for (let i = 0; i < resumes.length && !cancelled; i += CONCURRENCY) {
        const batch = resumes.slice(i, i + CONCURRENCY);
        await Promise.allSettled(batch.map(scoreOne));
        // Yield to the main thread between batches
        if (!cancelled) {
          await new Promise<void>(r =>
            'requestIdleCallback' in window
              ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(r)
              : setTimeout(r, 50)
          );
        }
      }
    };

    const timer = setTimeout(scoreAll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [resumes, getCachedScore]);

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
    toast.success('Resumes refreshed');
  };

  const handleEdit = useCallback((resumeId: string) => {
    haptics.light();
    const resume = resumes?.find(r => r.$id === resumeId);
    if (resume) {
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      if (resume.parent_resume_id || tailoredResumeIds.has(resumeId)) {
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
      toast.success('Resume duplicated successfully');
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
      toast.success('Resume renamed');
    } catch {
      toast.error('Failed to rename resume');
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
      toast.success(`"${resumeToDelete?.title}" deleted`, { duration: 3000 });
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
    () => filteredResumes?.filter((r) => r.parent_resume_id || tailoredResumeIds.has(r.$id)) ?? [],
    [filteredResumes, tailoredResumeIds],
  );

  const displayedResumes = useMemo(() => {
    const pool = resumeListTab === 'tailored' ? tailoredResumes : filteredResumes ?? [];
    return [...pool].sort(
      (a, b) =>
        new Date(b.$updatedAt || b.$createdAt || 0).getTime() -
        new Date(a.$updatedAt || a.$createdAt || 0).getTime(),
    );
  }, [resumeListTab, tailoredResumes, filteredResumes]);

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
    toast.success(`${count} resume${count > 1 ? 's' : ''} deleted`, {
      description: 'You can undo this action within 5 seconds.',
      action: {
        label: 'Undo',
        onClick: () => {
          if (pendingDeleteRef.current) {
            clearTimeout(pendingDeleteRef.current);
            pendingDeleteRef.current = null;
          }
          toast.info('Delete cancelled');
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

  const hasResumes = filteredResumes && filteredResumes.length > 0;

  const checklistSteps = useMemo((): ChecklistStep[] => {
    const hasAnyScore = Object.values(healthScores).some(s => (s.overallScore ?? 0) > 0);
    const hasTargetJob = resumes.some(r => r.target_job_title);
    return [
      { id: 'first-resume', label: 'Create your first resume', description: 'Build a professional resume to get started.', done: resumes.length > 0, href: '/dashboard?action=create' },
      { id: 'ats-check', label: 'Run an ATS check', description: 'See how well your resume scores with recruiters.', done: hasAnyScore, href: '/editor' },
      { id: 'export', label: 'Export your resume', description: 'Download your resume as PDF or PNG.', done: exportedChecked, href: '/editor' },
      { id: 'target-job', label: 'Set a target job', description: 'Tailor your resume for specific roles.', done: hasTargetJob, href: '/tailor' },
      { id: 'portfolio', label: 'View your portfolio', description: 'Share your professional portfolio online.', done: !!profile?.portfolioEnabled, href: '/portfolio' },
    ];
  }, [resumes, healthScores, exportedChecked, profile?.portfolioEnabled]);

  const onboardingCompleted = user?.id ? localStorage.getItem(`wr-onboarding-completed-${user.id}`) === 'true' : false;
  const showChecklist = !!user && onboardingCompleted && !checklistDismissed && !showProfileBanner;

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

  const isLoading = !authSettled;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-6 pb-3">
          <p className="text-sm font-medium text-foreground">Loading your workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;re syncing your resumes, scores, and recent activity.
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
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">We couldn't load your resumes. Please check your connection and try again.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  const hasWorkspace = resumes.length > 0;

  return (
    <div className={cn('flex flex-col', hasWorkspace && 'min-h-0 flex-1')}>
      {/* All scrollable content inside PullToRefresh */}
      <PullToRefresh
        onRefresh={handleRefresh}
        className={cn(
          hasWorkspace && 'flex min-h-0 flex-1 flex-col',
          hasWorkspace ? 'dashboard-workspace-os-bg' : 'dashboard-atlas-bg',
        )}
      >
        <div className={cn('pb-safe w-full mx-auto', hasWorkspace && 'flex min-h-0 flex-1 flex-col')}>
          {resumes.length === 0 && (
            <>
              <DashboardTopBar
                hasResumes={false}
                compact={false}
                onOptimize={handleFeaturedTailor}
                onBuild={handleCreateNew}
              />
              <DashboardStats
                totalResumes={0}
                healthScores={healthScores}
                userName={profile?.fullName}
                userId={user?.id}
              />
            </>
          )}

          {resumes.length === 0 && (
            <DashboardHero
              hasResumes={false}
              onBuild={handleCreateNew}
              onTailor={handleHeroTailor}
            />
          )}

          {/* Filter/Sort bar removed — simplified UI */}

          {/* Content */}
          {isLoading ? (
            <div className="px-4">
              <SkeletonCardList count={3} />
            </div>
          ) : resumesError && !resumes && !navigator.onLine ? (
            /* Offline and no cached data — show specific offline state */
            <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">You're offline</h3>
                <p className="text-sm text-muted-foreground">Connect to the internet to load your resumes.</p>
              </div>
              <button
                onClick={() => refetch()}
                className="text-sm text-primary hover:underline min-h-[44px] touch-manipulation flex items-center"
                aria-label="Retry loading resumes"
              >
                Retry
              </button>
            </div>
          ) : resumesError && !resumes ? (
            /* Server error while online — show actionable error state (D-2) */
            <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Something went wrong</h3>
                <p className="text-sm text-muted-foreground">We couldn't load your resumes.</p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="min-h-[44px] gap-2" aria-label="Retry loading resumes">
                <RefreshCw className="w-4 h-4" />
                Tap to retry
              </Button>
            </div>
          ) : !resumes || resumes.length === 0 ? (
            <>
              <EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => navigate('/onboarding')} onImportProfile={() => setShowLinkedInImport(true)} />
            </>
          ) : !hasResumes ? (
            <div className="flex items-center justify-center px-4 py-16">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-muted-foreground">No resumes match "{searchQuery}"</p>
                <Button
                  variant="link"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </motion.div>
            </div>
          ) : (
            <DashboardWorkspaceLayout
              topBar={
                <DashboardTopCommandBar
                  searchQuery={searchQuery}
                  onSearchChange={handleSetSearchQuery}
                  onImportJob={handleImportJob}
                  onOpenWiseAI={handleOpenWiseAI}
                />
              }
              intelligence={
                <DashboardIntelligencePanel
                  healthScore={featuredHealthScore}
                  featuredResume={featuredResume}
                  resumes={resumes}
                  healthScores={healthScores}
                  atsAverage={atsAverage}
                  scoringId={scoringId}
                  onOpenImportJob={handleImportJob}
                  onEditResume={handleEdit}
                  onTailorResume={handleTailorResume}
                />
              }
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
              <DashboardWorkspaceToolbar userName={profile?.fullName} />

              <DashboardMetricsStrip
                resumes={resumes}
                healthScores={healthScores}
                atsAverage={atsAverage}
                scoredResumeCount={scoredResumeCount}
                tailoredThisWeek={tailoredThisWeek}
                applicationMatches={applicationMatches}
                hasJobMatchScores={hasJobMatchScores}
                missingKeywordsCount={missingKeywordsCount}
                atsTrendDelta={atsTrendDelta}
                atsChartSeries={atsChartSeries}
                isScoring={scoringId !== null || scoredResumeCount < resumes.length}
                scoringId={scoringId}
                onEditResume={handleEdit}
                onTailorResume={handleTailorResume}
              />

              <div className="dashboard-workspace-main-body flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
                <div className="dashboard-recent-resumes-head flex w-full min-w-0 flex-col gap-2.5 mb-2.5 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <Tabs
                      value={resumeListTab}
                      onValueChange={(v) => {
                        haptics.selection();
                        setResumeListTab(v as 'all' | 'tailored');
                      }}
                    >
                      <TabsList className="h-9 p-0.5 rounded-xl bg-muted/40 border border-border/40">
                        <TabsTrigger
                          value="all"
                          className="h-8 px-3 text-xs rounded-lg data-[state=active]:shadow-none data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border/50"
                        >
                          All
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center tabular-nums"
                          >
                            {filteredResumes?.length ?? 0}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                          value="tailored"
                          className="h-8 px-3 text-xs rounded-lg data-[state=active]:shadow-none data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border/50"
                        >
                          Tailored
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
                    <div className="relative min-w-0 sm:w-52">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search resumes..."
                        value={searchQuery}
                        onChange={(e) => handleSetSearchQuery(e.target.value)}
                        className="h-8 pl-7 text-xs rounded-lg border-border/50 bg-card/50"
                        aria-label="Search recent resumes"
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
                          aria-label="Resume list actions"
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
                            Select resumes
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                              {selectedIds.size} selected
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                haptics.light();
                                handleSelectAll();
                              }}
                            >
                              Select all
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
                              Delete selected
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                haptics.light();
                                exitSelectionMode();
                              }}
                            >
                              Cancel selection
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  </div>
                </div>

                <div className="dashboard-resume-list-scroll w-full min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
                <motion.div
                  className="space-y-2 pb-1"
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
                              {resumeListTab === 'tailored'
                                ? 'No tailored resumes yet'
                                : 'No resumes match your search'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                              {resumeListTab === 'tailored'
                                ? 'Create a tailored copy from any master resume using Tailor to Job.'
                                : 'Try clearing your search or create a new resume.'}
                            </p>
                            {resumeListTab === 'tailored' && filteredResumes?.some((r) => !r.parent_resume_id) && (
                              <Button
                                size="sm"
                                className="mt-4 h-9 rounded-xl text-xs"
                                onClick={() => {
                                  const master = filteredResumes.find((r) => !r.parent_resume_id);
                                  if (master) handleTailorResume(master.$id);
                                }}
                              >
                                Tailor a resume
                              </Button>
                            )}
                          </div>
                        )}
                        {displayedResumes.map((resume) => {
                          const isMaster = !resume.parent_resume_id;
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
                                showTailoredBadge={!isMaster || tailoredResumeIds.has(resume.$id)}
                                healthScore={healthScores[resume.$id]}
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
              {!isLoading && <DashboardDiscoverySection compact className="shrink-0" />}

              {(showTrustBanner || showProfileBanner || showChecklist) && (
                <div className="dashboard-workspace-footer mt-2 space-y-1.5 pb-1">
                  {showTrustBanner && (
                    <div className="flex items-center gap-2 py-1.5 text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground flex-1">Your career data is encrypted, private, and never shared.</p>
                      <button
                        onClick={() => { setShowTrustBanner(false); localStorage.setItem('wr-trust-banner-seen', 'true'); }}
                        className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted/50"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {showProfileBanner && (
                    <div className="flex items-center gap-2 py-1.5">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs font-medium text-foreground flex-1">Complete your profile for the best experience.</p>
                      <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="shrink-0 h-8 text-xs">
                        Complete
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

          {!isLoading && resumes.length === 0 && (
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
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resume. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()} disabled={deleteResume.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteResume.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2"
            >
              {deleteResume.isPending && <MiniSpinner size={14} />}
              {deleteResume.isPending ? 'Deleting…' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Resume{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size > 1 ? 'these resumes' : 'this resume'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={!!duplicateResumeId} onOpenChange={(open) => { if (!open && !duplicateResume.isPending) setDuplicateResumeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of this resume with all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()} disabled={duplicateResume.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDuplicate(); }}
              disabled={duplicateResume.isPending}
              className="inline-flex items-center gap-2"
            >
              {duplicateResume.isPending && <MiniSpinner size={14} />}
              {duplicateResume.isPending ? 'Duplicating…' : 'Duplicate'}
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
                  template: 'modern',
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
                  templateId: 'modern',
                });
                haptics.success();
                toast.success('Resume created from LinkedIn!');
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
