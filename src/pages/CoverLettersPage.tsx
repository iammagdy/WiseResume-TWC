import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { CoverLetterCard } from '@/components/cover-letter/CoverLetterCard';
import { EmptyCoverLetters } from '@/components/cover-letter/EmptyCoverLetters';
import { CoverLetterActionSheet } from '@/components/cover-letter/CoverLetterActionSheet';
import { useCoverLetters, useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeWall } from '@/components/plan/UpgradeWall';

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

export default function CoverLettersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro, isLoading: planLoading } = usePlan();
  const { data: letters, isLoading, refetch } = useCoverLetters();
  const { saveCoverLetter, deleteCoverLetter } = useCoverLetterMutations();
  const { data: resumes } = useResumes();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionSheetId, setActionSheetId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    await refetch();
    haptics.success();
    toast.success('Refreshed');
  }, [refetch]);

  const handleDuplicate = useCallback((id: string) => {
    const letter = letters?.find((l) => l.id === id);
    if (!letter) return;
    saveCoverLetter.mutate({
      job_title: letter.job_title,
      company: letter.company || undefined,
      content: letter.content,
      tone: letter.tone || undefined,
      resume_id: letter.resume_id || undefined,
      title: `${letter.title || letter.job_title} (Copy)`,
    });
  }, [letters, saveCoverLetter]);

  const handleDownload = useCallback(async (id: string) => {
    const letter = letters?.find((l) => l.id === id);
    if (!letter) return;
    try {
      const { downloadCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
      const linkedResume = resumes?.find(r => r.id === letter.resume_id);
      const accentHex = linkedResume ? dbToResumeData(linkedResume).customization?.accentColor : undefined;
      await downloadCoverLetterPDF({ ...letter, accentHex });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  }, [letters, resumes]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    haptics.warning();
    deleteCoverLetter.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteCoverLetter]);

  // Auth guard handled by ProtectedRoute

  const filtered = letters?.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.job_title.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.title?.toLowerCase().includes(q)
    );
  });

  const actionLetter = letters?.find((l) => l.id === actionSheetId);

  // Feature gate: Cover Letters is Pro+
  if (planLoading) return null;
  if (!isPro) {
    return (
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-bold flex-1">Cover Letters</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <UpgradeWall
            requiredPlan="pro"
            featureName="Cover Letters"
            description="Generate tailored cover letters that match your resume and any job description."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-bold flex-1">Cover Letters</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{ touchAction: 'pan-y' }}
          onClick={() => { haptics.light(); navigate('/cover-letter/new'); }}
          className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-manipulation active:scale-95"
          aria-label="New cover letter"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </motion.button>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="pb-safe lg:max-w-none mx-auto w-full">
          {/* Search */}
          {letters && letters.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search cover letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full h-11 bg-input border border-border"
                />
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading || authLoading ? (
            <div className="px-4 pt-3">
              <SkeletonCardList count={3} />
            </div>
          ) : !filtered || filtered.length === 0 ? (
            searchQuery ? (
              <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-soft flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-accent opacity-50" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No matches found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                  No cover letters match "{searchQuery}"
                </p>
              </div>
            ) : (
              <EmptyCoverLetters onCreateNew={() => navigate('/cover-letter/new')} />
            )
          ) : (
            <div className="px-4 pt-2 pb-4 space-y-3">
              <AnimatePresence initial={false}>
                {filtered.map((letter) => (
                  <motion.div
                    key={letter.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    layout
                  >
                    <CoverLetterCard
                      letter={letter}
                      onEdit={(id) => navigate(`/cover-letter/edit/${id}`)}
                      onDuplicate={(id) => { setDeleteId(null); handleDuplicate(id); }}
                      onDelete={(id) => setDeleteId(id)}
                      onMenuOpen={(id) => setActionSheetId(id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* FAB */}
      {filtered && filtered.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{ touchAction: 'pan-y' }}
          onClick={() => { haptics.light(); navigate('/cover-letter/new'); }}
          className="fixed bottom-[7rem] right-4 z-50 w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center active:scale-95 pr-safe"
          aria-label="New cover letter"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}

      {/* Action Sheet */}
      <CoverLetterActionSheet
        open={!!actionSheetId}
        onOpenChange={() => setActionSheetId(null)}
        title={actionLetter?.title || actionLetter?.job_title}
        onEdit={() => actionSheetId && navigate(`/cover-letter/edit/${actionSheetId}`)}
        onDuplicate={() => actionSheetId && handleDuplicate(actionSheetId)}
        onDownload={() => actionSheetId && handleDownload(actionSheetId)}
        onDelete={() => { if (actionSheetId) { setDeleteId(actionSheetId); setActionSheetId(null); } }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
