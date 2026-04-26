import { useEffect, useState, useRef, useMemo } from 'react';
import { Check, X, Sparkles, ArrowRight, Loader2, Minimize2, Wand2, RefreshCw, Pencil, ChevronDown, ChevronRight, Plus, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

export type AIEnhanceRerunAction = 'shorten' | 'improve' | 'generate';

export type EntryDiffStatus = 'new' | 'changed' | 'unchanged' | 'removed';
export type FieldDiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface ListLineDiff {
  text: string;
  status: 'added' | 'removed' | 'unchanged';
}

export interface FieldDiff {
  key: string;
  label: string;
  status: FieldDiffStatus;
  /** For scalar fields. */
  before?: string;
  after?: string;
  /** For list fields (achievements, technologies, …). */
  isList?: boolean;
  lines?: ListLineDiff[];
}

export interface EntryDiff {
  id: string;
  title: string;
  status: EntryDiffStatus;
  fields: FieldDiff[];
}

interface AIEnhanceDialogProps {
  isOpen: boolean;
  original: string;
  improved: string;
  changes: string[];
  suggestions?: string[];
  /**
   * Optional structured per-entry diff. When provided, the dialog
   * renders an entry-by-entry diff view instead of the flat
   * original/improved text panes. Approve still calls `onApply` —
   * the parent owns merging the structured payload back in.
   */
  entries?: EntryDiff[];
  /**
   * Receives the user's currently-edited text. Callers should treat this as
   * the authoritative content to write to the resume — the original AI
   * response is only the seed.
   */
  onApply: (editedText: string) => void;
  onDiscard: () => void;
  /**
   * Optional re-run hook. When provided, the dialog renders Shorten /
   * Re-optimize / Regenerate buttons that call this with the user's
   * currently-edited text as the seed.
   */
  onRerun?: (action: AIEnhanceRerunAction, currentText: string) => void;
  /** True while a re-run is in flight; disables the action buttons. */
  isEnhancing?: boolean;
  /** Which re-run buttons to render. Defaults to all three. */
  allowedReruns?: AIEnhanceRerunAction[];
  title?: string;
}

export function AIEnhanceDialog({
  isOpen,
  original,
  improved,
  changes,
  suggestions,
  entries,
  onApply,
  onDiscard,
  onRerun,
  isEnhancing = false,
  allowedReruns = ['shorten', 'improve', 'generate'],
  title = 'AI Enhancement',
}: AIEnhanceDialogProps) {
  const useEntryView = !!entries && entries.length > 0;

  const [editedText, setEditedText] = useState(improved);
  const [isEditing, setIsEditing] = useState(false);
  // Track the last AI-produced value we synced from. When the prop changes
  // (a fresh enhance / re-run completed), we replace the textarea contents
  // with the new AI output instead of stomping on whatever the user typed
  // for an unrelated re-render of the parent.
  const lastImprovedRef = useRef(improved);

  useEffect(() => {
    if (improved !== lastImprovedRef.current) {
      lastImprovedRef.current = improved;
      setEditedText(improved);
      setIsEditing(false);
    }
  }, [improved]);

  // When the dialog is (re-)opened, reset the editable buffer so the user
  // sees the AI's latest output rather than a stale edit from a previous
  // session.
  useEffect(() => {
    if (isOpen) {
      setEditedText(improved);
      lastImprovedRef.current = improved;
      setIsEditing(false);
    }
  }, [isOpen, improved]);

  if (!isOpen) return null;

  const trimmedEdited = editedText.trim();
  const canApply = useEntryView
    ? !isEnhancing
    : trimmedEdited.length > 0 && !isEnhancing;
  const canRerun = !!onRerun && !isEnhancing && (useEntryView || trimmedEdited.length > 0);

  const handleRerun = (action: AIEnhanceRerunAction) => {
    if (!onRerun) return;
    onRerun(action, editedText);
  };

  return (
    <div
      className="fixed inset-0 z-ai-dialog flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
      onClick={isEnhancing ? undefined : onDiscard}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <AIProviderVia className="mt-0.5" />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDiscard}
            disabled={isEnhancing}
            className="min-w-[44px] min-h-[44px]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {useEntryView ? (
            <EntryDiffView entries={entries!} isEnhancing={isEnhancing} />
          ) : (
            <>
              {/* Original */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Original</p>
                <div className="p-3 rounded-lg bg-muted text-sm line-through opacity-60 whitespace-pre-wrap break-words">
                  {original || '(Empty)'}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>

              {/* Improved (editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-primary">
                    Enhanced by AI {isEditing && <span className="text-muted-foreground">(editing)</span>}
                  </p>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit manually
                    </button>
                  )}
                </div>
                {isEnhancing && trimmedEdited.length === 0 ? (
                  <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                  </div>
                ) : isEditing ? (
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[160px] text-sm bg-primary/5 border-primary/20 focus-visible:ring-primary"
                    placeholder="The AI output appears here. Edit it to taste before applying."
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="block w-full text-left p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm whitespace-pre-wrap break-words hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Click to edit"
                  >
                    {editedText || '(Empty)'}
                  </button>
                )}
                {trimmedEdited.length === 0 && !isEnhancing && (
                  <p className="text-xs text-warning mt-1.5">
                    The AI returned an empty result. Edit manually or try Regenerate.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Re-run actions */}
          {onRerun && (
            <div className="flex flex-wrap gap-2">
              {allowedReruns.includes('shorten') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRerun('shorten')}
                  disabled={!canRerun}
                  className="gap-1.5"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Shorten
                </Button>
              )}
              {allowedReruns.includes('improve') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRerun('improve')}
                  disabled={!canRerun}
                  className="gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Re-optimize
                </Button>
              )}
              {allowedReruns.includes('generate') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRerun('generate')}
                  disabled={!onRerun || isEnhancing}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              )}
              {isEnhancing && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> AI is working…
                </span>
              )}
            </div>
          )}

          {/* Changes */}
          {changes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">What changed</p>
              <div className="flex flex-wrap gap-1.5">
                {changes.map((change, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {change}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-xs font-medium text-secondary mb-2">💡 Additional suggestions</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {suggestions.map((suggestion, i) => (
                  <li key={i}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-3 p-4 pb-safe border-t border-border">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12"
            onClick={onDiscard}
            disabled={isEnhancing}
          >
            <X className="w-5 h-5 mr-2" />
            Discard
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12 gradient-primary"
            onClick={() => onApply(editedText)}
            disabled={!canApply}
          >
            <Check className="w-5 h-5 mr-2" />
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== Entry diff view =====

function EntryDiffView({ entries, isEnhancing }: { entries: EntryDiff[]; isEnhancing: boolean }) {
  const summary = useMemo(() => {
    const counts = { new: 0, changed: 0, unchanged: 0, removed: 0 };
    entries.forEach(e => { counts[e.status] += 1; });
    return counts;
  }, [entries]);

  if (isEnhancing && entries.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">AI suggestion:</span>
        {summary.changed > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {summary.changed} changed
          </Badge>
        )}
        {summary.new > 0 && (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {summary.new} new
          </Badge>
        )}
        {summary.removed > 0 && (
          <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20">
            {summary.removed} removed
          </Badge>
        )}
        {summary.unchanged > 0 && (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {summary.unchanged} unchanged
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {entries.map(entry => (
          <EntryBlock key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function EntryBlock({ entry }: { entry: EntryDiff }) {
  const [open, setOpen] = useState(entry.status !== 'unchanged');
  const hasFields = entry.fields.length > 0;
  const canCollapse = hasFields;

  const statusBadge = (() => {
    switch (entry.status) {
      case 'new':
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
            <Plus className="w-3 h-3" /> New
          </Badge>
        );
      case 'changed':
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1">
            <Pencil className="w-3 h-3" /> Changed
          </Badge>
        );
      case 'removed':
        return (
          <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 gap-1">
            <X className="w-3 h-3" /> Will be removed
          </Badge>
        );
      case 'unchanged':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1">
            <Equal className="w-3 h-3" /> Unchanged
          </Badge>
        );
    }
  })();

  const containerTone =
    entry.status === 'new'
      ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
      : entry.status === 'changed'
      ? 'border-primary/30 bg-primary/[0.04]'
      : entry.status === 'removed'
      ? 'border-rose-500/30 bg-rose-500/[0.04]'
      : 'border-border bg-muted/40';

  return (
    <div className={`rounded-lg border ${containerTone} overflow-hidden`}>
      <button
        type="button"
        onClick={() => canCollapse && setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-foreground/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={open}
        disabled={!canCollapse}
      >
        {canCollapse ? (
          open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}
        <span className={`flex-1 text-sm font-medium truncate ${entry.status === 'removed' ? 'line-through text-rose-700 dark:text-rose-300' : ''}`}>
          {entry.title || '(Untitled)'}
        </span>
        {statusBadge}
      </button>

      {open && hasFields && (
        <div className="border-t border-border/60 px-3 py-3 space-y-3">
          {entry.fields.map(f => (
            <FieldDiffRow key={f.key} field={f} entryStatus={entry.status} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldDiffRow({ field, entryStatus }: { field: FieldDiff; entryStatus: EntryDiffStatus }) {
  // Collapse purely-unchanged scalar fields under a muted style — they're
  // shown for context but shouldn't draw the eye.
  const isQuiet = field.status === 'unchanged';

  if (field.isList) {
    const lines = field.lines || [];
    if (lines.length === 0) return null;
    return (
      <div>
        <p className={`text-[11px] font-medium uppercase tracking-wide mb-1 ${isQuiet ? 'text-muted-foreground' : 'text-foreground'}`}>
          {field.label}
        </p>
        <ul className="space-y-1 text-sm">
          {lines.map((line, i) => (
            <li key={i} className={lineClass(line.status)}>
              <span className="select-none mr-1.5 font-mono text-xs opacity-70">
                {line.status === 'added' ? '+' : line.status === 'removed' ? '−' : ' '}
              </span>
              <span className={line.status === 'removed' ? 'line-through' : ''}>{line.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const before = field.before ?? '';
  const after = field.after ?? '';

  if (isQuiet) {
    if (!after && !before) return null;
    return (
      <div className="flex gap-2 text-sm">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0 w-24 pt-0.5">
          {field.label}
        </span>
        <span className="text-muted-foreground break-words">{after || before}</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1 text-foreground">
        {field.label}
        <span className="ml-2 normal-case text-[10px] font-normal text-muted-foreground">
          {field.status === 'added' ? 'added' : field.status === 'removed' ? 'removed' : 'changed'}
        </span>
      </p>
      <div className="space-y-1.5">
        {field.status !== 'added' && before && (
          <div className="text-sm rounded bg-rose-500/[0.06] border border-rose-500/20 px-2 py-1 text-rose-700 dark:text-rose-300">
            <span className="line-through opacity-80 break-words whitespace-pre-wrap">{before}</span>
          </div>
        )}
        {field.status !== 'removed' && after && (
          <div className={`text-sm rounded px-2 py-1 break-words whitespace-pre-wrap ${entryStatus === 'new' ? 'bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-800 dark:text-emerald-200' : 'bg-primary/[0.08] border border-primary/20 text-foreground'}`}>
            {after}
          </div>
        )}
      </div>
    </div>
  );
}

function lineClass(status: ListLineDiff['status']): string {
  switch (status) {
    case 'added':
      return 'flex items-start text-emerald-700 dark:text-emerald-300';
    case 'removed':
      return 'flex items-start text-rose-700 dark:text-rose-300';
    case 'unchanged':
      return 'flex items-start text-muted-foreground';
  }
}
