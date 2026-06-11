import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Download, Save, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeWall } from '@/components/plan/UpgradeWall';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TemplateStyle } from '@/lib/coverLetterPdfGenerator';
import { COVER_LETTER_TEMPLATE_OPTIONS } from '@/components/cover-letter/templates/registry';
import { CoverLetterPreview } from '@/components/cover-letter/CoverLetterPreview';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import {
  fetchTailorJobContextByResumeId,
  pickLongestJobDescription,
  readCoverLetterPrefill,
  clearCoverLetterPrefill,
  readTailorJobDescriptionForResume,
  saveLinkedCoverLetterForTailoredResume,
} from '@/lib/tailorJobContext';
import {
  useResumes,
  useResume,
  dbToResumeData,
  getResumeDocumentId,
  type DatabaseResume,
} from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';

import { cn } from '@/lib/utils';

type Tone = 'professional' | 'enthusiastic' | 'conversational';

interface CoverLetterNewLocationState {
  resumeId?: string;
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  fromTailorResult?: boolean;
  returnTo?: string;
}

export default function CoverLetterNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefill = (location.state ?? {}) as CoverLetterNewLocationState;
  const resumeIdFromUrl = searchParams.get('resumeId') ?? prefill.resumeId ?? '';
  const fromTailorResult =
    prefill.fromTailorResult === true || searchParams.get('source') === 'tailor-result';
  const returnTo =
    prefill.returnTo
    ?? (fromTailorResult && resumeIdFromUrl
      ? `/tailoring-hub/result/${resumeIdFromUrl}`
      : undefined);

  const { isPro, isLoading: planLoading } = usePlan();
  const { data: resumes } = useResumes();
  const { data: linkedResumeDoc, isLoading: linkedResumeLoading } = useResume(
    resumeIdFromUrl || null,
  );
  const currentResume = useResumeStore((s) => s.currentResume);
  const queryClient = useQueryClient();
  const [savedId, setSavedId] = useState<string | null>(null);

  const [selectedResumeId, setSelectedResumeId] = useState(resumeIdFromUrl);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('professional');
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showMissingWarning, setShowMissingWarning] = useState(false);

  const { data: tailorContext } = useQuery({
    queryKey: ['tailor-job-context', resumeIdFromUrl],
    queryFn: () => fetchTailorJobContextByResumeId(resumeIdFromUrl),
    enabled: !!resumeIdFromUrl,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (resumeIdFromUrl) {
      setSelectedResumeId(resumeIdFromUrl);
    }
  }, [resumeIdFromUrl]);

  useEffect(() => {
    const stored = readCoverLetterPrefill();
    const sessionJobDescription = resumeIdFromUrl
      ? readTailorJobDescriptionForResume(resumeIdFromUrl)
      : null;

    setJobTitle((prev) => prev.trim() || prefill.jobTitle?.trim() || stored?.jobTitle?.trim() || '');
    setCompany((prev) => prev.trim() || prefill.company?.trim() || stored?.company?.trim() || '');
    setJobDescription((prev) => pickLongestJobDescription(
      prev,
      prefill.jobDescription,
      stored?.jobDescription,
      sessionJobDescription,
    ));

    if (stored) clearCoverLetterPrefill();
  }, [prefill, resumeIdFromUrl]);

  useEffect(() => {
    if (!tailorContext) return;
    setJobTitle((prev) => prev.trim() || tailorContext.jobTitle);
    setCompany((prev) => prev.trim() || tailorContext.company);
    setJobDescription((prev) => pickLongestJobDescription(prev, tailorContext.jobDescription));
  }, [tailorContext]);

  const resumeFromList = useMemo(
    () => resumes?.find((r) => getResumeDocumentId(r) === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );

  const selectedResume = useMemo((): DatabaseResume | null => {
    if (resumeFromList) return resumeFromList as DatabaseResume;
    if (linkedResumeDoc) return linkedResumeDoc as DatabaseResume;
    if (currentResume?.id === selectedResumeId) {
      return {
        $id: selectedResumeId,
        title: currentResume.title || 'Tailored CV',
        template: currentResume.templateId,
        summary: currentResume.summary,
        contact_info: JSON.stringify(currentResume.contactInfo),
        experience: JSON.stringify(currentResume.experience),
        education: JSON.stringify(currentResume.education),
        skills: JSON.stringify(currentResume.skills),
        certifications: JSON.stringify(currentResume.certifications ?? []),
        awards: JSON.stringify(currentResume.awards ?? []),
        projects: JSON.stringify(currentResume.projects ?? []),
        publications: JSON.stringify(currentResume.publications ?? []),
        volunteering: JSON.stringify(currentResume.volunteering ?? []),
        hobbies: JSON.stringify(currentResume.hobbies ?? []),
        references: JSON.stringify(currentResume.references ?? []),
        languages: JSON.stringify(currentResume.languages ?? []),
        customization: JSON.stringify(currentResume.customization),
        user_id: '',
        $createdAt: '',
        $updatedAt: '',
      };
    }
    return null;
  }, [currentResume, linkedResumeDoc, resumeFromList, selectedResumeId]);

  const linkedResumeTitle = selectedResume?.title ?? 'Tailored CV';
  const resumeReady = !!selectedResume;
  const resumeLoading = fromTailorResult && !!resumeIdFromUrl && !resumeReady
    && (linkedResumeLoading || !resumes);

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
            features={[
              'AI-generated cover letters in seconds',
              'Tailored to any job description & your resume',
              'Unlimited cover letter saves & exports',
              'ATS-friendly formatting built in',
            ]}
          />
        </div>
      </div>
    );
  }

  const handleGenerate = async (force = false) => {
    if (!selectedResume || !jobDescription.trim()) {
      if (!selectedResume && fromTailorResult) {
        toast.error('Your tailored CV is still loading. Please wait a moment and try again.');
        return;
      }
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
      const { data, error } = await appwriteFunctions.invoke('generate-cover-letter', {
        body: {
          resume: resumeData,
          jobDescription,
          tone,
          jobTitle: jobTitle || undefined,
          company: company || undefined,
          templateStyle,
          resumeId: selectedResumeId || undefined,
          title: jobTitle ? `${jobTitle}${company ? ` - ${company}` : ''}` : undefined,
        },
      });
      if (error) throw new Error(error.message || 'Failed to generate cover letter');
      if (data?.error) throw new Error(data.message || data.error);
      const letter: string = data.coverLetter || data.content;
      const coverLetterId: string | undefined = data.id;
      setResult(letter);
      setSavedId(coverLetterId || null);
      if (coverLetterId) queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      invalidateAiCreditQueries(queryClient);
      setIsEditing(false);
      haptics.success();

      if (returnTo && coverLetterId && selectedResumeId) {
        saveLinkedCoverLetterForTailoredResume(selectedResumeId, coverLetterId);
        toast.success('Cover letter ready — returning to your application bundle');
        navigate(returnTo, {
          replace: true,
          state: {
            coverLetterId,
            jobTitle,
            company,
          },
        });
        return;
      }

      toast.success('Cover letter generated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result.trim() || !savedId) return;
    haptics.light();
    navigate(`/cover-letter/edit/${savedId}`, { replace: true });
    toast.success('Cover letter saved!');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    haptics.light();
    toast.success('Copied to clipboard');
  };

  const handleDownloadPDF = async () => {
    if (!result || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
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
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const toneOptions: { value: Tone; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'conversational', label: 'Conversational' },
  ];

  const templateOptions = COVER_LETTER_TEMPLATE_OPTIONS;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-1">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-bold flex-1">
            {fromTailorResult ? 'Cover letter for this application' : 'New Cover Letter'}
          </h1>
        </div>
        <Breadcrumb
          items={fromTailorResult
            ? ['Tailoring Hub', 'Application bundle', 'Cover letter']
            : ['AI Tools', 'Cover Letters', 'New']}
          className="pl-10"
        />
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-4 pb-32 space-y-5">
          {fromTailorResult && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
              Creating a cover letter for the same job as your tailored CV. Resume and job details are pre-filled.
            </div>
          )}

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

          {fromTailorResult ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tailored CV</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <FileText className="w-4 h-4 text-primary shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{linkedResumeTitle}</p>
                  <p className="text-xs text-muted-foreground">Linked from your tailoring session</p>
                </div>
                {resumeLoading && <MiniSpinner size={16} />}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Resume *</label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger><SelectValue placeholder="Choose a resume" /></SelectTrigger>
                <SelectContent>
                  {resumes?.map((r) => {
                    const id = getResumeDocumentId(r);
                    if (!id) return null;
                    return (
                      <SelectItem key={id} value={id}>{r.title}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Description *</label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={fromTailorResult ? 12 : 8}
              className="min-h-[10rem]"
            />
            {jobDescription.trim().length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {jobDescription.trim().length.toLocaleString()} characters
              </p>
            )}
          </div>

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

          <div>
            <label id="cover-letter-style-label" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Style
            </label>
            <div role="radiogroup" aria-labelledby="cover-letter-style-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {templateOptions.map((t) => {
                const selected = templateStyle === t.value;
                return (
                  <motion.button
                    key={t.value}
                    whileTap={{ scale: 0.93 }}
                    style={{ touchAction: 'pan-y' }}
                    onClick={() => {
                      if (templateStyle === t.value) return;
                      haptics.selection();
                      setTemplateStyle(t.value as TemplateStyle);
                    }}
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${t.label} cover letter template — ${t.description}`}
                    className={cn(
                      'py-2.5 px-2 rounded-xl text-sm font-medium transition-colors active:scale-95 flex flex-col items-center gap-0.5 min-h-[44px]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      selected
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground'
                    )}
                  >
                    <span>{t.label}</span>
                    <span className={cn('text-[10px] leading-tight', selected ? 'text-primary-foreground/75' : 'text-muted-foreground/70')}>
                      {t.description}
                    </span>
                  </motion.button>
                );
              })}
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

          <Button
            className="w-full gap-2 h-12 rounded-xl text-base"
            onClick={() => handleGenerate()}
            disabled={generating || resumeLoading || !resumeReady || !jobDescription.trim()}
          >
            {generating ? <MiniSpinner size={20} /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Generating...' : fromTailorResult ? 'Generate & return to bundle' : 'Generate with AI'}
          </Button>

          {result && !returnTo && (
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
                <div className="max-h-[480px] overflow-y-auto -mx-1 px-1">
                  <CoverLetterPreview
                    templateStyle={templateStyle}
                    title={jobTitle || 'Cover Letter'}
                    company={company || null}
                    content={result}
                  />
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {result && !returnTo && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 left-0 right-0 z-40 px-4 lg:px-6 lg:pb-4">
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-3 flex gap-2 shadow-lg">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleCopy}>
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleDownloadPDF} disabled={isDownloadingPdf}>
              {isDownloadingPdf ? <MiniSpinner size={16} /> : <Download className="w-4 h-4" />} PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleGenerate()} disabled={generating}>
              {generating ? <MiniSpinner size={16} /> : <RotateCcw className="w-4 h-4" />}
            </Button>
            <Button size="sm" className="gap-1.5 flex-1" onClick={handleSave} disabled={!savedId}>
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
