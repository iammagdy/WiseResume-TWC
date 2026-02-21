import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Copy, Download, Save, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { generateCoverLetter } from '@/lib/aiTailor';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

type Tone = 'professional' | 'enthusiastic' | 'conversational';

export default function CoverLetterNewPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: resumes } = useResumes();
  const { saveCoverLetter } = useCoverLetterMutations();

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Auth guard handled by ProtectedRoute

  const selectedResume = resumes?.find((r) => r.id === selectedResumeId);

  const handleGenerate = async () => {
    if (!selectedResume || !jobDescription.trim()) {
      toast.error('Select a resume and enter a job description');
      return;
    }
    setGenerating(true);
    haptics.light();
    try {
      const resumeData = dbToResumeData(selectedResume);
      const letter = await generateCoverLetter(resumeData, jobDescription, tone);
      setResult(letter);
      setIsEditing(false);
      haptics.success();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result.trim()) return;
    haptics.light();
    saveCoverLetter.mutate(
      {
        job_title: jobTitle || 'Untitled',
        company: company || undefined,
        content: result,
        tone,
        resume_id: selectedResumeId || undefined,
        title: jobTitle ? `${jobTitle}${company ? ` - ${company}` : ''}` : undefined,
      },
      {
        onSuccess: (data) => {
          navigate(`/cover-letter/edit/${data.id}`, { replace: true });
        },
      }
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    haptics.light();
    toast.success('Copied to clipboard');
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
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
      for (const para of result.split('\n')) {
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
      a.download = `cover-letter-${jobTitle || 'untitled'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const toneOptions: { value: Tone; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'conversational', label: 'Conversational' },
  ];

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
          <h1 className="text-lg font-bold flex-1">New Cover Letter</h1>
        </div>
        <Breadcrumb items={['AI Tools', 'Cover Letters', 'New']} className="pl-10" />
      </header>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-4 pb-32 space-y-5">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title *</label>
              <Input placeholder="e.g. Product Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
              <Input placeholder="e.g. Google" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>

          {/* Resume Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Resume *</label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger><SelectValue placeholder="Choose a resume" /></SelectTrigger>
              <SelectContent>
                {resumes?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Description *</label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={6}
            />
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tone</label>
            <div className="flex gap-2">
              {toneOptions.map((t) => (
                <motion.button
                  key={t.value}
                  whileTap={{ scale: 0.93 }}
                  style={{ touchAction: 'pan-y' }}
                  onClick={() => { haptics.selection(); setTone(t.value); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95',
                    tone === t.value
                      ? 'gradient-primary text-primary-foreground'
                      : 'glass-surface text-muted-foreground'
                  )}
                >
                  {t.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            className="w-full gap-2 h-12 rounded-xl text-base"
            onClick={handleGenerate}
            disabled={generating || !selectedResumeId || !jobDescription.trim()}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-elevated rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Generated Letter</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? 'Preview' : 'Edit'}
                </Button>
              </div>
              {isEditing ? (
                <Textarea value={result} onChange={(e) => setResult(e.target.value)} rows={14} />
              ) : (
                <div className="bg-background/50 rounded-xl p-4 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                  {result}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Toolbar */}
      {result && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-safe">
          <div className="glass-header rounded-2xl p-3 flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleCopy}>
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={generating}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" className="gap-1.5 flex-1" onClick={handleSave} disabled={saveCoverLetter.isPending}>
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
