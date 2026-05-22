import { useState, useEffect, useRef, useMemo, useDeferredValue, lazy, Suspense, useCallback } from 'react';
import { preloadLazy } from '@/lib/preloadLazy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m as motion, AnimatePresence } from 'framer-motion';
import { Search, User, Settings, LogOut, Sparkles, CheckSquare, X, Trash2, WifiOff, ShieldCheck, ExternalLink, HelpCircle, AlertCircle, RefreshCw, LayoutTemplate, BookOpen, Users, Map, Sun, Moon } from 'lucide-react';
import { DashboardSkeleton } from '@/components/layout/PageSkeletons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { templates } from '@/lib/templateData';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { AppLogo } from '@/components/brand/AppLogo';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { ResumeGroup, organizeResumeHierarchy } from '@/components/dashboard/ResumeGroup';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { DashboardSpotlightHero } from '@/components/dashboard/DashboardSpotlightHero';
import { DashboardNextActionCard } from '@/components/dashboard/DashboardNextActionCard';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { useSettingsStore } from '@/store/settingsStore';
import { FeatureMapSheet } from '@/components/layout/FeatureMapSheet';
import { trackSession } from '@/lib/discoveryManager';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { usePlan } from '@/hooks/usePlan';
import { calculateProfileCompletion } from '@/hooks/useProfile';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { useTheme } from '@/hooks/use-theme';
import { DashboardStatusPopover } from '@/components/dashboard/DashboardStatusPopover';
import { DashboardPlanBadge } from '@/components/dashboard/DashboardPlanBadge';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
import { OnboardingChecklist, ChecklistStep } from '@/components/dashboard/OnboardingChecklist';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const LinkedInImportSheet = lazy(() => import('@/components/settings/LinkedInImportSheet').then(m => ({ default: m.LinkedInImportSheet })));
const AnalyzeJobSheet = lazy(() => import('@/components/dashboard/AnalyzeJobSheet').then(m => ({ default: m.AnalyzeJobSheet })));
const DashboardUploadWidget = lazy(() => import('@/components/dashboard/DashboardUploadWidget').then(m => ({ default: m.DashboardUploadWidget })));

import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';

