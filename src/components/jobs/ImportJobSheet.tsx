import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2, CheckCircle2, AlertCircle, Clipboard } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useImportJob } from '@/hooks/useImportJob';

const CLIPBOARD_KEY = 'wr-clipboard-job-detect';

const JOB_DOMAINS = [
  'linkedin.com/jobs',
  'indeed.com',
  'wuzzuf.net',
  'bayt.com',
  'glassdoor.com/job',
  'monster.com',
  'ziprecruiter.com',
  'careers.',
  '/jobs/',
  '/careers/',
];

function isJobUrl(text: string): boolean {
  if (!text.startsWith('http')) return false;
  return JOB_DOMAINS.some(domain => text.includes(domain));
}

interface ImportJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = 'idle' | 'loading' | 'success' | 'error';

export function ImportJobSheet({ open, onOpenChange }: ImportJobSheetProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingText, setLoadingText] = useState('Fetching job...');
  const [clipboardEnabled, setClipboardEnabled] = useState(
    () => localStorage.getItem(CLIPBOARD_KEY) === 'true'
  );
  const [clipboardDetected, setClipboardDetected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const importJob = useImportJob();

  // Clipboard detection on open
  useEffect(() => {
    if (!open) {
      setClipboardDetected(false);
      return;
    }
    if (!clipboardEnabled || !navigator.clipboard) return;
    navigator.clipboard.readText()
      .then(text => {
        if (isJobUrl(text.trim())) {
          setUrl(text.trim());
          setClipboardDetected(true);
        }
      })
      .catch(() => { /* permission denied — silent */ });
  }, [open, clipboardEnabled]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setUrl('');
      setStage('idle');
      setErrorMessage('');
      setClipboardDetected(false);
    }
  }, [open]);

  // Focus input when idle
  useEffect(() => {
    if (open && stage === 'idle') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, stage]);

  const handleToggleClipboard = (enabled: boolean) => {
    setClipboardEnabled(enabled);
    localStorage.setItem(CLIPBOARD_KEY, String(enabled));
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStage('loading');
    setLoadingText('Fetching job...');

    const timer = setTimeout(() => setLoadingText('Analyzing with AI...'), 4000);

    try {
      const job = await importJob.mutateAsync(trimmed);
      clearTimeout(timer);
      setStage('success');
      setTimeout(() => {
        onOpenChange(false);
        navigate(`/job/${job.id}`);
      }, 1200);
    } catch (err: unknown) {
      clearTimeout(timer);
      setStage('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && stage === 'idle') handleAnalyze();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-primary" />
            Import Job
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Clipboard detected banner */}
          {clipboardDetected && stage === 'idle' && (
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
              <Clipboard className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">We found a job link</p>
                <p className="text-xs text-muted-foreground truncate">{url}</p>
              </div>
            </div>
          )}

          {/* URL input */}
          {stage === 'idle' && (
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setClipboardDetected(false); }}
                onKeyDown={handleKeyDown}
                placeholder="Paste job link here..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Job URL"
              />
              <Button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="w-full h-12 rounded-xl"
                size="lg"
              >
                Analyze Job
              </Button>
            </div>
          )}

          {/* Loading state */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{loadingText}</p>
            </div>
          )}

          {/* Success state */}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm font-medium">Job imported!</p>
              <p className="text-xs text-muted-foreground">Opening job workspace...</p>
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setStage('idle'); setErrorMessage(''); }}
                className="w-full h-11 rounded-xl"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Clipboard detection toggle */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium">Detect job links from clipboard</p>
              <p className="text-xs text-muted-foreground">Auto-fill when you open this sheet</p>
            </div>
            <Switch
              checked={clipboardEnabled}
              onCheckedChange={handleToggleClipboard}
              aria-label="Enable clipboard job link detection"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
