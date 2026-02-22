import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Briefcase, Building2, MapPin, FileText, Bookmark, ChevronRight, Check } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JobUrlParser } from '@/components/editor/tailor/JobUrlParser';
import { parseJobUrl } from '@/lib/aiTailor';
import { useJobMutations } from '@/hooks/useJobs';
import { useResumes, DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Phase = 'input' | 'analyzing' | 'results';

interface ParsedJob {
  title: string;
  company: string;
  description: string;
  url?: string;
}

interface AnalyzeJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyzeJobSheet({ open, onOpenChange }: AnalyzeJobSheetProps) {
  const navigate = useNavigate();
  const { createJob } = useJobMutations();
  const { data: resumes } = useResumes();
  const { setCurrentResumeId } = useResumeStore();

  const [phase, setPhase] = useState<Phase>('input');
  const [jobDescription, setJobDescription] = useState('');
  const [parsedJob, setParsedJob] = useState<ParsedJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [showResumePicker, setShowResumePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setPhase('input');
    setJobDescription('');
    setParsedJob(null);
    setProgress(0);
    setSelectedResumeId(null);
    setShowResumePicker(false);
    setSaving(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleParsed = (data: { title: string; company: string; url?: string }) => {
    setParsedJob({ ...data, description: jobDescription });
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job URL or description first');
      return;
    }
    haptics.light();
    setPhase('analyzing');
    setProgress(0);

    // If we already have parsed info from JobUrlParser, skip to results
    if (parsedJob?.title && parsedJob?.company) {
      // Simulate brief progress for UX
      const steps = [20, 45, 70, 90, 100];
      for (const step of steps) {
        await new Promise(r => setTimeout(r, 300));
        setProgress(step);
      }
      setParsedJob(prev => prev ? { ...prev, description: jobDescription } : null);
      setPhase('results');
      haptics.success();
      return;
    }

    // For manual text input, extract title/company with simple heuristics
    const lines = jobDescription.trim().split('\n').filter(l => l.trim());
    const title = lines[0]?.substring(0, 100) || 'Untitled Position';
    const companyLine = lines.find(l => /company|employer|at\s/i.test(l));
    const company = companyLine?.replace(/.*(?:company|employer|at)\s*:?\s*/i, '').trim() || 'Unknown Company';

    const steps = [15, 35, 55, 75, 95, 100];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400));
      setProgress(step);
    }

    setParsedJob({
      title,
      company,
      description: jobDescription,
    });
    setPhase('results');
    haptics.success();
  };

  const handleTailor = () => {
    if (!selectedResumeId || !parsedJob) return;
    haptics.medium();
    setCurrentResumeId(selectedResumeId);
    handleOpenChange(false);
    navigate(`/editor?tailor=true&jobTitle=${encodeURIComponent(parsedJob.title)}&jobCompany=${encodeURIComponent(parsedJob.company)}`);
  };

  const handleSaveJob = async () => {
    if (!parsedJob) return;
    haptics.light();
    setSaving(true);
    try {
      await createJob.mutateAsync({
        title: parsedJob.title,
        company: parsedJob.company,
        description: parsedJob.description,
        source_url: parsedJob.url,
        is_saved: true,
      });
      handleOpenChange(false);
    } catch {
      // error toast handled by mutation
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Analyze Job
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-80px)] pr-1">
          <div className="space-y-6 pb-8">
            <AnimatePresence mode="wait">
              {/* INPUT PHASE */}
              {phase === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <JobUrlParser
                    value={jobDescription}
                    onChange={setJobDescription}
                    onParsed={handleParsed}
                  />

                  <Button
                    onClick={handleAnalyze}
                    disabled={!jobDescription.trim()}
                    className="w-full min-h-[48px] text-base font-semibold active:scale-95 transition-transform"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Analyze Job
                  </Button>
                </motion.div>
              )}

              {/* ANALYZING PHASE */}
              {phase === 'analyzing' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  <div className="relative w-16 h-16">
                    <MiniSpinner size={64} />
                    <Briefcase className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="font-semibold text-lg">Analyzing job posting...</p>
                    <p className="text-sm text-muted-foreground">
                      Extracting requirements and key details
                    </p>
                  </div>

                  <div className="w-full max-w-xs">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-2">{progress}%</p>
                  </div>
                </motion.div>
              )}

              {/* RESULTS PHASE */}
              {phase === 'results' && parsedJob && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Job Info Card */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base truncate">{parsedJob.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{parsedJob.company}</span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
                    </div>

                    {parsedJob.description && (
                      <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                        {parsedJob.description.substring(0, 300)}
                        {parsedJob.description.length > 300 && '...'}
                      </p>
                    )}
                  </div>

                  {/* Resume Picker for Tailoring */}
                  {!showResumePicker ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          haptics.light();
                          setShowResumePicker(true);
                        }}
                        className="w-full min-h-[48px] text-base font-semibold active:scale-95 transition-transform"
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Tailor a Resume
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleSaveJob}
                        disabled={saving}
                        className="w-full min-h-[48px] text-base font-semibold active:scale-95 transition-transform"
                      >
                        {saving ? (
                          <MiniSpinner size={20} className="mr-2" />
                        ) : (
                          <Bookmark className="w-5 h-5 mr-2" />
                        )}
                        Save Job for Later
                      </Button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Select a resume to tailor
                      </h4>

                      {resumes && resumes.length > 0 ? (
                        <div className="space-y-2">
                          {resumes.map((resume: DatabaseResume) => (
                            <button
                              key={resume.id}
                              onClick={() => {
                                haptics.light();
                                setSelectedResumeId(resume.id);
                              }}
                              className={cn(
                                'w-full text-left p-3 rounded-lg border transition-all active:scale-[0.98]',
                                'min-h-[48px] flex items-center gap-3',
                                selectedResumeId === resume.id
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                  : 'border-border bg-card hover:border-primary/30'
                              )}
                            >
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{resume.title}</p>
                                {resume.target_job_title && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {resume.target_job_title}
                                    {resume.target_company ? ` @ ${resume.target_company}` : ''}
                                  </p>
                                )}
                              </div>
                              {selectedResumeId === resume.id && (
                                <Check className="w-4 h-4 text-primary shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No resumes yet. Create one first!
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResumePicker(false);
                            setSelectedResumeId(null);
                          }}
                          className="flex-1 min-h-[48px] active:scale-95 transition-transform"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleTailor}
                          disabled={!selectedResumeId}
                          className="flex-1 min-h-[48px] font-semibold active:scale-95 transition-transform"
                        >
                          Tailor Resume
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