import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore, backgroundScore } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { useProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';
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

  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { scoreResume, getCachedScore, scoringId } = useResumeScore();
  const { profile } = useProfile(user?.id);
  const { plan, trialPlan, trialExpiresAt } = usePlan();
  const { isDark, toggleTheme } = useTheme();
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
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem('wr-dash-tab') || 'my-cvs'
  );
  const [showTrustBanner, setShowTrustBanner] = useState(() => {
    const visitCount = parseInt(localStorage.getItem('wr-trust-banner-visits') || '0', 10);
    if (visitCount >= 3 || localStorage.getItem('wr-trust-banner-seen')) return false;
    try { localStorage.setItem('wr-trust-banner-visits', String(visitCount + 1)); } catch { /* localStorage full or disabled */ }
    return true;
  });
  const [profilePulseSeen, setProfilePulseSeen] = useState(() => !!localStorage.getItem('wr-profile-pulse-seen'));
  const [showFeatureMap, setShowFeatureMap] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [exportedChecked, setExportedChecked] = useState(false);
  const { isOnline } = useNetworkStatus();
  const isOffline = !isOnline;


  // Pagination: render at most PAGE_SIZE items initially, reveal more on demand
  const PAGE_SIZE = 10;
  const [visibleMyCVs, setVisibleMyCVs] = useState(PAGE_SIZE);
  const [visibleTailored, setVisibleTailored] = useState(PAGE_SIZE);

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
  const handleSetActiveTab = useCallback((tab: string) => {
    sessionStorage.setItem('wr-dash-tab', tab);
    setActiveTab(tab);
  }, []);

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
    navigate('/tailor');
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

  const tailoredCount = useMemo(
    () => resumes?.filter((r) => r.parent_resume_id).length ?? 0,
    [resumes],
  );

  const missingKeywordsCount = useMemo(() => {
    if (featuredHealthScore?.keywordGaps?.length) {
      return featuredHealthScore.keywordGaps.length;
    }
    const gaps = Object.values(healthScores).flatMap((s) => s.keywordGaps ?? []);
    return gaps.length > 0 ? Math.max(...Object.values(healthScores).map((s) => s.keywordGaps?.length ?? 0)) : 0;
  }, [featuredHealthScore, healthScores]);

  const handleTailorResume = useCallback(
    (resumeId: string) => {
      const target = resumes?.find((r) => r.$id === resumeId);
      if (!target) return;
      setCurrentResumeId(target.$id);
      setCurrentResume(dbToResumeData(target));
      navigate('/tailor');
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

  const handleImportCv = useCallback(() => {
    setShowDiscovery(true);
    requestAnimationFrame(() => {
      document.querySelector('[data-section="dashboard-upload"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
      navigate('/editor');
    }
  }, [resumes, setCurrentResumeId, setCurrentResume, navigate]);

  const handleDuplicate = useCallback((resumeId: string) => {
    setDuplicateResumeId(resumeId);
  }, []);

  const confirmDuplicate = useCallback(async () => {
    if (!duplicateResumeId) return;
    haptics.success();
    try {
      await duplicateResume.mutateAsync(duplicateResumeId);
      toast.success('Resume duplicated successfully');
    } catch {
      // error handled by mutation
    } finally {
      setDuplicateResumeId(null);
    }
  }, [duplicateResumeId, duplicateResume]);

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
      await updateResume.mutateAsync({ resumeId, updates: {}, title: newTitle });
      toast.success('Resume renamed');
    } catch {
      toast.error('Failed to rename resume');
    }
  }, [updateResume]);

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
      useATSScoreHistoryStore.getState().clearHistory(deleteResumeId!);
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

  // Organize resumes into hierarchy
  const resumeHierarchy = useMemo(() => {
    if (!filteredResumes) return null;
    return organizeResumeHierarchy(filteredResumes);
  }, [filteredResumes]);

  // Reset visible counts whenever search or active tab changes
  useEffect(() => {
    setVisibleMyCVs(PAGE_SIZE);
    setVisibleTailored(PAGE_SIZE);
  }, [deferredSearch, activeTab]);

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
          idsToDelete.forEach(id => useATSScoreHistoryStore.getState().clearHistory(id));
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="lg:hidden sticky top-0 z-20 pt-3 pb-2.5 px-4 flex items-center gap-3 bg-card/88 backdrop-blur-md border-b border-border/80 shadow-soft-sm">
        <button onClick={() => { window.scrollTo(0, 0); navigate('/'); }} aria-label="WiseResume — go to landing page" className="touch-manipulation shrink-0">
          <AppLogo size="sm" showTagline={false} hideText />
        </button>
        <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
          <DashboardStatusPopover />
          <div className="hidden md:flex items-center gap-1">
            <AICreditsIndicator />
            <AIHealthBadge />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px] rounded-xl touch-manipulation active:scale-95 shrink-0"
            onClick={() => { haptics.light(); setShowFeatureMap(true); }}
            aria-label="What can I do?"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Button>
          <DashboardPlanBadge
            plan={plan}
            trialPlan={trialPlan}
            trialExpiresAt={trialExpiresAt}
            className="hidden sm:inline-flex shrink-0"
          />
          <button
            type="button"
            onClick={() => { haptics.selection(); toggleTheme(); }}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95 touch-manipulation shrink-0"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Popover onOpenChange={(open) => {
            if (open && !profilePulseSeen) {
              setProfilePulseSeen(true);
              localStorage.setItem('wr-profile-pulse-seen', 'true');
            }
          }}>
            <PopoverTrigger asChild>
              <motion.button
                className="touch-manipulation relative touch-ripple min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full"
                whileTap={{ scale: 0.9 }}
                aria-label="Profile menu"
              >
                {/* First-visit pulse ring */}
                {!profilePulseSeen && (
                  <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-[ping_1.5s_ease-out_4]" />
                )}
                <PlanAvatar
                  plan={plan}
                  size="w-9 h-9"
                  avatarUrl={profile?.avatarUrl}
                  imageAlt={profile?.fullName || 'Profile'}
                  initials={profile?.fullName
                    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : <User className="w-4 h-4" />}
                />
                {/* Incomplete profile badge */}
                {user && profile && calculateProfileCompletion(profile) < 50 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive border border-background" />
                )}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-80 p-0">
              <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-row items-center gap-3">
                  <PlanAvatar
                    plan={plan}
                    size="w-10 h-10"
                    avatarUrl={profile?.avatarUrl}
                    imageAlt={profile?.fullName || 'Profile'}
                    initials={profile?.fullName
                      ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : <User className="w-5 h-5" />}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium leading-5 block truncate">{profile?.fullName || 'User'}</span>
                    {user?.email && (
                      <span className="text-muted-foreground text-sm font-normal leading-4 block truncate">{user.email}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row flex-wrap gap-2 py-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="active:scale-95 touch-manipulation"
                    onClick={() => { haptics.light(); navigate('/profile'); }}
                  >
                    <User className="w-4 h-4" />
                    <span>Manage Account</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="active:scale-95 touch-manipulation"
                    onClick={() => { haptics.light(); navigate('/settings'); }}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 active:scale-95 touch-manipulation"
                    onClick={async () => {
                      haptics.warning();
                      await signOut();
                      navigate('/');
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* All scrollable content inside PullToRefresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 dashboard-atlas-bg">
        <div className="pb-safe lg:max-w-none mx-auto w-full max-w-6xl lg:mx-auto">
          <DashboardTopBar
            hasResumes={resumes.length > 0}
            compact={resumes.length > 0}
            onOptimize={handleFeaturedTailor}
            onImport={handleImportCv}
            onBuild={handleCreateNew}
          />

          {resumes.length === 0 ? (
            <DashboardStats
              totalResumes={0}
              healthScores={healthScores}
              userName={profile?.fullName}
              userId={user?.id}
            />
          ) : (
            <div className="dashboard-workspace-head space-y-0">
              {featuredResume && (
                <DashboardSpotlightHero
                  resume={featuredResume}
                  healthScore={featuredHealthScore}
                  isScoring={scoringId === featuredResume.$id || (featuredHealthScore == null && scoringId !== null)}
                  onTailor={handleFeaturedTailor}
                  onOpenEditor={handleFeaturedEdit}
                />
              )}
              <div data-section="dashboard-metrics">
                <DashboardStats
                  totalResumes={resumes.length}
                  healthScores={healthScores}
                  isScoring={scoringId !== null || Object.keys(healthScores).length < resumes.length}
                  userId={user?.id}
                  tailoredCount={tailoredCount}
                  missingKeywordsCount={missingKeywordsCount}
                  metricsOnly
                />
              </div>
            </div>
          )}

          {resumes.length === 0 && (
            <DashboardHero
              hasResumes={false}
              onBuild={handleCreateNew}
              onTailor={handleHeroTailor}
            />
          )}

          {/* Selection toolbar */}
          {selectionMode && resumes && resumes.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border shadow-soft px-3 py-2">
                <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="min-w-[44px] min-h-[44px]" aria-label="Exit selection mode">
                  <X className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium flex-1">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs" aria-label="Select all resumes">
                  Select All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="min-h-[44px] active:scale-95"
                  aria-label="Delete selected resumes"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
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
            <div className="px-4 pb-3 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4 lg:items-start">
              <Tabs value={activeTab} onValueChange={handleSetActiveTab} className="w-full min-w-0">
                <div className="rounded-xl border border-border bg-card/90 shadow-soft-sm p-3 sm:p-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                  <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-col sm:items-start sm:gap-0.5">
                    <h3 className="text-base font-semibold text-foreground">Recent resumes</h3>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {filteredResumes?.length ?? resumes.length} total
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:max-w-xs sm:ml-auto">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search resumes..."
                        value={searchQuery}
                        onChange={(e) => handleSetSearchQuery(e.target.value)}
                        className="pl-9 rounded-full h-10 text-sm bg-background border-border shadow-none"
                        aria-label="Search resumes"
                      />
                    </div>
                    {!selectionMode && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] h-10 w-10 shrink-0 rounded-full"
                        onClick={() => { haptics.light(); setSelectionMode(true); }}
                        aria-label="Select resumes"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {searchQuery && (
                  <p className="text-[10px] text-muted-foreground mb-2 -mt-0.5">
                    Searching in <span className="font-medium text-foreground">{activeTab === 'my-cvs' ? 'My CVs' : 'Tailored'}</span>
                  </p>
                )}
                <div className="overflow-x-auto scrollbar-none mb-3 rounded-xl bg-muted/40 p-0.5 border border-border/60">
                  <TabsList className="w-full min-w-max bg-transparent h-9 p-0 gap-0.5">
                    <TabsTrigger value="my-cvs" className="flex-shrink-0 flex-1 gap-1.5">
                      My CVs
                      {resumeHierarchy && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                          {resumeHierarchy.masterResumes.length + resumeHierarchy.orphanTailored.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="tailored" className="flex-shrink-0 flex-1 gap-1.5">
                      Tailored
                      {filteredResumes && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                          {filteredResumes.filter(r => r.parent_resume_id).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="my-cvs" className="mt-0">
                  <motion.div
                    className="space-y-2"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                  >
                    {resumeHierarchy && (() => {
                      const myCVsAll = [
                        ...resumeHierarchy.masterResumes,
                        ...resumeHierarchy.orphanTailored,
                      ];
                      const myCVsSlice = myCVsAll.slice(0, visibleMyCVs);
                      const myCVsRemaining = myCVsAll.length - myCVsSlice.length;
                      return (
                        <>
                          {myCVsSlice.map((resume) => {
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
                                  showMasterBadge={isMaster && !!resumeHierarchy.tailoredByParent[resume.$id]?.length}
                                  showTailoredBadge={!isMaster}
                                  healthScore={healthScores[resume.$id]}
                                  isScoring={scoringId === resume.$id}
                                  selectionMode={selectionMode}
                                  selected={selectedIds.has(resume.$id)}
                                  onToggleSelect={toggleSelection}
                                  presentation="atlas-row"
                                  onTailor={handleTailorResume}
                                  isProcessing={
                                    (deleteResume.isPending && deleteResume.variables === resume.$id) ||
                                    (duplicateResume.isPending && duplicateResume.variables === resume.$id)
                                  }
                                />
                              </motion.div>
                            );
                          })}
                          {myCVsRemaining > 0 && (
                            <div className="flex justify-center pt-2 pb-1 lg:col-span-full">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] gap-1.5"
                                onClick={() => { haptics.light(); setVisibleMyCVs(v => v + PAGE_SIZE); }}
                              >
                                Load more ({myCVsRemaining})
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="tailored" className="mt-0">
                  {(() => {
                    const allTailored = filteredResumes?.filter(r => r.parent_resume_id) || [];
                    if (allTailored.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
                          <p className="text-sm text-muted-foreground">No tailored CVs yet</p>
                          <p className="text-xs text-muted-foreground/70 mt-1 mb-3">Open any CV and use "Tailor for Job" to create one</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 active:scale-95 touch-manipulation"
                            onClick={() => { haptics.light(); navigate('/ai-studio/tailor'); }}
                          >
                            <Sparkles className="w-4 h-4" />
                            Tailor a Resume
                          </Button>
                        </div>
                      );
                    }
                    const tailoredSlice = allTailored.slice(0, visibleTailored);
                    const tailoredRemaining = allTailored.length - tailoredSlice.length;
                    return (
                      <motion.div
                        className="space-y-3"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                      >
                        {tailoredSlice.map((resume) => (
                          <motion.div key={resume.$id} variants={itemVariants}>
                            <div className="space-y-2">
                              {(resume.target_job_title || resume.target_company) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {[resume.target_job_title, resume.target_company].filter(Boolean).join(' @ ')}
                                  </span>
                                  {resume.job_url && (
                                    <a
                                      href={resume.job_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View Job
                                    </a>
                                  )}
                                </div>
                              )}
                              <ResumeListCard
                                resume={resume}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRename={handleRename}
                                onInterview={handleInterview}
                                showTailoredBadge
                                healthScore={healthScores[resume.$id]}
                                isScoring={scoringId === resume.$id}
                                selectionMode={selectionMode}
                                selected={selectedIds.has(resume.$id)}
                                onToggleSelect={toggleSelection}
                                presentation="atlas-row"
                                onTailor={handleTailorResume}
                                isProcessing={
                                  (deleteResume.isPending && deleteResume.variables === resume.$id) ||
                                  (duplicateResume.isPending && duplicateResume.variables === resume.$id)
                                }
                              />
                            </div>
                          </motion.div>
                        ))}
                        {tailoredRemaining > 0 && (
                          <div className="flex justify-center pt-2 pb-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] gap-1.5"
                              onClick={() => { haptics.light(); setVisibleTailored(v => v + PAGE_SIZE); }}
                            >
                              Load more ({tailoredRemaining})
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}
                </TabsContent>
                </div>
              </Tabs>

              <DashboardNextActionCard
                healthScore={featuredHealthScore}
                onReview={handleFeaturedEdit}
                onTailor={handleFeaturedTailor}
                className="mt-3 lg:mt-0 lg:sticky lg:top-3 lg:self-start"
              />
            </div>
          )}

          {/* Secondary sections — below resume workspace to reduce scroll-to-list */}
          {resumes && resumes.length > 0 && (
            <div className="px-4 pt-2 pb-3 space-y-2 border-t border-border/40 mt-1">
              {showTrustBanner && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl border border-primary/15 bg-primary/5 shadow-soft-sm">
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
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5 shadow-soft-sm">
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

              <Collapsible open={showDiscovery} onOpenChange={setShowDiscovery}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors min-h-[44px]">
                    <span>Import & explore</span>
                    <span className="text-muted-foreground">{showDiscovery ? '▲' : '▼'}</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1 space-y-2">
                  <div data-section="dashboard-upload" className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-label mb-2 px-0.5">Import Resume</p>
                    <Suspense fallback={null}>
                      <DashboardUploadWidget />
                    </Suspense>
                  </div>
                  <div data-section="dashboard-explore" className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-label mb-2 px-0.5">Explore</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { icon: LayoutTemplate, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Templates', action: () => navigate('/templates') },
                        { icon: BookOpen, iconBg: 'bg-warning/10', iconColor: 'text-warning', label: 'Examples', action: () => navigate('/examples') },
                        { icon: Map, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', label: 'Guides', action: () => navigate('/guides') },
                        { icon: Users, iconBg: 'bg-success/10', iconColor: 'text-success', label: 'Referral', action: () => navigate('/referral') },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => { haptics.light(); item.action(); }}
                          className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-card border border-border/80 hover:border-primary/25 active:scale-[0.97] touch-manipulation min-h-[44px]"
                          data-track={`dashboard-explore-${item.label.toLowerCase()}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                            <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                          </div>
                          <span className="text-[9px] font-medium text-foreground leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Empty-state discovery stays expanded */}
          {(!resumes || resumes.length === 0) && (
            <Collapsible open={resumes.length === 0 || showDiscovery} onOpenChange={setShowDiscovery}>
              <CollapsibleContent>
                <div className="px-4 pt-2 pb-1" data-section="dashboard-upload">
                  <p className="text-label mb-2 px-1">Import Resume</p>
                  <Suspense fallback={null}>
                    <DashboardUploadWidget />
                  </Suspense>
                </div>
                <div className="px-4 pt-2 pb-1" data-section="dashboard-explore">
                  <p className="text-label mb-2 px-1">Explore</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: LayoutTemplate, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Templates', action: () => navigate('/templates') },
                      { icon: BookOpen, iconBg: 'bg-warning/10', iconColor: 'text-warning', label: 'Examples', action: () => navigate('/examples') },
                      { icon: Map, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', label: 'Guides', action: () => navigate('/guides') },
                      { icon: Users, iconBg: 'bg-success/10', iconColor: 'text-success', label: 'Referral', action: () => navigate('/referral') },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { haptics.light(); item.action(); }}
                        className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-card border border-border shadow-soft-sm hover:border-primary/30 active:scale-[0.97] touch-manipulation"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                          <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                        </div>
                        <span className="text-[11px] font-medium text-foreground text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
