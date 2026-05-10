import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, RefreshCw, ChevronLeft, Scissors, Zap, BarChart2, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import {
  resumeSectionAiFnName,
  resumeSectionAiBodyProps,
} from '@/lib/resumeSectionAiFlag';
import { aiErrorToastMessage } from '@/lib/aiErrorParser';
import { SECTION_LABELS } from './LivePreviewPanel';
import type { ResumeData } from '@/types/resume';

const SECTION_TO_KEY: Record<string, keyof ResumeData> = {
  summary: 'summary',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  certifications: 'certifications',
  awards: 'awards',
  projects: 'projects',
  publications: 'publications',
  volunteering: 'volunteering',
  hobbies: 'hobbies',
  references: 'references',
  languages: 'languages',
};

function getSectionContent(resume: ResumeData | null, sectionName: string): unknown {
  if (!resume) return null;
  const key = SECTION_TO_KEY[sectionName];
  if (!key) return null;
  return resume[key];
}

interface SectionAIPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
}

type Phase = 'entry-pick' | 'input' | 'loading' | 'result' | 'error';

interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  [key: string]: unknown;
}

function summarizeContent(content: unknown): string {
  if (content === null || content === undefined) return '';
  if (typeof content === 'string') return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function getExperienceEntries(resume: ResumeData | null): ExperienceEntry[] {
  if (!resume) return [];
  const exp = resume.experience;
  if (!Array.isArray(exp)) return [];
  return exp as ExperienceEntry[];
}

export function SectionAIPopover({ open, onOpenChange, sectionName }: SectionAIPopoverProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);

  const isExperience = sectionName === 'experience';
  const experienceEntries = getExperienceEntries(currentResume);

  const [phase, setPhase] = useState<Phase>(isExperience ? 'entry-pick' : 'input');
  const [selectedEntry, setSelectedEntry] = useState<ExperienceEntry | null>(null);
  const [request, setRequest] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<unknown>(null);
  const [proposed, setProposed] = useState<unknown>(null);
  const [editedText, setEditedText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  // Preserve last attempted action so Retry can replay quick-action failures
  const [lastInstruction, setLastInstruction] = useState('');
  const [lastQuickAction, setLastQuickAction] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setPhase(isExperience ? 'entry-pick' : 'input');
    setSelectedEntry(null);
    setRequest('');
    setErrorMsg(null);
    setOriginalSnapshot(null);
    setProposed(null);
    setEditedText('');
    setParseError(null);
    setLastInstruction('');
    setLastQuickAction(undefined);
  }, [open, sectionName, isExperience]);

  const sectionLabel = SECTION_LABELS[sectionName] ?? sectionName;

  const runRequest = useCallback(async (instruction: string, quickAction?: string) => {
    if (!currentResume) return;
    if (!instruction.trim() && !quickAction) return;

    let snapshot: unknown;
    let action = 'custom';
    let fixInstruction: string | undefined = instruction.trim() || undefined;

    if (quickAction) {
      action = quickAction;
      fixInstruction = undefined;
    }

    // Persist for Retry replay
    setLastInstruction(instruction);
    setLastQuickAction(quickAction);

    if (isExperience && selectedEntry) {
      snapshot = [selectedEntry];
    } else {
      snapshot = getSectionContent(currentResume, sectionName);
    }

    setOriginalSnapshot(snapshot);
    setPhase('loading');
    setErrorMsg(null);

    try {
      const { data, error: invokeError } = await appwriteFunctions.invoke<{ improved?: unknown }>(
        resumeSectionAiFnName('enhance-section'),
        {
          body: {
            ...resumeSectionAiBodyProps('enhance-section'),
            section: sectionName,
            action,
            ...(fixInstruction ? { fixInstruction } : {}),
            currentContent: snapshot,
            context: { resume: currentResume },
          },
        },
      );

      if (invokeError) {
        setErrorMsg(aiErrorToastMessage({ code: 'internal', message: invokeError.message, status: invokeError.status ?? 500 }));
        setPhase('error');
        return;
      }
      const improved = data?.improved ?? null;
      if (improved === null || improved === undefined) {
        setErrorMsg('AI returned an empty result. Please try again.');
        setPhase('error');
        return;
      }

      setProposed(improved);
      setEditedText(
        typeof improved === 'string' ? improved : JSON.stringify(improved, null, 2),
      );
      setParseError(null);
      setPhase('result');
    } catch (e) {
      // Map network-level failures (offline, CORS, DNS) to actionable messages
      const isNetworkError =
        e instanceof TypeError &&
        (e.message.toLowerCase().includes('fetch') ||
          e.message.toLowerCase().includes('network') ||
          e.message.toLowerCase().includes('failed'));
      setErrorMsg(
        isNetworkError
          ? 'Unable to reach the AI service. Please check your connection and try again.'
          : e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.',
      );
      setPhase('error');
    }
  }, [currentResume, sectionName, selectedEntry, isExperience]);

  const handleApply = useCallback(() => {
    if (!currentResume || proposed === null || proposed === undefined) return;
    const key = SECTION_TO_KEY[sectionName];
    if (!key) { onOpenChange(false); return; }

    let finalContent: unknown;
    if (typeof proposed === 'string') {
      finalContent = editedText;
    } else {
      try {
        finalContent = JSON.parse(editedText);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Invalid JSON — please fix and try again.');
        return;
      }
    }

    if (isExperience && selectedEntry) {
      const improvedEntry = Array.isArray(finalContent)
        ? (finalContent as ExperienceEntry[]).find(e => e.id === selectedEntry.id) ?? (finalContent as ExperienceEntry[])[0]
        : finalContent as ExperienceEntry;

      if (!improvedEntry || typeof improvedEntry !== 'object') {
        setParseError('Could not resolve the improved entry from the AI response. Please try again.');
        return;
      }

      const existingEntries = Array.isArray(currentResume.experience)
        ? [...(currentResume.experience as ExperienceEntry[])]
        : [];
      const idx = existingEntries.findIndex(e => e.id === selectedEntry.id);
      if (idx === -1) {
        setParseError('Could not find the original entry to update — it may have been removed. Please close and try again.');
        return;
      }
      existingEntries[idx] = { ...existingEntries[idx], ...improvedEntry as object };
      updateResume({ experience: existingEntries } as Partial<ResumeData>);
    } else {
      updateResume({ [key]: finalContent } as Partial<ResumeData>);
    }

    onOpenChange(false);
  }, [currentResume, proposed, editedText, sectionName, selectedEntry, isExperience, updateResume, onOpenChange]);

  const handleTryAgain = useCallback(() => {
    setProposed(null);
    setEditedText('');
    setParseError(null);
    setPhase('input');
  }, []);

  const handleDiscard = useCallback(() => { onOpenChange(false); }, [onOpenChange]);

  const handleRetry = useCallback(() => {
    // Replay the exact last action (including quick-action buttons)
    if (lastQuickAction) {
      void runRequest(lastInstruction, lastQuickAction);
    } else if (lastInstruction.trim()) {
      void runRequest(lastInstruction);
    } else if (request.trim()) {
      void runRequest(request);
    } else {
      setPhase('input');
    }
  }, [lastInstruction, lastQuickAction, request, runRequest]);

  const handlePickEntry = useCallback((entry: ExperienceEntry | null) => {
    setSelectedEntry(entry);
    setPhase('input');
  }, []);

  const handleBackToPick = useCallback(() => {
    setSelectedEntry(null);
    setPhase('entry-pick');
  }, []);

  const oldSummary = summarizeContent(originalSnapshot).slice(0, 80);
  const isStringSection = typeof proposed === 'string';

  const selectedEntryLabel = selectedEntry
    ? `${selectedEntry.position || 'Role'} at ${selectedEntry.company || 'Company'}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {phase === 'entry-pick'
              ? `Edit Experience with AI`
              : `Edit ${sectionLabel} with AI`}
          </DialogTitle>
          <DialogDescription>
            {phase === 'entry-pick'
              ? 'Choose a job entry to target, or improve all at once.'
              : selectedEntryLabel
              ? `Targeting: ${selectedEntryLabel}`
              : 'Tell the AI what to change. The result will appear here for you to review before applying.'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'entry-pick' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handlePickEntry(null)}
              className="w-full text-left rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors"
            >
              All entries — improve every job at once
            </button>
            {experienceEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handlePickEntry(entry)}
                className="w-full text-left rounded-lg border px-4 py-3 hover:border-violet-300 hover:bg-violet-50/40 transition-colors"
              >
                <div className="text-sm font-medium text-slate-800">{entry.position || 'Untitled Role'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {entry.company || 'Unknown Company'}
                  {(entry.startDate || entry.endDate) && (
                    <span className="ml-2 text-slate-400">
                      {entry.startDate}
                      {entry.endDate ? ` – ${entry.endDate}` : entry.current ? ' – Present' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {phase === 'input' && (
          <div className="space-y-3">
            {isExperience && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToPick}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {selectedEntry ? 'Change entry' : 'Back'}
                </button>
                {selectedEntry && (
                  <Badge variant="secondary" className="text-xs font-normal max-w-[240px] truncate">
                    {selectedEntryLabel}
                  </Badge>
                )}
              </div>
            )}

            {isExperience && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void runRequest('', 'shorten')}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <Scissors className="w-3 h-3" />
                  Shorten
                </button>
                <button
                  type="button"
                  onClick={() => void runRequest('', 'improve')}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Improve
                </button>
                <button
                  type="button"
                  onClick={() => void runRequest('', 'add_metrics')}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <BarChart2 className="w-3 h-3" />
                  Add metrics
                </button>
                <button
                  type="button"
                  onClick={() => void runRequest('', 'ats_optimize')}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  ATS optimize
                </button>
              </div>
            )}

            <Textarea
              autoFocus={!isExperience}
              rows={4}
              placeholder="Or describe what you want — e.g. 'make this more confident' or 'fix the grammar'"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && request.trim()) {
                  e.preventDefault();
                  void runRequest(request);
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void runRequest(request)}
                disabled={!request.trim()}
                size="sm"
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </Button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">
              {selectedEntry
                ? `AI is rewriting ${selectedEntry.position || 'this entry'}…`
                : `AI is rewriting your ${sectionLabel.toLowerCase()}…`}
            </span>
          </div>
        )}

        {phase === 'result' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Here's the updated {selectedEntry ? (selectedEntry.position || 'entry') : sectionLabel.toLowerCase()}. Tweak it below if you'd like, then Apply.
            </p>
            {oldSummary && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <div className="line-through text-muted-foreground/70 break-words">
                  {oldSummary}
                  {summarizeContent(originalSnapshot).length > 80 ? '…' : ''}
                </div>
              </div>
            )}
            <Textarea
              rows={isStringSection ? 6 : 10}
              value={editedText}
              onChange={(e) => {
                setEditedText(e.target.value);
                if (parseError) setParseError(null);
              }}
              className={isStringSection ? '' : 'font-mono text-xs'}
              spellCheck={isStringSection}
              aria-label={`Edit proposed ${sectionLabel.toLowerCase()}`}
            />
            {!isStringSection && (
              <p className="text-[11px] text-muted-foreground">
                This section is structured. Edit the JSON above before applying.
              </p>
            )}
            {parseError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive break-words">
                {parseError}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
              <Button variant="outline" size="sm" onClick={handleTryAgain} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isStringSection ? editedText.trim().length === 0 : editedText.length === 0}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-3">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMsg ?? 'Something went wrong.'}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard}>Close</Button>
              <Button size="sm" onClick={handleRetry} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
