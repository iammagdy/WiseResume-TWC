import { useState, useEffect, useRef, useMemo, useDeferredValue, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m as motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, User, Settings, LogOut, FileText as FileTextIcon, Upload, Briefcase, Sparkles, Linkedin, CheckSquare, X, Trash2, WifiOff, ShieldCheck, ExternalLink, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import useEmblaCarousel from 'embla-carousel-react';
import { SortOption, CategoryFilter, ScoreFilter } from '@/components/dashboard/ResumeFilters';
import { templates } from '@/lib/templateData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { AppLogo } from '@/components/brand/AppLogo';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { ResumeGroup, organizeResumeHierarchy } from '@/components/dashboard/ResumeGroup';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ActionCard } from '@/components/home/ActionCard';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActionChips } from '@/components/dashboard/QuickActionChips';
// DailyTipCard removed - tip merged into DashboardStats
import { FloatingCreateButton } from '@/components/dashboard/FloatingCreateButton';
import { WhatsNextCard } from '@/components/dashboard/WhatsNextCard';
import { FeatureMapSheet } from '@/components/layout/FeatureMapSheet';
import { trackSession } from '@/lib/discoveryManager';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calculateProfileCompletion } from '@/hooks/useProfile';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const LinkedInImportSheet = lazy(() => import('@/components/settings/LinkedInImportSheet').then(m => ({ default: m.LinkedInImportSheet })));
const AnalyzeJobSheet = lazy(() => import('@/components/dashboard/AnalyzeJobSheet').then(m => ({ default: m.AnalyzeJobSheet })));

import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { TrashSheet } from '@/components/dashboard/TrashSheet';
import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore, backgroundScore } from '@/hooks/useResumeScore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { useProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/safeClient';
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

function DashboardPageContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isMigrating } = useGuestMigration(null);
  const { data: resumes, isLoading: resumesLoading, isError: resumesError, refetch } = useResumes();
  const { deleteResume, deleteMultipleResumes, duplicateResume, updateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { scoreResume, getCachedScore, scoringId } = useResumeScore();
  const { profile } = useProfile(user?.id, user);
  const { hasNew: hasNewChangelog } = useChangelogBadge();
  const [healthScores, setHealthScores] = useState<Record<string, ResumeHealthScore>>({});

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTailoredParentId, setCreateTailoredParentId] = useState<string | null>(null);
  // searchQuery state moved below with sessionStorage initializer
  const [sortOption, setSortOption] = useState<SortOption>('updated');
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([]);
  const [scoreFilters, setScoreFilters] = useState<ScoreFilter[]>([]);
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
    try { localStorage.setItem('wr-trust-banner-visits', String(visitCount + 1)); } catch { }
    return true;
  });
  const [profilePulseSeen, setProfilePulseSeen] = useState(() => !!localStorage.getItem('wr-profile-pulse-seen'));
  const [showFeatureMap, setShowFeatureMap] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const { data: trashedResumes = [] } = useTrashedResumes();

  // Pagination: render at most PAGE_SIZE items initially, reveal more on demand
  const PAGE_SIZE = 10;
  const [visibleMyCVs, setVisibleMyCVs] = useState(PAGE_SIZE);
  const [visibleTailored, setVisibleTailored] = useState(PAGE_SIZE);

  // Track session count for progressive disclosure
  useEffect(() => { trackSession(); }, []);

  // Embla carousel for swipeable tabs
  const [emblaRef, emblaApi] = useEmblaCarousel({ skipSnaps: false, containScroll: false });

  // Sync tab → carousel
  useEffect(() => {
    if (!emblaApi) return;
    const index = activeTab === 'my-cvs' ? 0 : 1;
    if (emblaApi.selectedScrollSnap() !== index) {
      emblaApi.scrollTo(index);
    }
  }, [activeTab, emblaApi]);

  // Persist helpers for sessionStorage sync (D-3)
  const handleSetActiveTab = useCallback((tab: string) => {
    sessionStorage.setItem('wr-dash-tab', tab);
    setActiveTab(tab);
  }, []);

  const handleSetSearchQuery = useCallback((q: string) => {
    sessionStorage.setItem('wr-dash-search', q);
    setSearchQuery(q);
  }, []);

  // Sync carousel → tab
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      handleSetActiveTab(index === 0 ? 'my-cvs' : 'tailored');
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, handleSetActiveTab]);

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

  // Check onboarding status for authenticated users
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      try {
        if (localStorage.getItem('wr-onboarding-completed') === 'true') return;

        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();
          
        if (data && !data.onboarding_completed) {
          if (!sessionStorage.getItem('wr-dismissed-profile-banner')) {
            setShowProfileBanner(true);
          }
        } else if (data?.onboarding_completed) {
          localStorage.setItem('wr-onboarding-completed', 'true');
        }
      } catch (err) {
        console.error('Failed to check onboarding:', err);
      }
    };
    run();
  }, [user]);

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

  // Auto-score resumes in background (one at a time, debounced)
  useEffect(() => {
    if (!resumes || resumes.length === 0) return;

    let cancelled = false;

    const scoreNext = async () => {
      for (const resume of resumes) {
        if (cancelled) break;
        // Yield to main thread between scores to avoid jank on low-end devices
        await new Promise<void>(r =>
          'requestIdleCallback' in window
            ? (window as any).requestIdleCallback(r)
            : setTimeout(r, 50)
        );
        if (cancelled) break;
        const cached = getCachedScore(resume.id, resume.updated_at);
        if (cached) {
          setHealthScores(prev => ({ ...prev, [resume.id]: cached }));
          continue;
        }
        const resumeData = dbToResumeData(resume);
        await backgroundScore(resume.id, resumeData, resume.updated_at);
        const newCached = getCachedScore(resume.id, resume.updated_at);
        if (newCached && !cancelled) {
          setHealthScores(prev => ({ ...prev, [resume.id]: newCached }));
        }
      }
    };

    const timer = setTimeout(scoreNext, 1000);
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

  const handleEdit = (resumeId: string) => {
    haptics.light();
    const resume = resumes?.find(r => r.id === resumeId);
    if (resume) {
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      navigate('/editor');
    }
  };

  const handleDuplicate = (resumeId: string) => {
    setDuplicateResumeId(resumeId);
  };

  const confirmDuplicate = () => {
    if (duplicateResumeId) {
      haptics.success();
      duplicateResume.mutate(duplicateResumeId, {
        onSuccess: () => {
          toast.success('Resume duplicated successfully');
        },
      });
      setDuplicateResumeId(null);
    }
  };

  const handleInterview = (resumeId: string) => {
    const resume = resumes?.find(r => r.id === resumeId);
    if (resume) {
      haptics.light();
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      navigate('/interview');
    }
  };

  const handleRename = (resumeId: string, newTitle: string) => {
    updateResume.mutate({ resumeId, updates: {}, title: newTitle }, {
      onSuccess: () => toast.success('Resume renamed'),
    });
  };

  const handleDelete = (resumeId: string) => {
    setDeleteResumeId(resumeId);
  };

  const confirmDelete = () => {
    if (deleteResumeId) {
      const resumeToDelete = resumes?.find(r => r.id === deleteResumeId);

      // Store for potential undo
      if (resumeToDelete) {
        setDeletedResume({ id: resumeToDelete.id, title: resumeToDelete.title });
      }

      haptics.warning();
      deleteResume.mutate(deleteResumeId, {
        onSuccess: () => {
          // Clear score trend history for deleted resume
          useATSScoreHistoryStore.getState().clearHistory(deleteResumeId!);
          // Show toast with undo option
          toast.success(`"${resumeToDelete?.title}" deleted`, { duration: 3000 });
        },
      });
      setDeleteResumeId(null);
    }
  };

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

    // Category filter
    if (categoryFilters.length > 0) {
      result = result.filter(resume => {
        const tpl = templates.find(t => t.id === resume.template_id);
        return tpl && categoryFilters.includes(tpl.category as CategoryFilter);
      });
    }

    // Score filter
    if (scoreFilters.length > 0) {
      result = result.filter(resume => {
        const score = healthScores[resume.id]?.overallScore;
        if (score == null) return false;
        return scoreFilters.some(f =>
          f === 'needs-work' ? score < 50 :
            f === 'good' ? score >= 50 && score < 80 :
              score >= 80
        );
      });
    }

    // Sort
    if (sortOption === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'score') {
      result = [...result].sort((a, b) => (healthScores[b.id]?.overallScore ?? -1) - (healthScores[a.id]?.overallScore ?? -1));
    }
    // 'updated' is the default order from the query

    return result;
  }, [resumes, deferredSearch, categoryFilters, scoreFilters, sortOption, healthScores]);

  // Organize resumes into hierarchy
  const resumeHierarchy = useMemo(() => {
    if (!filteredResumes) return null;
    return organizeResumeHierarchy(filteredResumes);
  }, [filteredResumes]);

  // Reset visible counts whenever filters, search, or active tab change
  useEffect(() => {
    setVisibleMyCVs(PAGE_SIZE);
    setVisibleTailored(PAGE_SIZE);
  }, [deferredSearch, activeTab, categoryFilters, scoreFilters, sortOption]);

  const hasActiveFilters = sortOption !== 'updated' || categoryFilters.length > 0 || scoreFilters.length > 0;

  const handleCategoryToggle = useCallback((cat: CategoryFilter) => {
    setCategoryFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }, []);

  const handleScoreToggle = useCallback((score: ScoreFilter) => {
    setScoreFilters(prev => prev.includes(score) ? prev.filter(s => s !== score) : [...prev, score]);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSortOption('updated');
    setCategoryFilters([]);
    setScoreFilters([]);
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!filteredResumes) return;
    setSelectedIds(new Set(filteredResumes.map(r => r.id)));
  }, [filteredResumes]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const confirmBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    haptics.warning();
    deleteMultipleResumes.mutate([...selectedIds], {
      onSuccess: () => {
        selectedIds.forEach(id => useATSScoreHistoryStore.getState().clearHistory(id));
        exitSelectionMode();
      },
    });
    setShowBulkDeleteConfirm(false);
  }, [selectedIds, deleteMultipleResumes, exitSelectionMode]);

  const isLoading = authLoading || resumesLoading;
  const hasResumes = filteredResumes && filteredResumes.length > 0;

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } }
  };

  // Handle creating a tailored version
  const handleCreateTailored = (parentId: string) => {
    setCreateTailoredParentId(parentId);
    setShowCreateDialog(true);
  };

  // Auth guard handled by ProtectedRoute

  // Suspense fallback already shows DashboardSkeleton; avoid double skeleton
  if (authLoading) return null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 pt-safe pt-3 pb-2 px-4 flex items-center justify-between glass-header">
        <button onClick={() => navigate('/')} aria-label="Back to home" className="touch-manipulation">
          <AppLogo size="sm" showTagline={false} hideText />
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl touch-manipulation active:scale-95"
            onClick={() => { haptics.light(); setShowFeatureMap(true); }}
            aria-label="What can I do?"
          >
            <HelpCircle className="w-4.5 h-4.5 text-muted-foreground" />
          </Button>
          <AICreditsIndicator />
          <div className="hidden sm:flex">
            <AIHealthBadge />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-11 h-11 rounded-xl touch-manipulation active:scale-95 relative"
            onClick={() => { haptics.light(); setShowTrash(true); }}
            aria-label="Trash"
          >
            <Trash2 className="w-5 h-5 text-muted-foreground" />
            {trashedResumes.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-11 h-11 rounded-xl touch-manipulation active:scale-95 relative"
            onClick={() => { haptics.light(); navigate('/settings'); }}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            {hasNewChangelog && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse" aria-label="New updates available" />
            )}
          </Button>
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
                <Avatar className="w-9 h-9 border-2 border-primary/20">
                  {profile?.avatarUrl && (
                    <AvatarImage src={profile.avatarUrl} alt={profile.fullName || 'Profile'} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {profile?.fullName
                      ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {/* Incomplete profile badge */}
                {user && profile && calculateProfileCompletion(profile) < 50 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive border border-background" />
                )}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-80 p-0">
              <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-row items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/20">
                    {profile?.avatarUrl && (
                      <AvatarImage src={profile.avatarUrl} alt={profile.fullName || 'Profile'} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {profile?.fullName
                        ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
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
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="pb-safe max-w-3xl xl:max-w-5xl mx-auto w-full">
          {/* Trust banner — only on first visit, hidden on small screens after first dismiss */}
          {showTrustBanner && (
            <div className="px-4 pt-3 hidden sm:block">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/10 bg-primary/5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Your career data is encrypted, private, and never shared.</p>
                </div>
                <button
                  onClick={() => { setShowTrustBanner(false); localStorage.setItem('wr-trust-banner-seen', 'true'); }}
                  className="shrink-0 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                </button>
              </div>
            </div>
          )}

          {/* Missing Profile Data Banner */}
          {showProfileBanner && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <User className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Complete your profile to get the most out of WiseResume.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="shrink-0 h-8">
                  Complete
                </Button>
                <button
                  onClick={() => { setShowProfileBanner(false); sessionStorage.setItem('wr-dismissed-profile-banner', 'true'); }}
                  className="shrink-0 active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-muted-foreground/70" />
                </button>
              </div>
            </div>
          )}

          {/* What's Next Card */}
          <WhatsNextCard />

          {/* Feature discovery merged into WhatsNextCard */}

          {/* Personalized Stats Header */}
          <DashboardStats
            totalResumes={resumes?.length || 0}
            healthScores={healthScores}
            userName={profile?.fullName}
            isScoring={scoringId !== null || (resumes != null && resumes.length > 0 && Object.keys(healthScores).length < resumes.length)}
            resumes={resumes ?? undefined}
            loginStreak={profile?.loginStreak}
          />

          {/* Quick Action Chips */}
          {resumes && resumes.length > 0 && (
            <QuickActionChips onCreateNew={handleCreateNew} />
          )}

          {/* Search pill — moved below tabs area conceptually, but above filter bar */}
          {resumes && resumes.length > 0 && (
            <div className="px-4 pb-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search in ${activeTab === 'my-cvs' ? 'My CVs' : 'Tailored'}...`}
                    value={searchQuery}
                    onChange={(e) => handleSetSearchQuery(e.target.value)}
                    className="pl-10 rounded-full h-10 sm:h-11 text-base glass-input"
                  />
                </div>
                {!selectionMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px] flex-shrink-0"
                    onClick={() => { haptics.light(); setSelectionMode(true); }}
                    aria-label="Select resumes"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <p className="text-[11px] text-muted-foreground px-1">
                  Searching in <span className="font-medium text-foreground">{activeTab === 'my-cvs' ? 'My CVs' : 'Tailored'}</span>
                </p>
              )}
            </div>
          )}

          {/* Selection toolbar */}
          {selectionMode && resumes && resumes.length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 rounded-xl glass-elevated px-3 py-2">
                <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="min-w-[44px] min-h-[44px]">
                  <X className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium flex-1">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs">
                  Select All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="min-h-[44px] active:scale-95"
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
              <Button variant="outline" onClick={() => refetch()} className="min-h-[44px] gap-2">
                <RefreshCw className="w-4 h-4" />
                Tap to retry
              </Button>
            </div>
          ) : !resumes || resumes.length === 0 ? (
            <>
              <EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => navigate('/onboarding')} />
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
            <div className="px-4 pb-4">
              <Tabs value={activeTab} onValueChange={handleSetActiveTab} className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="my-cvs" className="flex-1 gap-1.5">
                    My CVs
                    {resumeHierarchy && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                        {resumeHierarchy.masterResumes.length + resumeHierarchy.orphanTailored.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tailored" className="flex-1 gap-1.5">
                    Tailored
                    {filteredResumes && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                        {filteredResumes.filter(r => r.parent_resume_id).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Swipeable tab panels via Embla */}
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex" style={{ touchAction: 'pan-y pinch-zoom' }}>
                    {/* Slide 0: My CVs */}
                    <div className="flex-[0_0_100%] min-w-0">
                      <motion.div
                        className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
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
                                  <motion.div key={resume.id} variants={itemVariants}>
                                    <ResumeListCard
                                      resume={resume}
                                      onEdit={handleEdit}
                                      onDuplicate={handleDuplicate}
                                      onDelete={handleDelete}
                                      onRename={handleRename}
                                      onInterview={handleInterview}
                                      showMasterBadge={isMaster && !!resumeHierarchy.tailoredByParent[resume.id]?.length}
                                      showTailoredBadge={!isMaster}
                                      healthScore={healthScores[resume.id]}
                                      isScoring={scoringId === resume.id}
                                      selectionMode={selectionMode}
                                      selected={selectedIds.has(resume.id)}
                                      onToggleSelect={toggleSelection}
                                    />
                                  </motion.div>
                                );
                              })}
                              {myCVsRemaining > 0 && (
                                <div className="flex justify-center pt-2 pb-1">
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
                    </div>

                    {/* Slide 1: Tailored */}
                    <div className="flex-[0_0_100%] min-w-0">
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
                                onClick={() => { haptics.light(); navigate('/ai-studio?tool=tailor'); }}
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
                              <motion.div key={resume.id} variants={itemVariants}>
                                <div className="rounded-xl glass-elevated p-3 space-y-2">
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
                                    healthScore={healthScores[resume.id]}
                                    isScoring={scoringId === resume.id}
                                    selectionMode={selectionMode}
                                    selected={selectedIds.has(resume.id)}
                                    onToggleSelect={toggleSelection}
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
                    </div>
                  </div>
                </div>
              </Tabs>
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
          />
        )}
      </Suspense>



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This resume will be moved to trash and auto-deleted after 30 days. You can restore it anytime from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedIds.size} Resume{selectedIds.size > 1 ? 's' : ''} to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              These resumes will be moved to trash and auto-deleted after 30 days. You can restore them anytime from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={!!duplicateResumeId} onOpenChange={() => setDuplicateResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of this resume with all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>
              Duplicate
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
                template_id: 'modern',
              };
              const { data: created, error } = await supabase.from('resumes').insert(newResume).select().single();
              if (created && !error) {
                haptics.success();
                toast.success('Resume created from LinkedIn!');
                refetch();
                navigate(`/editor`);
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
      <TrashSheet open={showTrash} onOpenChange={setShowTrash} />
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
