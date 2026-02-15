import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Search, FileSignature, Building2, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { useResignationLetters, useResignationLetterMutations } from '@/hooks/useResignationLetters';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

import { format } from 'date-fns';
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

export default function ResignationLettersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: letters, isLoading, refetch } = useResignationLetters();
  const { deleteLetter } = useResignationLetterMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    await refetch();
    haptics.success();
    toast.success('Refreshed');
  }, [refetch]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    haptics.warning();
    deleteLetter.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteLetter]);

  // Auth guard handled by ProtectedRoute

  const filtered = letters?.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.company?.toLowerCase().includes(q) ||
      l.position?.toLowerCase().includes(q) ||
      l.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 glass-header px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Resignation Letters</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{ touchAction: 'pan-y' }}
          onClick={() => { haptics.light(); navigate('/resignation-letter/new'); }}
          className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-manipulation active:scale-95"
          aria-label="New resignation letter"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </motion.button>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="pb-safe">
          {letters && letters.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search resignation letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full h-11 glass-input"
                />
              </div>
            </div>
          )}

          {isLoading || authLoading ? (
            <div className="px-4 pt-3">
              <SkeletonCardList count={3} />
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl glass-elevated flex items-center justify-center mb-4">
                <FileSignature className="w-8 h-8 text-accent opacity-50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {searchQuery ? 'No matches found' : 'No resignation letters yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                {searchQuery
                  ? `No letters match "${searchQuery}"`
                  : 'Create a professional resignation letter with AI assistance'}
              </p>
              {!searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  style={{ touchAction: 'pan-y' }}
                  onClick={() => navigate('/resignation-letter/new')}
                  className="gradient-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Letter
                </motion.button>
              )}
            </div>
          ) : (
            <div className="px-4 pt-2 pb-4 space-y-3">
              <AnimatePresence initial={false}>
                {filtered.map((letter) => (
                  <motion.div
                    key={letter.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    layout
                  >
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      style={{ touchAction: 'pan-y' }}
                      onClick={() => navigate(`/resignation-letter/edit/${letter.id}`)}
                      className="w-full text-left glass-elevated rounded-2xl p-4 space-y-2 active:scale-[0.98] touch-manipulation"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {letter.title || `${letter.company || 'Company'} Resignation`}
                        </h3>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(letter.id); }}
                          className="text-xs text-destructive/60 hover:text-destructive p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {letter.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {letter.company}
                          </span>
                        )}
                        {letter.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(letter.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {letter.content.slice(0, 120)}...
                      </p>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PullToRefresh>

      {filtered && filtered.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{ touchAction: 'pan-y' }}
          onClick={() => { haptics.light(); navigate('/resignation-letter/new'); }}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center active:scale-95 pr-safe"
          aria-label="New resignation letter"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resignation Letter?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
