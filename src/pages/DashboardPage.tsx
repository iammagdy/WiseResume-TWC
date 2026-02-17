import { useState, useEffect, useRef, useMemo, useDeferredValue, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, User, Settings, LogOut, FileText as FileTextIcon, Upload, Briefcase, Sparkles, Linkedin, BookOpen, TrendingUp, FileSignature, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { DailyTipCard } from '@/components/dashboard/DailyTipCard';
import { FloatingCreateButton } from '@/components/dashboard/FloatingCreateButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calculateProfileCompletion } from '@/hooks/useProfile';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const OnboardingCarousel = lazy(() => import('@/components/onboarding/OnboardingCarousel').then(m => ({ default: m.OnboardingCarousel })));
const LinkedInImportSheet = lazy(() => import('@/components/settings/LinkedInImportSheet').then(m => ({ default: m.LinkedInImportSheet })));
const AnalyzeJobSheet = lazy(() => import('@/components/dashboard/AnalyzeJobSheet').then(m => ({ default: m.AnalyzeJobSheet })));

import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore } from '@/hooks/useResumeScore';
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, session } = useAuth();
  const { isMigrating } = useGuestMigration(session);
  const { data: resumes, isLoading: resumesLoading, refetch } = useResumes();
  const { deleteResume, duplicateResume, updateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { scoreResume, getCachedScore, scoringId } = useResumeScore();
  const { profile } = useProfile(user?.id, user);
  const [healthScores, setHealthScores] = useState<Record<string, ResumeHealthScore>>({});
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTailoredParentId, setCreateTailoredParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [duplicateResumeId, setDuplicateResumeId] = useState<string | null>(null);
  const [deletedResume, setDeletedResume] = useState<{ id: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [showAnalyzeJob, setShowAnalyzeJob] = useState(false);
  
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tipVisible, setTipVisible] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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
    const checkOnboardingStatus = async () => {
      if (!user) {
        setProfileLoaded(true);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();
        
        if (data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Failed to check onboarding:', err);
      } finally {
        setProfileLoaded(true);
      }
    };
    
    checkOnboardingStatus();
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
        const score = await scoreResume(resume.id, resumeData, resume.updated_at);
        if (score && !cancelled) {
          setHealthScores(prev => ({ ...prev, [resume.id]: score }));
        }
      }
    };
    
    const timer = setTimeout(scoreNext, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [resumes, scoreResume, getCachedScore]);

  const [onboardingTemplateId, setOnboardingTemplateId] = useState<string | null>(null);

  const handleOnboardingComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    }
    // Sync both onboarding systems
    localStorage.setItem('wr-onboarding-completed', 'true');
    haptics.success();
    setShowOnboarding(false);

    // Consume onboarding template selection
    const savedTemplate = localStorage.getItem('wr-onboarding-template');
    localStorage.removeItem('wr-onboarding-goal');
    localStorage.removeItem('wr-onboarding-template');
    if (savedTemplate) {
      setOnboardingTemplateId(savedTemplate);
      // Small delay to let the onboarding exit animation finish
      setTimeout(() => setShowCreateDialog(true), 400);
    }
  };

  const handleOnboardingChoice = (choice: 'scratch' | 'upload' | 'template') => {
    if (choice === 'scratch') {
      navigate('/editor');
    } else if (choice === 'upload') {
      navigate('/upload');
    } else if (choice === 'template') {
      setShowCreateDialog(true);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    haptics.success();
    toast.success('Resumes refreshed');
  };

  const handleEdit = (resumeId: string) => {
    haptics.light();
    navigate(`/resume/${resumeId}`);
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
          toast.success(`"${resumeToDelete?.title}" deleted`, {
            action: {
              label: 'Undo',
              onClick: () => {
                toast.info('Undo not available - resume permanently deleted');
              },
            },
            duration: 5000,
          });
        },
      });
      setDeleteResumeId(null);
    }
  };

  // Deferred search for smoother typing
  const deferredSearch = useDeferredValue(searchQuery);

  // Filter resumes by search query
  const filteredResumes = resumes?.filter(resume => {
    if (!deferredSearch) return true;
    const query = deferredSearch.toLowerCase();
    return (
      resume.title.toLowerCase().includes(query) ||
      resume.target_job_title?.toLowerCase().includes(query) ||
      resume.target_company?.toLowerCase().includes(query)
    );
  });

  // Organize resumes into hierarchy
  const resumeHierarchy = useMemo(() => {
    if (!filteredResumes) return null;
    return organizeResumeHierarchy(filteredResumes);
  }, [filteredResumes]);

  const isLoading = authLoading || resumesLoading;
  const hasResumes = filteredResumes && filteredResumes.length > 0;

  const itemVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 }
  };

  // Handle creating a tailored version
  const handleCreateTailored = (parentId: string) => {
    setCreateTailoredParentId(parentId);
    setShowCreateDialog(true);
  };

  // Auth guard handled by ProtectedRoute

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60]"
        >
          <Suspense fallback={null}>
            <OnboardingCarousel
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingComplete}
              onChoice={handleOnboardingChoice}
            />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (authLoading || !profileLoaded) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="pt-safe pt-4 pb-3 px-4 flex items-center justify-between border-b border-border">
          <div className="w-24 h-8 rounded bg-muted animate-pulse" />
          <div className="w-20 h-8 rounded bg-muted animate-pulse" />
        </header>
        <div className="px-4 pt-4 pb-3">
          <div className="w-32 h-7 rounded bg-muted animate-pulse mb-2" />
          <div className="w-20 h-5 rounded bg-muted animate-pulse" />
        </div>
        <div className="px-4">
          <SkeletonCardList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-3 pb-2 px-4 flex items-center justify-between glass-header">
          <button onClick={() => navigate('/')} aria-label="Back to home" className="touch-manipulation">
            <AppLogo size="sm" showTagline={false} hideText />
          </button>
          <div className="flex items-center gap-2">
            <AIHealthBadge />
            <Popover onOpenChange={(open) => {
              if (open && !localStorage.getItem('wr-profile-pulse-seen')) {
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
                  {!localStorage.getItem('wr-profile-pulse-seen') && (
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
                        await supabase.auth.signOut();
                        navigate('/auth');
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
          <div className="pb-safe max-w-3xl mx-auto w-full">
            {/* Daily Tip - below header, auto-hides */}
            <DailyTipCard onVisibilityChange={setTipVisible} />

            {/* Personalized Stats Header */}
            <DashboardStats
              totalResumes={resumes?.length || 0}
              healthScores={healthScores}
              userName={profile?.fullName}
              isScoring={scoringId !== null || (resumes != null && resumes.length > 0 && Object.keys(healthScores).length < resumes.length)}
            />

            {/* Quick Action Chips */}
            {resumes && resumes.length > 0 && (
              <QuickActionChips onCreateNew={handleCreateNew} />
            )}

            {/* Search pill */}
            {resumes && resumes.length > 0 && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resumes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-full h-12 sm:h-11 text-base glass-input"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            {isLoading ? (
              <div className="px-4">
                <SkeletonCardList count={3} />
              </div>
            ) : !resumes || resumes.length === 0 ? (
              <>
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-2 px-4 xs:gap-3 xs:px-6 mb-4">
                  <ActionCard
                    icon={FileTextIcon}
                    title="New Resume"
                    description="Start from scratch"
                    onClick={handleCreateNew}
                    aria-label="Create new resume"
                  />
                  <ActionCard
                    icon={Upload}
                    title="Import PDF"
                    description="Upload existing resume"
                    onClick={() => navigate('/upload')}
                    aria-label="Import PDF resume"
                  />
                  <ActionCard
                    icon={Briefcase}
                    title="Browse Jobs"
                    description="Find opportunities"
                    onClick={() => navigate('/applications')}
                    aria-label="Browse job listings"
                  />
                  <ActionCard
                    icon={Linkedin}
                    title="Import LinkedIn"
                    description="Import your profile"
                    onClick={() => setShowLinkedInImport(true)}
                    aria-label="Import from LinkedIn"
                  />
                  <ActionCard
                    icon={BookOpen}
                    title="Examples"
                    description="Browse resume samples"
                    onClick={() => navigate('/examples')}
                    aria-label="Browse resume examples"
                  />
                  <ActionCard
                    icon={TrendingUp}
                    title="Career Plan"
                    description="AI career roadmap"
                    onClick={() => navigate('/career')}
                    aria-label="Career planning"
                  />
                  <ActionCard
                    icon={FileSignature}
                    title="Resign Letter"
                    description="Professional templates"
                    onClick={() => navigate('/resignation-letters')}
                    aria-label="Resignation letters"
                  />
                  <ActionCard
                    icon={GraduationCap}
                    title="Guides"
                    description="Career tips & advice"
                    onClick={() => navigate('/guides')}
                    aria-label="Career guides"
                  />
                </div>
                <EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => setShowOnboarding(true)} />
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
                <motion.div 
                  className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                      },
                    },
                  }}
                >
                  {resumeHierarchy && (
                    <>
                      {/* Render master resumes with their tailored versions */}
                      {resumeHierarchy.masterResumes.map((masterResume, index) => {
                        const tailoredVersions = resumeHierarchy.tailoredByParent[masterResume.id] || [];
                        
                        if (tailoredVersions.length > 0) {
                          return (
                            <motion.div key={masterResume.id} variants={itemVariants}>
                              <ResumeGroup
                                masterResume={masterResume}
                                tailoredVersions={tailoredVersions}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRename={handleRename}
                                onInterview={handleInterview}
                                onCreateTailored={handleCreateTailored}
                                healthScores={healthScores}
                                scoringId={scoringId}
                              />
                            </motion.div>
                          );
                        }

                        // Single resume without tailored versions
                        return (
                          <motion.div key={masterResume.id} variants={itemVariants}>
                            <ResumeListCard
                              resume={masterResume}
                              onEdit={handleEdit}
                              onDuplicate={handleDuplicate}
                              onDelete={handleDelete}
                              onRename={handleRename}
                              onInterview={handleInterview}
                              healthScore={healthScores[masterResume.id]}
                              isScoring={scoringId === masterResume.id}
                            />
                          </motion.div>
                        );
                      })}

                      {/* Render orphaned tailored resumes (parent was deleted) */}
                      {resumeHierarchy.orphanTailored.map((resume, index) => (
                        <motion.div key={resume.id} variants={itemVariants}>
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
                          />
                        </motion.div>
                      ))}
                    </>
                  )}
                </motion.div>
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

      {/* Floating Create Button */}
      {resumes && resumes.length > 0 && (
        <FloatingCreateButton
          onClick={handleCreateNew}
          onTailor={() => navigate('/ai-studio')}
          onAnalyzeJob={() => setShowAnalyzeJob(true)}
          pulse={tipVisible}
          isLoading={isCreating || isMigrating}
        />
      )}


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resume and all its content.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptics.light()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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

    </div>
  );
}
