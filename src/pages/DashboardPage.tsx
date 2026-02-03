import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, LogOut } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/brand/AppLogo';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { CreateResumeDialog } from '@/components/dashboard/CreateResumeDialog';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
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
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: resumes, isLoading: resumesLoading, refetch } = useResumes();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [deletedResume, setDeletedResume] = useState<{ id: string; title: string } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

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

  const handleSignOut = async () => {
    haptics.medium();
    await signOut();
    navigate('/');
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

  const isLoading = authLoading || resumesLoading;
  const hasResumes = filteredResumes && filteredResumes.length > 0;

  if (authLoading) {
    return (
      <MobileLayout>
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
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-4 pb-3 px-4 flex items-center justify-between border-b border-border">
          <AppLogo size="sm" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
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

        {/* Content */}
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
          <div className="flex-1 overflow-y-auto px-4 pb-safe">
            <motion.div 
              className="space-y-3 pb-4"
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
              {filteredResumes.map((resume, index) => (
                <ResumeListCard
                  key={resume.id}
                  resume={resume}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  delay={index * 0.05}
                />
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Resume Dialog */}
      <CreateResumeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        existingResumes={resumes || []}
      />

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
    </MobileLayout>
  );
}
