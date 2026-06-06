import { useState, useRef, useCallback, useMemo } from 'react';
import { Globe, Link2, AlignLeft, Clipboard, X, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

type InputTab = 'url' | 'paste';

interface JobInputAreaProps {
  jobDescription: string;
  jobUrl: string;
  onJobDescriptionChange: (value: string) => void;
  onJobUrlChange: (value: string) => void;
  onFetchUrl?: (url: string) => void;
  isFetchingUrl?: boolean;
  initialTab?: InputTab;
  activeTab?: InputTab;
  onActiveTabChange?: (tab: InputTab) => void;
  className?: string;
}

const SUPPORTED_SITES = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'bayt.com',
  'wuzzuf.net',
];

type HintResult = { text: string; type: 'info' | 'warning' };

function detectHint(url: string): HintResult | null {
  if (!url.trim()) return null;

  if (url.includes('linkedin.com')) {
    if (/linkedin\.com\/jobs\/(collections|search)/i.test(url)) {
      return {
        text: "This is a LinkedIn job feed, not a specific posting. Open a job listing (linkedin.com/jobs/view/\u2026) and paste that URL.",
        type: 'warning',
      };
    }
    return {
      text: /linkedin\.com\/jobs\/view\//i.test(url) ? 'Detected: LinkedIn job posting' : 'Detected: LinkedIn',
      type: 'info',
    };
  }

  for (const site of SUPPORTED_SITES) {
    if (url.includes(site)) {
      const name = site.split('.')[0];
      return { text: `Detected: ${name.charAt(0).toUpperCase() + name.slice(1)}`, type: 'info' };
    }
  }
  if (/\/jobs?\/|\/careers?\/|job-|vacancy|posting/i.test(url)) {
    return { text: "Careers-style URL — we'll parse what we can.", type: 'info' };
  }
  return { text: "We'll try to extract job details from this page.", type: 'info' };
}

export function JobInputArea({
  jobDescription,
  jobUrl,
  onJobDescriptionChange,
  onJobUrlChange,
  onFetchUrl,
  isFetchingUrl = false,
  initialTab = 'paste',
  activeTab: controlledTab,
  onActiveTabChange,
  className,
}: JobInputAreaProps) {
  const [internalTab, setInternalTab] = useState<InputTab>(initialTab);
  const activeTab = controlledTab ?? internalTab;
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const urlHint = useMemo<HintResult | null>(() => detectHint(jobUrl), [jobUrl]);

  const handleTabSwitch = (tab: InputTab) => {
    haptics.light();
    if (controlledTab === undefined) setInternalTab(tab);
    onActiveTabChange?.(tab);
    setTimeout(() => {
      if (tab === 'url') urlInputRef.current?.focus();
      else textareaRef.current?.focus();
    }, 80);
  };

  const handlePasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard) return;
    haptics.light();
    try {
      const text = await navigator.clipboard.readText();
      if (activeTab === 'url') {
        onJobUrlChange(text.trim());
      } else {
        onJobDescriptionChange(text.trim());
      }
    } catch {
      // clipboard permission denied — user can paste manually
    }
  }, [activeTab, onJobUrlChange, onJobDescriptionChange]);

  return (
    <div className={cn('jmw-input-card', className)}>
      {/* Tab switcher */}
      <div className="jmw-input-card__tabs" role="tablist" aria-label="Job input method">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'paste'}
          data-active={activeTab === 'paste' ? 'true' : 'false'}
          className="jmw-tab-btn"
          onClick={() => handleTabSwitch('paste')}
        >
          <AlignLeft className="w-3.5 h-3.5" aria-hidden />
          Paste description
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'url'}
          data-active={activeTab === 'url' ? 'true' : 'false'}
          className="jmw-tab-btn"
          onClick={() => handleTabSwitch('url')}
        >
          <Link2 className="w-3.5 h-3.5" aria-hidden />
          Job URL
        </button>
      </div>

      {/* Body */}
      <div className="jmw-input-card__body" role="tabpanel">
        {activeTab === 'paste' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="jmw-job-description"
                className="text-xs font-medium text-muted-foreground"
              >
                Job description
              </label>
              <div className="flex items-center gap-2">
                {jobDescription.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onJobDescriptionChange('')}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear job description"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
                {navigator?.clipboard && (
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="jmw-job-description"
              ref={textareaRef}
              className="jmw-textarea"
              placeholder="Paste the full job description here…"
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              rows={7}
              aria-label="Job description text"
            />
            {jobDescription.trim().length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {jobDescription.trim().split(/\s+/).length} words
              </p>
            )}
          </div>
        )}

        {activeTab === 'url' && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="jmw-job-url"
              className="text-xs font-medium text-muted-foreground"
            >
              Job posting URL
            </label>
            <div className="jmw-url-input-wrap">
              <Globe
                className="jmw-url-input__icon w-4 h-4"
                aria-hidden
              />
              <input
                id="jmw-job-url"
                ref={urlInputRef}
                type="url"
                inputMode="url"
                autoComplete="off"
                className="jmw-url-input"
                placeholder="https://www.linkedin.com/jobs/view/…"
                value={jobUrl}
                onChange={(e) => onJobUrlChange(e.target.value)}
                aria-describedby="jmw-job-url-hint"
              />
              {navigator?.clipboard && !jobUrl && (
                <button
                  type="button"
                  className="jmw-url-input__paste-btn"
                  onClick={handlePasteFromClipboard}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Paste
                </button>
              )}
            </div>
            <p
              id="jmw-job-url-hint"
              className={cn(
                'text-[11px] leading-snug',
                urlHint?.type === 'warning' ? 'text-amber-500' : 'text-muted-foreground',
              )}
            >
              {urlHint?.text ?? 'Works with LinkedIn, Indeed, Glassdoor, and public careers pages.'}
            </p>
            {onFetchUrl && jobUrl.trim().length > 10 && (
              <button
                type="button"
                disabled={isFetchingUrl}
                onClick={() => onFetchUrl(jobUrl.trim())}
                className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/6 text-sm font-medium text-primary hover:bg-primary/12 active:bg-primary/18 transition-colors disabled:opacity-60 disabled:pointer-events-none min-h-[44px] touch-manipulation"
              >
                {isFetchingUrl
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />Fetching job details…</>
                  : <><Search className="w-3.5 h-3.5" aria-hidden />Fetch job details</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
