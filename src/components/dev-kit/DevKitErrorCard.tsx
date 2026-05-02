import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Check, Sparkles } from 'lucide-react';
import { translateError } from '@/lib/devkit/errorTranslate';
import { Button } from '@/components/ui/button';

interface DevKitErrorCardProps {
  /** Raw error string from the edge function or fetch call. */
  error: string | null | undefined;
  /** Optional title — defaults to "Something went wrong". */
  title?: string;
  /** Optional retry handler — renders a "Try again" button when provided. */
  onRetry?: () => void;
  /** Compact variant — drops the icon header for inline use inside small panels. */
  compact?: boolean;
}

/**
 * Friendly, copy-an-AI-prompt error card for every DevKit panel.
 *
 * Replaces inline `<p className="text-sm text-destructive">{error}</p>` blocks.
 * Translates known error patterns into plain-English explanations + a one-click
 * AI fix prompt the admin can paste into Replit Agent / Cursor / etc.
 */
export function DevKitErrorCard({ error, title, onRetry, compact = false }: DevKitErrorCardProps) {
  const raw = (error ?? '').toString();
  const t = translateError(raw);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(t.aiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — surface a small fallback inline.
      window.prompt('Copy this prompt into your AI assistant:', t.aiPrompt);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/15 p-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">
              {title ?? 'Something went wrong'}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {t.humanMessage}
            </p>
          </div>
        </div>
      )}

      {compact && (
        <p className="text-sm text-foreground leading-relaxed">{t.humanMessage}</p>
      )}

      <div className="rounded-md bg-background/60 border border-border/50 p-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">Next step: </span>
        {t.hint}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="h-8 gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy AI fix prompt'}
        </Button>

        {onRetry && (
          <Button type="button" size="sm" variant="ghost" onClick={onRetry} className="h-8">
            Try again
          </Button>
        )}

        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {showRaw ? 'Hide raw error' : 'Show raw error'}
        </button>
      </div>

      {showRaw && (
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-background border border-border/50 p-2 text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap break-all">
          {raw || '(empty error)'}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(raw).catch(() => {})}
            className="block mt-1 text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy raw
          </button>
        </pre>
      )}
    </div>
  );
}
