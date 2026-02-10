import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Sparkles } from 'lucide-react';
import { ThemeDropdown } from '@/components/settings/ThemeDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { AppLogo } from '@/components/brand/AppLogo';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { ResumeGroup, organizeResumeHierarchy } from '@/components/dashboard/ResumeGroup';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonCardList } from '@/components/ui/skeleton-card';

// Lazy-loaded dialogs
const CreateResumeDialog = lazy(() => import('@/components/dashboard/CreateResumeDialog').then(m => ({ default: m.CreateResumeDialog })));
const OnboardingCarousel = lazy(() => import('@/components/onboarding/OnboardingCarousel').then(m => ({ default: m.OnboardingCarousel })));
import { useAuth } from '@/hooks/useAuth';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
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
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTailoredParentId, setCreateTailoredParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [deletedResume, setDeletedResume] = useState<{ id: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check onboarding status when user is authenticated
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();
        
        if (data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
        setProfileLoaded(true);
      }
    };
    
    checkOnboardingStatus();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleOnboardingComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    }
    haptics.success();
    setShowOnboarding(false);
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
        <header className="pt-safe pt-4 pb-3 px-4 flex items-center justify-between glass-header">
          <AppLogo size="sm" />
          <div className="flex items-center gap-2">
            {/* Explore Landing Page Button */}
            <motion.button
              onClick={() => {
                haptics.light();
                navigate('/');
              }}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/40 transition-colors touch-manipulation overflow-hidden min-h-[44px]"
              whileTap={{ scale: 0.95 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <Sparkles className="w-3.5 h-3.5 text-primary relative z-10" />
              <span className="relative z-10 text-foreground">Explore</span>
            </motion.button>
            <ThemeDropdown />
          </div>
        </header>

        {/* Title Bar */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Resumes</h1>
            <p className="text-sm text-muted-foreground">
              {resumes?.length || 0} resume{resumes?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => {
              haptics.light();
              setShowCreateDialog(true);
            }}
            className="gradient-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>

        {/* Search (only show if there are resumes) */}
        {resumes && resumes.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Interview Prep Banner */}
        {resumes && resumes.length > 0 && (
          <NextStepBanner
            variant="interview"
            onAction={() => {
              const firstResume = resumes[0];
              if (firstResume) {
                haptics.light();
                setCurrentResumeId(firstResume.id);
                setCurrentResume(dbToResumeData(firstResume));
                navigate('/interview');
              }
            }}
          />
        )}

        {/* Content with Pull-to-Refresh */}
        {isLoading ? (
          <div className="flex-1 px-4 pb-safe">
            <SkeletonCardList count={3} />
          </div>
        ) : !resumes || resumes.length === 0 ? (
          <EmptyState onCreateNew={() => setShowCreateDialog(true)} />
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
                className="space-y-4 pb-4"
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
                          <ResumeGroup
                            key={masterResume.id}
                            masterResume={masterResume}
                            tailoredVersions={tailoredVersions}
                            onEdit={handleEdit}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            onInterview={handleInterview}
                            onCreateTailored={handleCreateTailored}
                            delay={index * 0.05}
                          />
                        );
                      }
                      
                      // Single resume without tailored versions
                      return (
                        <ResumeListCard
                          key={masterResume.id}
                          resume={masterResume}
                          onEdit={handleEdit}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                          onInterview={handleInterview}
                          delay={index * 0.05}
                        />
                      );
                    })}
                    
                    {/* Render orphaned tailored resumes (parent was deleted) */}
                    {resumeHierarchy.orphanTailored.map((resume, index) => (
                      <ResumeListCard
                        key={resume.id}
                        resume={resume}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onInterview={handleInterview}
                        delay={(resumeHierarchy.masterResumes.length + index) * 0.05}
                        showTailoredBadge
                      />
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

      {/* Temporary Toast Test Panel */}
      <div className="fixed bottom-20 right-4 z-50 glass-elevated rounded-2xl p-2 flex gap-1.5 shadow-xl border border-border/40">
        <button
          onClick={() => toast.success("Resume saved successfully!", { description: "Your changes have been synced." })}
          className="p-2 rounded-xl hover:bg-[hsl(var(--success)/0.15)] transition-colors"
          title="Test Success"
        >
          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
        </button>
        <button
          onClick={() => toast.error("Export failed", { description: "Please check your connection and try again." })}
          className="p-2 rounded-xl hover:bg-[hsl(var(--destructive)/0.15)] transition-colors"
          title="Test Error"
        >
          <XCircle className="w-4 h-4 text-[hsl(var(--destructive))]" />
        </button>
        <button
          onClick={() => toast.warning("Storage almost full", { description: "You have 2 resumes remaining on the free plan." })}
          className="p-2 rounded-xl hover:bg-[hsl(var(--warning)/0.15)] transition-colors"
          title="Test Warning"
        >
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
        </button>
        <button
          onClick={() => toast.info("New templates available", { description: "Check out 3 new professional templates." })}
          className="p-2 rounded-xl hover:bg-[hsl(var(--secondary)/0.15)] transition-colors"
          title="Test Info"
        >
          <Info className="w-4 h-4 text-[hsl(var(--secondary))]" />
        </button>
      </div>
    </div>
  );
}
