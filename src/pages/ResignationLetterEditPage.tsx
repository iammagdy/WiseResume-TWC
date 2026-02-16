import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Download, Trash2, Save, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useResignationLetter, useResignationLetterMutations } from '@/hooks/useResignationLetters';
import { ResignationChecklist } from '@/components/resignation/ResignationChecklist';
import { useAuth } from '@/hooks/useAuth';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/safeClient';
import { haptics } from '@/lib/haptics';
import { getUserGeminiKey } from '@/lib/aiProvider';
import { toast } from 'sonner';
import { DetailSkeleton } from '@/components/layout/PageSkeletons';
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

export default function ResignationLetterEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: letter, isLoading } = useResignationLetter(id || null);
  const { updateLetter, deleteLetter } = useResignationLetterMutations();

  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState<string[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (letter) {
      setContent(letter.content);
      setChecklistProgress(Array.isArray(letter.checklist_progress) ? letter.checklist_progress : []);
    }
  }, [letter]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (id) {
        updateLetter.mutate({ id, content: newContent } as any);
        setHasUnsavedChanges(false);
      }
    }, 2000);
  }, [id, updateLetter]);

  const handleSave = useCallback(() => {
    if (!id || !content.trim()) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    updateLetter.mutate({ id, content } as any);
    setHasUnsavedChanges(false);
    haptics.light();
    toast.success('Saved');
  }, [id, content, updateLetter]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    haptics.light();
    toast.success('Copied to clipboard');
  }, [content]);

  const handleDownloadPDF = useCallback(async () => {
    if (!content) return;
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const margin = 72;
      const pw = 612;
      const ph = 792;
      const maxW = pw - margin * 2;
      const lh = fontSize * 1.5;

      const lines: string[] = [];
      for (const para of content.split('\n')) {
        if (!para.trim()) { lines.push(''); continue; }
        const words = para.split(/\s+/);
        let cur = '';
        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (font.widthOfTextAtSize(test, fontSize) > maxW && cur) { lines.push(cur); cur = w; }
          else cur = test;
        }
        if (cur) lines.push(cur);
      }

      let page = pdfDoc.addPage([pw, ph]);
      let y = ph - margin;
      for (const line of lines) {
        if (y < margin) { page = pdfDoc.addPage([pw, ph]); y = ph - margin; }
        if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lh;
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resignation-letter-${letter?.company || 'untitled'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  }, [content, letter?.company]);

  const handleRegenerate = useCallback(async () => {
    if (!letter) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-resignation-letter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            recipientName: letter.recipient_name,
            company: letter.company,
            position: letter.position,
            lastWorkingDay: letter.last_working_day,
            noticePeriod: letter.notice_period,
            reason: letter.reason,
            tone: letter.tone,
            templateStyle: letter.template_style,
            additions: Array.isArray(letter.additions) ? letter.additions : [],
            userGeminiKey: getUserGeminiKey(),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to regenerate');
      const data = await response.json();
      setContent(data.letter);
      setHasUnsavedChanges(true);
      haptics.success();
      toast.success('Letter regenerated!');
    } catch {
      toast.error('Failed to regenerate letter');
    } finally {
      setRegenerating(false);
    }
  }, [letter]);

  const handleChecklistToggle = useCallback((itemId: string) => {
    setChecklistProgress(prev => {
      const next = prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId];
      if (id) {
        updateLetter.mutate({ id, checklist_progress: next } as any);
      }
      return next;
    });
  }, [id, updateLetter]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    haptics.warning();
    deleteLetter.mutate(id, {
      onSuccess: () => navigate('/resignation-letters', { replace: true }),
    });
  }, [id, deleteLetter, navigate]);

  // Auth guard handled by ProtectedRoute
  if (isLoading || authLoading) return <DetailSkeleton />;
  if (!letter) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Resignation letter not found</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
      <header className="sticky top-0 z-10 glass-header px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/resignation-letters')}
          className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{letter.title || `${letter.company} Resignation`}</h1>
          <div className="flex items-center gap-2">
            {letter.company && <span className="text-xs text-muted-foreground truncate">{letter.company}</span>}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">{letter.tone}</Badge>
            {hasUnsavedChanges && <span className="text-[10px] text-warning">Unsaved</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="touch-manipulation">
          {isEditing ? 'Preview' : 'Edit'}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-4 pb-32 space-y-6">
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

          {/* Resignation Checklist */}
          <ResignationChecklist
            completedItems={checklistProgress}
            onToggle={handleChecklistToggle}
          />
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
          <Button variant="outline" size="sm" className="gap-1 h-10" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-10 text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resignation Letter?</AlertDialogTitle>
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
