import { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, User, Settings, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { AppLogo } from '@/components/brand/AppLogo';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { ResumeGroup, organizeResumeHierarchy } from '@/components/dashboard/ResumeGroup';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActionChips } from '@/components/dashboard/QuickActionChips';
import { DailyTipCard } from '@/components/dashboard/DailyTipCard';
import { FloatingCreateButton } from '@/components/dashboard/FloatingCreateButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateProfileCompletion } from '@/hooks/useProfile';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const OnboardingCarousel = lazy(() => import('@/components/onboarding/OnboardingCarousel').then(m => ({ default: m.OnboardingCarousel })));
const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));
import { useAuth } from '@/hooks/useAuth';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useResumeScore, ResumeHealthScore } from '@/hooks/useResumeScore';
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
  const { user, loading: authLoading } = useAuth();
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
  const [deletedResume, setDeletedResume] = useState<{ id: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tipVisible, setTipVisible] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Reset loading state when dialog opens
  useEffect(() => {
    if (showCreateDialog) setIsCreating(false);
  }, [showCreateDialog]);

  // Guest-gated create handler
  const handleCreateNew = useCallback(() => {
    if (!user && resumes && resumes.length > 0) {
      setShowSignInPrompt(true);
      return;
    }
    setIsCreating(true);
    setShowCreateDialog(true);
  }, [user, resumes]);

  // Check onboarding status for both authenticated and guest users
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        // Guest: check localStorage
        const seen = localStorage.getItem('wr-onboarding-seen');
        if (!seen) {
          setShowOnboarding(true);
        }
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

  // Guests can use the dashboard - no forced redirect to /auth

  // Auto-score resumes in background (one at a time, debounced)
  useEffect(() => {
    if (!resumes || resumes.length === 0) return;
    
    let cancelled = false;
    
    const scoreNext = async () => {
      for (const resume of resumes) {
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

  const handleOnboardingComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    } else {
      localStorage.setItem('wr-onboarding-seen', 'true');
    }
    haptics.success();
    setShowOnboarding(false);
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
    const resume = resumes?.find(r => r.id === resumeId);
    if (resume) {
      haptics.light();
      setCurrentResumeId(resumeId);
      setCurrentResume(dbToResumeData(resume));
      navigate('/editor');
    }
  };

  const handleDuplicate = (resumeId: string) => {
    haptics.success();
    duplicateResume.mutate(resumeId, {
      onSuccess: () => {
        toast.success('Resume duplicated successfully');
      },
    });
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
          // Show toast with undo option
          toast.success(`"${resumeToDelete?.title}" deleted`, {
            action: {
              label: 'Undo',
              onClick: () => {
                // Note: True undo would require soft delete in DB
                // For now, we just show the message
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

  // Filter resumes by search query
  const filteredResumes = resumes?.filter(resume => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
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

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
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
          <AppLogo size="sm" showTagline={false} hideText />
          <div className="flex items-center gap-2">
            <DropdownMenu onOpenChange={(open) => {
              if (open && !localStorage.getItem('wr-profile-pulse-seen')) {
                localStorage.setItem('wr-profile-pulse-seen', 'true');
              }
            }}>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="touch-manipulation relative"
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
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { haptics.light(); navigate('/settings'); }}>
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { haptics.light(); navigate('/settings'); }}>
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem onClick={async () => {
                    haptics.warning();
                    await supabase.auth.signOut();
                    navigate('/auth');
                  }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => { haptics.light(); navigate('/auth'); }}>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Daily Tip - below header, auto-hides */}
        <DailyTipCard onVisibilityChange={setTipVisible} />

        {/* Personalized Stats Header */}
        <DashboardStats
          totalResumes={resumes?.length || 0}
          healthScores={healthScores}
          userName={profile?.fullName}
        />

        {/* Search pill */}
        {resumes && resumes.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full h-11 glass-input"
              />
            </div>
          </div>
        )}

        {/* Content with Pull-to-Refresh */}
        {isLoading ? (
          <div className="flex-1 px-4 pb-safe">
            <SkeletonCardList count={3} />
          </div>
        ) : !resumes || resumes.length === 0 ? (
          <EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => setShowOnboarding(true)} />
        ) : !hasResumes ? (
          <div className="flex-1 flex items-center justify-center px-4">
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
          <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-hidden">
            <div className="px-4 pb-safe h-full overflow-y-auto">
              <motion.div 
                className="space-y-4 pb-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"
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
          </PullToRefresh>
        )}

      {/* Create Resume Dialog - lazy loaded */}
      <Suspense fallback={null}>
        {showCreateDialog && (
          <CreateResumeDialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) setCreateTailoredParentId(null);
            }}
            existingResumes={resumes || []}
            parentResumeId={createTailoredParentId}
          />
        )}
      </Suspense>

      {/* Floating Create Button */}
      {resumes && resumes.length > 0 && (
        <FloatingCreateButton onClick={handleCreateNew} pulse={tipVisible} isLoading={isCreating} />
      )}

      {/* Sign In Prompt for guests */}
      <Suspense fallback={null}>
        {showSignInPrompt && (
          <SignInPromptDialog
            open={showSignInPrompt}
            onOpenChange={setShowSignInPrompt}
            title="Create Unlimited Resumes"
            description="Sign in to create and manage multiple resumes."
          />
        )}
      </Suspense>

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

    </div>
  );
}
