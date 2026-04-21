import { useEffect, useState, useRef } from 'react';
import { Check, X, Sparkles, ArrowRight, Loader2, Minimize2, Wand2, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

export type AIEnhanceRerunAction = 'shorten' | 'improve' | 'generate';

interface AIEnhanceDialogProps {
  isOpen: boolean;
  original: string;
  improved: string;
  changes: string[];
  suggestions?: string[];
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
  onApply,
  onDiscard,
  onRerun,
  isEnhancing = false,
  allowedReruns = ['shorten', 'improve', 'generate'],
  title = 'AI Enhancement',
}: AIEnhanceDialogProps) {
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
  const canApply = trimmedEdited.length > 0 && !isEnhancing;
  const canRerun = !!onRerun && !isEnhancing && trimmedEdited.length > 0;

  const handleRerun = (action: AIEnhanceRerunAction) => {
    if (!onRerun) return;
    onRerun(action, editedText);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
      onClick={isEnhancing ? undefined : onDiscard}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
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
