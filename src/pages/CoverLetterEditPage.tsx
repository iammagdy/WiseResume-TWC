import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Download, Trash2, Save, Sparkles } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCoverLetter, useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { generateCoverLetter } from '@/lib/aiTailor';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

import { DetailSkeleton } from '@/components/layout/PageSkeletons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

export default function CoverLetterEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: letter, isLoading } = useCoverLetter(id || null);
  const { updateCoverLetter, deleteCoverLetter } = useCoverLetterMutations();
  const { data: resumes } = useResumes();

  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTailorSheet, setShowTailorSheet] = useState(false);
  const [tailorJobDesc, setTailorJobDesc] = useState('');
  const [tailoring, setTailoring] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (letter) setContent(letter.content);
  }, [letter]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (id) {
        updateCoverLetter.mutate({ id, content: newContent });
        setHasUnsavedChanges(false);
      }
    }, 2000);
  }, [id, updateCoverLetter]);

  const handleSave = useCallback(() => {
    if (!id || !content.trim()) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    updateCoverLetter.mutate({ id, content });
    setHasUnsavedChanges(false);
    haptics.light();
    toast.success('Saved');
  }, [id, content, updateCoverLetter]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    haptics.light();
    toast.success('Copied to clipboard');
  }, [content]);

  const handleDownloadPDF = useCallback(async () => {
    if (!content || !letter) return;
    try {
      const { downloadCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
      await downloadCoverLetterPDF({ ...letter, content });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  }, [content, letter]);

  const handleTailor = useCallback(async () => {
    if (!tailorJobDesc.trim() || !letter?.resume_id) {
      toast.error('Enter a job description. Make sure this letter has a linked resume.');
      return;
    }
    const resume = resumes?.find((r) => r.id === letter.resume_id);
    if (!resume) {
      toast.error('Linked resume not found');
      return;
    }
    setTailoring(true);
    try {
      const resumeData = dbToResumeData(resume);
      const newLetter = await generateCoverLetter(resumeData, tailorJobDesc, (letter.tone as 'professional' | 'enthusiastic' | 'conversational') || 'professional');
      setContent(newLetter);
      setHasUnsavedChanges(true);
      setShowTailorSheet(false);
      setTailorJobDesc('');
      haptics.success();
      toast.success('Cover letter tailored!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to tailor');
    } finally {
      setTailoring(false);
    }
  }, [tailorJobDesc, letter, resumes]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    haptics.warning();
    deleteCoverLetter.mutate(id, {
      onSuccess: () => navigate('/cover-letters', { replace: true }),
    });
  }, [id, deleteCoverLetter, navigate]);

  // Auth guard handled by ProtectedRoute

  if (isLoading || authLoading) return <DetailSkeleton />;
  if (!letter) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Cover letter not found</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-header px-4 py-3 space-y-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cover-letters')}
            className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{letter.title || letter.job_title}</h1>
            <div className="flex items-center gap-2">
              {letter.company && <span className="text-xs text-muted-foreground truncate">{letter.company}</span>}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">{letter.tone}</Badge>
              {hasUnsavedChanges && <span className="text-[10px] text-warning">Unsaved</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="touch-manipulation">
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
        </div>
        <Breadcrumb items={['AI Tools', 'Cover Letters', 'Edit']} className="pl-10" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-4 pb-32">
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[60vh] text-[15px] leading-relaxed"
              autoFocus
            />
          ) : (
            <div className="glass-elevated rounded-2xl p-5 text-sm whitespace-pre-wrap leading-relaxed min-h-[40vh]">
              {content}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-safe">
        <div className="glass-header rounded-2xl p-2.5 flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 flex-1 h-10" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
          <Button variant="outline" size="sm" className="gap-1 flex-1 h-10" onClick={handleCopy}>
            <Copy className="w-4 h-4" /> Copy
          </Button>
          <Button variant="outline" size="sm" className="gap-1 flex-1 h-10" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-10" onClick={() => setShowTailorSheet(true)}>
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-10 text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tailor Sheet */}
      <Sheet open={showTailorSheet} onOpenChange={setShowTailorSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader>
            <SheetTitle>Tailor to Job</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              placeholder="Paste the new job description here..."
              value={tailorJobDesc}
              onChange={(e) => setTailorJobDesc(e.target.value)}
              rows={6}
            />
            <Button className="w-full gap-2" onClick={handleTailor} disabled={tailoring || !tailorJobDesc.trim()}>
              {tailoring ? <MiniSpinner size={16} /> : <Sparkles className="w-4 h-4" />}
              {tailoring ? 'Tailoring...' : 'Regenerate Cover Letter'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
