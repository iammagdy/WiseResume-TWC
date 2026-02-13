import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Copy, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useCoverLetters, useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { generateCoverLetter } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

type Tone = 'professional' | 'enthusiastic' | 'conversational';
type Tab = 'create' | 'saved';

export default function CoverLetterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: resumes, isLoading: resumesLoading } = useResumes();
  const { data: letters, isLoading: lettersLoading } = useCoverLetters();
  const { saveCoverLetter, deleteCoverLetter } = useCoverLetterMutations();

  const [tab, setTab] = useState<Tab>('create');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<string | null>(null);

  if (!user) { navigate('/auth'); return null; }

  const selectedResume = resumes?.find(r => r.id === selectedResumeId);

  const handleGenerate = async () => {
    if (!selectedResume || !jobDescription.trim()) {
      toast.error('Select a resume and enter a job description');
      return;
    }
    setGenerating(true);
    try {
      const resumeData = dbToResumeData(selectedResume);
      const letter = await generateCoverLetter(resumeData, jobDescription, tone);
      setResult(letter);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result.trim()) return;
    saveCoverLetter.mutate({
      job_title: jobTitle || 'Untitled',
      company: company || undefined,
      content: result,
      tone,
      resume_id: selectedResumeId || undefined,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    toast.success('Copied to clipboard');
  };

  const handleDownload = async () => {
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
      for (const paragraph of result.split('\n')) {
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
        if (line) {
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        }
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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

  const viewedLetter = letters?.find(l => l.id === viewingLetter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto overscroll-y-contain pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Cover Letters</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {(['create', 'saved'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setViewingLetter(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t === 'create' ? 'Create New' : 'Saved Letters'}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-4">
        {tab === 'create' ? (
          <>
            {/* Job Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title</label>
                <input className="w-full glass-input rounded-xl px-3 py-2 text-[16px]" placeholder="e.g. Product Manager" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <input className="w-full glass-input rounded-xl px-3 py-2 text-[16px]" placeholder="e.g. Google" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
            </div>

            {/* Resume Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Resume</label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
                <SelectContent>
                  {resumes?.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Description</label>
              <Textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={5} />
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tone</label>
              <div className="flex gap-2">
                {(['professional', 'enthusiastic', 'conversational'] as Tone[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                      tone === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <Button className="w-full gap-2" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Cover Letter'}
            </Button>

            {/* Result */}
            {result && (
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Generated Letter</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                </div>
                {isEditing ? (
                  <Textarea value={result} onChange={e => setResult(e.target.value)} rows={12} />
                ) : (
                  <div className="bg-background/50 rounded-xl p-4 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">{result}</div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={handleCopy}><Copy className="w-3 h-3" /> Copy</Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={handleDownload}><Download className="w-3 h-3" /> PDF</Button>
                  <Button size="sm" className="gap-1 ml-auto" onClick={handleSave} disabled={saveCoverLetter.isPending}>Save</Button>
                </div>
              </div>
            )}
          </>
        ) : viewedLetter && viewedLetter ? (
          /* Viewing a saved letter */
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingLetter(null)}>← Back to list</Button>
            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold">{viewedLetter.job_title}</h3>
              {viewedLetter.company && <p className="text-sm text-muted-foreground">{viewedLetter.company}</p>}
              <Badge variant="secondary" className="mt-2 capitalize">{viewedLetter.tone}</Badge>
            </div>
            <div className="bg-background/50 rounded-xl p-4 text-sm whitespace-pre-wrap">{viewedLetter.content}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard.writeText(viewedLetter.content); toast.success('Copied'); }}>
                <Copy className="w-3 h-3" /> Copy
              </Button>
              <Button size="sm" variant="destructive" className="gap-1 ml-auto" onClick={() => { deleteCoverLetter.mutate(viewedLetter.id); setViewingLetter(null); }}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>
        ) : (
          /* Saved Letters List */
          <div className="space-y-2">
            {lettersLoading ? <PageLoadingSpinner /> : letters && letters.length > 0 ? (
              letters.map(l => (
                <button
                  key={l.id}
                  onClick={() => setViewingLetter(l.id)}
                  className="glass-card rounded-xl p-4 w-full text-left flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.job_title}</p>
                    <p className="text-xs text-muted-foreground">{l.company || 'No company'} · {l.created_at ? format(new Date(l.created_at), 'MMM d') : ''}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">{l.tone}</Badge>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">No saved cover letters</p>
                <p className="text-sm mt-1">Create one in the "Create New" tab</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
