import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, CheckCircle2, AlertCircle, Clipboard, Sparkles, Building2, MapPin, Globe, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useImportJob, type ImportJobResult } from '@/hooks/useImportJob';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { logWorkspaceActivity } from '@/store/workspaceActivityStore';

const CLIPBOARD_KEY = 'wr-clipboard-job-detect';

const SUPPORTED_SITES = [
  { label: 'LinkedIn', match: 'linkedin.com' },
  { label: 'Indeed', match: 'indeed.com' },
  { label: 'Glassdoor', match: 'glassdoor.com' },
  { label: 'Bayt', match: 'bayt.com' },
  { label: 'Wuzzuf', match: 'wuzzuf.net' },
  { label: 'Careers pages', match: 'careers.' },
] as const;

const LOADING_STEPS = [
  'Fetching the job posting',
  'Reading requirements & skills',
  'Structuring details with AI',
  'Saving to your workspace',
] as const;

const BLOCKED_HOSTS = /^localhost$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./i;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function validateJobUrl(raw: string): { valid: boolean; normalized: string; error?: string; hint?: string } {
  const normalized = normalizeUrl(raw);
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Paste a job posting link to continue.' };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalized, error: 'Only http and https links are supported.' };
    }
    if (BLOCKED_HOSTS.test(parsed.hostname)) {
      return { valid: false, normalized, error: 'That URL cannot be imported for security reasons.' };
    }
  } catch {
    return { valid: false, normalized, error: "That doesn't look like a valid URL." };
  }

  const known = SUPPORTED_SITES.some((s) => normalized.includes(s.match));
  const careerLike = /\/jobs?\/|\/careers?\/|job-|vacancy|posting/i.test(normalized);

  return {
    valid: true,
    normalized,
    hint: known
      ? 'Supported job board detected.'
      : careerLike
        ? "Careers-style URL — we'll parse what we can."
        : "We'll try to extract job details from this page.",
  };
}


