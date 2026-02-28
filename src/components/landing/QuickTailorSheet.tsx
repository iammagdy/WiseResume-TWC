import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Wand2, ArrowLeft, Save, FileDown, Mail, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useResumeMutations } from '@/hooks/useResumes';
import { useAIAction } from '@/hooks/useAIAction';
import { JobUrlParser } from '@/components/editor/tailor/JobUrlParser';
import { TailorProgressComponent } from '@/components/editor/tailor/TailorProgress';
import { tailorResumeWithProgress, TailorIntensity } from '@/lib/aiTailor';
import { parseResumePDF, parseTextWithAI, regenerateResumeIds, getExtractionSummary } from '@/lib/pdfParser';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import triggerHaptic from '@/lib/haptics';
import type { ResumeData, TailorProgress as TailorProgressType, EnhancedTailorProgress, SuperTailorResult } from '@/types/resume';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickTailorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select-resume' | 'job-input' | 'processing' | 'results';

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i === current ? 'w-6 bg-primary' : i < current ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted-foreground/20'
          )}
        />
      ))}
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function QuickTailorSheet({ open, onOpenChange }: QuickTailorSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: resumes, isLoading: resumesLoading } = useResumes();
  const { createResume } = useResumeMutations();
  const { execute } = useAIAction({ operation: 'tailor' });

  const [step, setStep] = useState<Step>('select-resume');
  const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobMeta, setJobMeta] = useState<{ title: string; company: string } | null>(null);
  const [tailorProgress, setTailorProgress] = useState<TailorProgressType | EnhancedTailorProgress | null>(null);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select-resume');
        setSelectedResume(null);
        setJobDescription('');
        setJobMeta(null);
        setTailorProgress(null);
        setTailorResult(null);
        setIsUploading(false);
        setSavedResumeId(null);
      }, 300);
    }
  }, [open]);

  const stepIndex = { 'select-resume': 0, 'job-input': 1, 'processing': 2, 'results': 3 }[step];

  // === Step 1: Select existing resume ===
  const handleSelectExisting = useCallback((dbResume: DatabaseResume) => {
    triggerHaptic.light();
    setSelectedResume(dbToResumeData(dbResume));
    setStep('job-input');
  }, []);

  // === Step 1: Upload CV ===
  const handleUploadClick = useCallback(() => {
    triggerHaptic.light();
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const mime = file.type.toLowerCase();
      const ext = file.name.split('.').pop()?.toLowerCase();

      let resumeData: ResumeData;

      if (mime === 'application/pdf' || ext === 'pdf') {
        const result = await parseResumePDF(file);
        if (!result.success || !result.data) {
          throw new Error(result.needsOCR ? 'This PDF needs OCR. Please use the full Upload page.' : 'Failed to parse PDF');
        }
        resumeData = result.data;
      } else if (
        mime === 'application/msword' ||
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'doc' || ext === 'docx'
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        let text = '';
        try {
          const htmlResult = await mammoth.default.convertToHtml({ arrayBuffer });
          text = htmlResult.value
            .replace(/<li[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '\"').replace(/&#39;/g, "'")
            .trim();
        } catch {
          const rawResult = await mammoth.default.extractRawText({ arrayBuffer });
          text = rawResult.value;
        }
        if (!text.trim()) throw new Error('No text found in document');
        resumeData = await parseTextWithAI(text);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or Word document.');
      }

      const withIds = regenerateResumeIds(resumeData);
      setSelectedResume(withIds);
      setStep('job-input');
      toast.success('Resume parsed successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err?.message || 'Failed to parse resume');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // === Step 2: Start tailoring ===
  const handleTailor = useCallback(async () => {
    if (!selectedResume || !jobDescription.trim()) return;
    triggerHaptic.medium();
    setStep('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    const result = await execute(async () => {
      return await tailorResumeWithProgress(
        selectedResume,
        jobDescription,
        (p) => setTailorProgress(p),
        'moderate' as TailorIntensity,
        controller.signal
      );
    });

    if (result) {
      setTailorResult(result);
      setStep('results');
      triggerHaptic.success();
    } else {
      // credits issue or cancelled
      setStep('job-input');
    }
  }, [selectedResume, jobDescription, execute]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStep('job-input');
  }, []);

  // === Step 4: Save tailored resume ===
  const handleSave = useCallback(async () => {
    if (!selectedResume || !tailorResult || !user) return;
    triggerHaptic.medium();

    try {
      const tailored: ResumeData = {
        ...selectedResume,
        summary: tailorResult.summary || selectedResume.summary,
        skills: tailorResult.skills || selectedResume.skills,
        experience: tailorResult.experience || selectedResume.experience,
        education: tailorResult.education || selectedResume.education,
        projects: tailorResult.projects || selectedResume.projects,
        certifications: tailorResult.certifications || selectedResume.certifications,
        awards: tailorResult.awards || selectedResume.awards,
      };

      const title = jobMeta
        ? `${jobMeta.title} @ ${jobMeta.company}`
        : tailorResult.jobParsed?.title
          ? `${tailorResult.jobParsed.title} @ ${tailorResult.jobParsed.company}`
          : 'Tailored Resume';

      const newResume = await createResume.mutateAsync({ resume: tailored, title });
      setSavedResumeId(newResume.id);
      toast.success('Tailored resume saved!');
    } catch (err) {
      toast.error('Failed to save resume');
    }
  }, [selectedResume, tailorResult, user, jobMeta, createResume]);

  const handleGoToEditor = useCallback(() => {
    if (savedResumeId) {
      onOpenChange(false);
      navigate(`/editor?id=${savedResumeId}`);
    }
  }, [savedResumeId, navigate, onOpenChange]);

  const goBack = useCallback(() => {
    triggerHaptic.light();
    if (step === 'job-input') setStep('select-resume');
    else if (step === 'results') setStep('job-input');
  }, [step]);

  const overallScore = tailorResult?.overallScore;
  const keyChanges = tailorResult?.keyChanges?.slice(0, 5) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0" hideCloseButton={step === 'processing'}>
        <SheetTitle className="sr-only">Quick Tailor</SheetTitle>

        {/* Header with step dots + back button */}
        <div className="flex items-center px-4 pt-4 pb-0">
          {step !== 'select-resume' && step !== 'processing' && (
            <Button variant="ghost" size="icon" onClick={goBack} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <StepDots current={stepIndex} total={4} />
          </div>
          {step !== 'select-resume' && step !== 'processing' && <div className="w-11" />}
        </div>

        <ScrollArea className="flex-1 px-4 pb-6">
          <AnimatePresence mode="wait">
            {/* ========== STEP 1: Select Resume ========== */}
            {step === 'select-resume' && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 pt-2"
              >
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground">Choose Your Resume</h2>
                  <p className="text-sm text-muted-foreground">Upload a new CV or select one from your account</p>
                </div>

                {/* Upload Card */}
                <button
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="w-full p-5 rounded-2xl glass-elevated text-left flex items-center gap-4 touch-manipulation transition-all border-glow hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]">
                    {isUploading ? <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" /> : <Upload className="w-7 h-7 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-0.5">{isUploading ? 'Parsing...' : 'Upload Your CV'}</h3>
                    <p className="text-sm text-muted-foreground">PDF or Word document</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                {/* Existing Resumes */}
                {user && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">My Resumes</p>
                    {resumesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                      </div>
                    ) : resumes && resumes.length > 0 ? (
                      <div className="space-y-2">
                        {resumes.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleSelectExisting(r)}
                            className="w-full p-4 rounded-xl glass-elevated text-left flex items-center gap-3 touch-manipulation transition-all hover:scale-[1.01] active:scale-[0.98] border border-border/20"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{r.title}</h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {r.contact_info?.fullName || 'No name'} · {r.experience?.length || 0} exp
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No resumes yet. Upload one above!</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========== STEP 2: Job Input ========== */}
            {step === 'job-input' && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 pt-2"
              >
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground">Paste the Job</h2>
                  <p className="text-sm text-muted-foreground">Add a job URL or paste the description</p>
                </div>

                {/* Selected resume chip */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {selectedResume?.contactInfo?.fullName || 'Your Resume'}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 ml-auto" />
                </div>

                <JobUrlParser
                  value={jobDescription}
                  onChange={setJobDescription}
                  onParsed={(data) => setJobMeta({ title: data.title, company: data.company })}
                />

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold gap-2"
                  disabled={!jobDescription.trim()}
                  onClick={handleTailor}
                >
                  <Wand2 className="w-5 h-5" />
                  Tailor Now
                </Button>
              </motion.div>
            )}

            {/* ========== STEP 3: Processing ========== */}
            {step === 'processing' && tailorProgress && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="pt-4"
              >
                <TailorProgressComponent
                  progress={tailorProgress}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}

            {/* ========== STEP 4: Results ========== */}
            {step === 'results' && tailorResult && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 pt-2"
              >
                {/* Score */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - (overallScore?.after || 0) / 100)}
                        className="transition-all duration-700"
                        style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn('text-3xl font-bold tabular-nums', getScoreColor(overallScore?.after || 0))}>
                        {overallScore?.after || '—'}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">Match Score</span>
                    </div>
                  </div>
                  {overallScore && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="text-foreground font-medium">{overallScore.before}%</span>
                      {' → '}
                      <span className={cn('font-bold', getScoreColor(overallScore.after))}>{overallScore.after}%</span>
                      <span className="text-success text-xs ml-1">(+{overallScore.after - overallScore.before}%)</span>
                    </p>
                  )}
                  {tailorResult.jobParsed && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {tailorResult.jobParsed.title} @ {tailorResult.jobParsed.company}
                    </p>
                  )}
                </div>

                {/* Key Changes */}
                {keyChanges.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Key Changes</h3>
                    {keyChanges.map((change, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2.5 pt-2">
                  {!savedResumeId ? (
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-semibold gap-2"
                      onClick={handleSave}
                      disabled={createResume.isPending}
                    >
                      {createResume.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Tailored Resume
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-semibold gap-2"
                      onClick={handleGoToEditor}
                    >
                      <FileText className="w-5 h-5" />
                      Open in Editor
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => {
                      triggerHaptic.light();
                      // Save first if not saved, then navigate to editor where cover letter can be generated
                      if (!savedResumeId) {
                        handleSave().then(() => {
                          toast.info('Save your resume first, then generate a cover letter from the editor.');
                        });
                      } else {
                        navigate(`/editor?id=${savedResumeId}&openCoverLetter=1`);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <Mail className="w-4 h-4" />
                    Generate Cover Letter
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
