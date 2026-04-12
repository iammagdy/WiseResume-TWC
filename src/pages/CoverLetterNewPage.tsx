import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Download, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useCoverLetterMutations } from '@/hooks/useCoverLetters';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeWall } from '@/components/plan/UpgradeWall';
import { generateCoverLetter } from '@/lib/aiTailor';
import type { TemplateStyle } from '@/lib/coverLetterPdfGenerator';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

type Tone = 'professional' | 'enthusiastic' | 'conversational';

export default function CoverLetterNewPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro, isLoading: planLoading } = usePlan();
  const { data: resumes } = useResumes();
  const { saveCoverLetter } = useCoverLetterMutations();

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('professional');
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showMissingWarning, setShowMissingWarning] = useState(false);

  // Auth guard handled by ProtectedRoute

  const selectedResume = resumes?.find((r) => r.id === selectedResumeId);

  // Feature gate: Cover Letters is Pro+
  if (!planLoading && !isPro) {
    return (
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-bold flex-1">New Cover Letter</h1>
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

  const handleGenerate = async (force = false) => {
    if (!selectedResume || !jobDescription.trim()) {
      toast.error('Select a resume and enter a job description');
      return;
    }
    if (!force) {
      const resumeData = dbToResumeData(selectedResume);
      const contactInfo = resumeData.contactInfo;
      const missing: string[] = [];
      if (!contactInfo?.fullName?.trim()) missing.push('name');
      if (!contactInfo?.email?.trim()) missing.push('email');
      if (!contactInfo?.phone?.trim()) missing.push('phone');
      if (missing.length > 0) {
        setMissingFields(missing);
        setShowMissingWarning(true);
        return;
      }
    }
    setShowMissingWarning(false);
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
        template_style: templateStyle,
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
      const { downloadCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
      await downloadCoverLetterPDF({
        job_title: jobTitle || 'Untitled',
        company: company || null,
        content: result,
        title: jobTitle ? `${jobTitle}${company ? ` - ${company}` : ''}` : null,
        tone,
        template_style: templateStyle,
      });
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

  const templateOptions: { value: TemplateStyle; label: string; description: string }[] = [
    { value: 'professional', label: 'Professional', description: 'Blue accent bar, classic layout' },
    { value: 'modern', label: 'Modern', description: 'Teal sidebar, two-column header' },
    { value: 'minimal', label: 'Minimal', description: 'Clean whitespace, no decorations' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-1">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-bold flex-1">New Cover Letter</h1>
        </div>
        <Breadcrumb items={['AI Tools', 'Cover Letters', 'New']} className="pl-10" />
      </header>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-4 pb-32 space-y-5">
          {/* Job Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      : 'bg-card border border-border text-muted-foreground'
                  )}
                >
                  {t.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Template Style */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Style</label>
            <div className="flex gap-2">
              {templateOptions.map((t) => (
                <motion.button
                  key={t.value}
                  whileTap={{ scale: 0.93 }}
                  style={{ touchAction: 'pan-y' }}
                  onClick={() => { haptics.selection(); setTemplateStyle(t.value); }}
                  className={cn(
                    'flex-1 py-2.5 px-2 rounded-xl text-sm font-medium transition-colors active:scale-95 flex flex-col items-center gap-0.5',
                    templateStyle === t.value
                      ? 'gradient-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground'
                  )}
                >
                  <span>{t.label}</span>
                  <span className={cn('text-[10px] leading-tight', templateStyle === t.value ? 'text-primary-foreground/75' : 'text-muted-foreground/70')}>
                    {t.description}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {showMissingWarning && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-0.5">Missing contact info:</p>
                  <p>Your resume is missing <strong>{missingFields.join(', ')}</strong>. These will appear as placeholders in the letter.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowMissingWarning(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={() => handleGenerate(true)}>
                  Generate Anyway
                </Button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full gap-2 h-12 rounded-xl text-base"
            onClick={() => handleGenerate()}
            disabled={generating || !selectedResumeId || !jobDescription.trim()}
          >
            {generating ? <MiniSpinner size={20} /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border shadow-soft rounded-2xl p-4 space-y-3"
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
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 left-0 right-0 z-40 px-4 lg:px-6 lg:pb-4">
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-3 flex gap-2 shadow-lg">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleCopy}>
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleGenerate()} disabled={generating}>
              {generating ? <MiniSpinner size={16} /> : <RotateCcw className="w-4 h-4" />}
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