interface ImportJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportJobSheet({ open, onOpenChange }: ImportJobSheetProps) {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [importedJob, setImportedJob] = useState<ImportJobResult | null>(null);
  const [clipboardEnabled, setClipboardEnabled] = useState(
    () => localStorage.getItem(CLIPBOARD_KEY) === 'true',
  );
  const [clipboardDetected, setClipboardDetected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const importJob = useImportJob();

  const validation = useMemo(() => validateJobUrl(url), [url]);

  const applyClipboardText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    const v = validateJobUrl(trimmed);
    setClipboardDetected(v.valid);
  }, []);

  useEffect(() => {
    if (!open || !clipboardEnabled || !navigator.clipboard) return;
    navigator.clipboard.readText().then(applyClipboardText).catch(() => {});
  }, [open, clipboardEnabled, applyClipboardText]);

  useEffect(() => {
    if (!open) {
      setUrl('');
      setStage('idle');
      setErrorMessage('');
      setClipboardDetected(false);
      setImportedJob(null);
      setLoadingStep(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && stage === 'idle') {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open, stage]);

  useEffect(() => {
    if (stage !== 'loading') return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 3200);
    return () => clearInterval(interval);
  }, [stage]);

  const handleToggleClipboard = (enabled: boolean) => {
    setClipboardEnabled(enabled);
    localStorage.setItem(CLIPBOARD_KEY, String(enabled));
  };

  const handlePasteFromClipboard = () => {
    if (!navigator.clipboard) return;
    haptics.light();
    navigator.clipboard.readText().then(applyClipboardText).catch(() => {
      setErrorMessage('Clipboard access was denied. Paste the link manually.');
      setStage('error');
    });
  };

  const handleAnalyze = async () => {
    if (!authReady) {
      setStage('error');
      setErrorMessage('Still signing you in — please try again in a moment.');
      return;
    }

    if (!user) {
      setStage('error');
      setErrorMessage('Sign in to import and save job postings.');
      return;
    }

    if (!validation.valid) {
      setStage('error');
      setErrorMessage(validation.error ?? 'Enter a valid job URL.');
      return;
    }

    haptics.medium();
    setStage('loading');
    setErrorMessage('');

    try {
      const result = await importJob.mutateAsync(validation.normalized);
      logWorkspaceActivity({
        type: 'job_imported',
        jobTitle: result.job?.title,
        company: result.job?.company,
      });
      setImportedJob(result);
      setStage('success');
      haptics.success();
      window.setTimeout(() => {
        onOpenChange(false);
        navigate(`/tailoring-hub?jobId=${result.id}`);
      }, 1600);
    } catch (err: unknown) {
      haptics.warning();
      setStage('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Check the link and try again.',
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && stage === 'idle' && validation.valid) {
      e.preventDefault();
      void handleAnalyze();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="import-job-sheet flex flex-col gap-0 rounded-t-3xl border-t border-primary/25 p-0 max-h-[min(88dvh,640px)] sm:mx-auto sm:max-w-xl"
      >
        <div className="import-job-sheet__hero shrink-0 px-5 pt-5 pb-4 border-b border-border/40">
          <SheetHeader className="text-left space-y-1 p-0">
            <SheetTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span className="import-job-sheet__icon flex items-center justify-center w-9 h-9 rounded-xl shrink-0">
                <Link2 className="w-4 h-4 text-primary" aria-hidden />
              </span>
              Import job posting
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground leading-relaxed pl-[2.875rem]">
              Paste a listing URL — we fetch the page, extract role details with AI, and save it to
              your workspace for tailoring.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence mode="wait">
            {stage === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="import-job-sheet__sources space-y-2.5 rounded-xl px-3.5 py-3">
                  <p className="text-xs font-medium text-foreground/90">Supported job sources</p>
                  <ul className="flex flex-wrap gap-2" role="list" aria-label="Supported job boards">
                    {SUPPORTED_SITES.map(({ label, match }) => {
                      const isActive =
                        validation.valid && validation.normalized.toLowerCase().includes(match);
                      return (
                        <li key={label}>
                          <span
                            className={cn(
                              'import-job-sheet__source-chip inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium leading-none',
                              isActive && 'import-job-sheet__source-chip--active',
                            )}
                          >
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {clipboardDetected && validation.valid && (
                  <div className="import-job-sheet__detected flex items-start gap-3 rounded-xl px-3.5 py-3">
                    <Clipboard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Link ready from clipboard</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{validation.normalized}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="import-job-url" className="text-xs font-medium text-muted-foreground">
                    Job posting URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="import-job-url"
                      ref={inputRef}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setClipboardDetected(false);
                        if (stage === 'error') setStage('idle');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="https://www.linkedin.com/jobs/view/…"
                      className="import-job-sheet__input w-full pl-10 pr-24 py-3.5 rounded-xl border text-[16px] bg-card/80"
                      aria-invalid={url.trim().length > 0 && !validation.valid}
                      aria-describedby="import-job-url-hint"
                    />
                    {typeof navigator !== 'undefined' && navigator.clipboard && (
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        Paste
                      </button>
                    )}
                  </div>
                  <p
                    id="import-job-url-hint"
                    className={cn(
                      'text-xs leading-snug',
                      url.trim() && !validation.valid ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {url.trim() && !validation.valid
                      ? validation.error
                      : validation.hint ?? 'Works with major job boards and public careers pages.'}
                  </p>
                </div>

                <Button
                  onClick={() => void handleAnalyze()}
                  disabled={!validation.valid || importJob.isPending}
                  className="import-job-sheet__cta w-full h-12 rounded-xl text-sm font-semibold shadow-none"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze &amp; save job
                </Button>
              </motion.div>
            )}

            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 space-y-5"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="import-job-sheet__loader-ring flex items-center justify-center w-14 h-14 rounded-2xl">
                    <MiniSpinner size={28} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Importing job…</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    This uses our live job-import service — fetch, parse, and save. Usually 10–20s.
                  </p>
                </div>
                <ul className="space-y-2">
                  {LOADING_STEPS.map((label, index) => {
                    const done = index < loadingStep;
                    const active = index === loadingStep;
                    return (
                      <li
                        key={label}
                        className={cn(
                          'flex items-center gap-2.5 text-sm rounded-lg px-3 py-2 transition-colors',
                          active && 'import-job-sheet__step--active',
                          done && 'text-muted-foreground',
                          !done && !active && 'text-muted-foreground/50',
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : active ? (
                          <MiniSpinner size={16} className="text-primary shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}

            {stage === 'success' && importedJob && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 space-y-4"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-base font-semibold text-foreground">Job saved</p>
                  <p className="text-xs text-muted-foreground">Opening your job workspace…</p>
                </div>
                <div className="import-job-sheet__preview rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/12 shrink-0">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {importedJob.job.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {importedJob.job.company}
                      </p>
                      {importedJob.job.location && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {importedJob.job.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {importedJob.job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
                      {importedJob.job.skills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-[10px] font-normal">
                          {skill}
                        </Badge>
                      ))}
                      {importedJob.job.skills.length > 6 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{importedJob.job.skills.length - 6}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 py-2"
              >
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Couldn&apos;t import this job</p>
                    <p className="text-xs text-destructive/90 mt-1 leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStage('idle');
                    setErrorMessage('');
                  }}
                  className="w-full h-11 rounded-xl"
                >
                  Try again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {stage === 'idle' && (
          <div className="shrink-0 px-5 py-3.5 border-t border-border/40 bg-muted/15 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Clipboard assist</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Auto-fill when you open this sheet</p>
            </div>
            <Switch
              checked={clipboardEnabled}
              onCheckedChange={handleToggleClipboard}
              aria-label="Enable clipboard job link detection"
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
