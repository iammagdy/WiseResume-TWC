import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { CoverLetterCard } from '@/components/cover-letter/CoverLetterCard';
import { CoverLetterActionSheet } from '@/components/cover-letter/CoverLetterActionSheet';
import { useCoverLetters, useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { useAuth } from '@/hooks/useAuth';
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

export default function CoverLettersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: letters, isLoading, refetch } = useCoverLetters();
  const { saveCoverLetter, deleteCoverLetter } = useCoverLetterMutations();

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
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const margin = 72;
      const pageWidth = 612;
      const pageHeight = 792;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = fontSize * 1.5;

      const lines: string[] = [];
      for (const paragraph of letter.content.split('\n')) {
        if (!paragraph.trim()) { lines.push(''); continue; }
        const words = paragraph.split(/\s+/);
        let currentLine = '';
        for (const word of words) {
          const test = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      for (const line of lines) {
        if (y < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${letter.job_title || 'untitled'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  }, [letters]);

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

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-header px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
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
        <div className="pb-safe">
          {/* Search */}
          {letters && letters.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search cover letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full h-11 glass-input"
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
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl glass-elevated flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-accent opacity-50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {searchQuery ? 'No matches found' : 'No cover letters yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                {searchQuery
                  ? `No cover letters match "${searchQuery}"`
                  : 'Create your first AI-powered cover letter tailored to any job'}
              </p>
              {!searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  style={{ touchAction: 'pan-y' }}
                  onClick={() => navigate('/cover-letter/new')}
                  className="gradient-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Cover Letter
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
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-2xl gradient-primary shadow-lg flex items-center justify-center active:scale-95 pr-safe"
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
