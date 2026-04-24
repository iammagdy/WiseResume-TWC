import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { SECTION_LABELS } from './LivePreviewPanel';
import type { ResumeData } from '@/types/resume';

// Map a `data-section` attribute value to its corresponding key on
// ResumeData. Kept local to this file so the overlay feature is
// self-contained and doesn't need to reach into the rest of the store.
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

type Phase = 'input' | 'loading' | 'result' | 'error';

function summarizeContent(content: unknown): string {
  if (content === null || content === undefined) return '';
  if (typeof content === 'string') return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

export function SectionAIPopover({ open, onOpenChange, sectionName }: SectionAIPopoverProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);

  const [phase, setPhase] = useState<Phase>('input');
  const [request, setRequest] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<unknown>(null);
  const [proposed, setProposed] = useState<unknown>(null);
  // The editable buffer the user can tweak before applying. For string
  // sections this is the literal text; for structured sections it's the
  // pretty-printed JSON of the proposed payload.
  const [editedText, setEditedText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Reset all internal phase state whenever the dialog reopens or switches
  // section so a stale result/request from a previous interaction never
  // leaks into a new one.
  useEffect(() => {
    if (!open) return;
    setPhase('input');
    setRequest('');
    setErrorMsg(null);
    setOriginalSnapshot(null);
    setProposed(null);
    setEditedText('');
    setParseError(null);
  }, [open, sectionName]);

  const sectionLabel = SECTION_LABELS[sectionName] ?? sectionName;

  const runRequest = useCallback(async (instruction: string) => {
    if (!currentResume) return;
    const trimmed = instruction.trim();
    if (!trimmed) return;
    const snapshot = getSectionContent(currentResume, sectionName);
    setOriginalSnapshot(snapshot);
    setPhase('loading');
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-section', {
        body: {
          section: sectionName,
          action: 'custom',
          fixInstruction: trimmed,
          currentContent: snapshot,
          context: {
            resume: currentResume,
          },
        },
      });
      if (error) {
        setErrorMsg(error.message || 'Could not reach the AI service.');
        setPhase('error');
        return;
      }
      const improved = (data && typeof data === 'object' ? (data as { improved?: unknown }).improved : null) ?? null;
      if (improved === null || improved === undefined) {
        setErrorMsg('AI returned an empty result.');
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
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error.');
      setPhase('error');
    }
  }, [currentResume, sectionName]);

  const handleApply = useCallback(() => {
    if (!currentResume || proposed === null || proposed === undefined) return;
    const key = SECTION_TO_KEY[sectionName];
    if (!key) {
      onOpenChange(false);
      return;
    }
    // Resolve the final content from the editable buffer. Strings go
    // through verbatim; structured payloads must round-trip through JSON
    // so the user can hand-edit the proposed object/array. A parse failure
    // keeps the dialog open and surfaces the error inline rather than
    // writing the original AI payload (which would silently discard the
    // user's edits).
    let finalContent: unknown;
    if (typeof proposed === 'string') {
      finalContent = editedText;
    } else {
      try {
        finalContent = JSON.parse(editedText);
      } catch (e) {
        setParseError(
          e instanceof Error ? e.message : 'Invalid JSON — please fix and try again.',
        );
        return;
      }
    }
    updateResume({ [key]: finalContent } as Partial<ResumeData>);
    onOpenChange(false);
  }, [currentResume, proposed, editedText, sectionName, updateResume, onOpenChange]);

  const handleTryAgain = useCallback(() => {
    setProposed(null);
    setEditedText('');
    setParseError(null);
    setPhase('input');
  }, []);

  const handleDiscard = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleRetry = useCallback(() => {
    if (request.trim()) {
      void runRequest(request);
    } else {
      setPhase('input');
    }
  }, [request, runRequest]);

  const oldSummary = summarizeContent(originalSnapshot).slice(0, 80);
  const isStringSection = typeof proposed === 'string';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit {sectionLabel} with AI</DialogTitle>
          <DialogDescription>
            Tell the AI what to change. The result will appear here for you to review before applying.
          </DialogDescription>
        </DialogHeader>

        {phase === 'input' && (
          <div className="space-y-3">
            <Textarea
              autoFocus
              rows={4}
              placeholder="Describe what you want — e.g. 'make this shorter' or 'rewrite in a more confident tone'"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
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
            <span className="text-sm">AI is rewriting your {sectionLabel.toLowerCase()}…</span>
          </div>
        )}

        {phase === 'result' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Here's the updated {sectionLabel.toLowerCase()}. Tweak it below if you'd like, then Apply.
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
