import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Check, Sparkles } from 'lucide-react';
import { translateError, type ErrorContext } from '@/lib/devkit/errorTranslate';
import { Button } from '@/components/ui/button';

/**
 * Best-effort secret redactor for raw error strings before they hit the
 * UI or the clipboard. Better-safe-than-sorry: matches common API key
 * shapes (Resend, Stripe, GitHub, Slack, OpenAI, Bearer headers, JWTs,
 * long hex/base64 blobs). Replaces the body of the token with a
 * `***REDACTED***` placeholder while preserving the prefix so an admin
 * can still tell which provider misfired.
 */
export function redactSecrets(input: string): string {
  if (!input) return input;
  let out = input;
  // Provider-prefixed keys: re_xxx (Resend), sk_xxx / pk_xxx (Stripe/OpenAI/etc),
  // rk_xxx (Stripe restricted), ghp_/gho_/ghu_/ghs_/ghr_ (GitHub),
  // xoxb-/xoxp-/xoxa-/xoxr-/xoxs- (Slack).
  out = out.replace(/\b(re|sk|pk|rk|ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_-]{8,}/g, '$1_***REDACTED***');
  out = out.replace(/\bxox[baprs]-[A-Za-z0-9-]{8,}/g, 'xox*-***REDACTED***');
  // Authorization: Bearer <token>
  out = out.replace(/\b(Bearer\s+)[A-Za-z0-9._\-+/=]{12,}/gi, '$1***REDACTED***');
  // JWTs: header.payload.signature
  out = out.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, 'eyJ***REDACTED***');
  // Long hex/base64 blobs (>= 40 chars) that are likely credentials.
  out = out.replace(/\b[A-Fa-f0-9]{40,}\b/g, '***REDACTED***');
  return out;
}

interface DevKitErrorCardProps {
  /** Raw error string from the edge function or fetch call. */
  error: string | null | undefined;
  /** Optional title — defaults to "Something went wrong". */
  title?: string;
  /** Optional retry handler — renders a "Try again" button when provided. */
  onRetry?: () => void;
  /** Compact variant — drops the icon header for inline use inside small panels. */
  compact?: boolean;
  /**
   * Structured context embedded in the copied AI prompt so the assistant
   * has the exact panel / edge function / action / HTTP status to reason about.
   * Pass only sanitized data — never tokens or PII.
   */
  context?: ErrorContext;
}

/**
 * Friendly, copy-an-AI-prompt error card for every DevKit panel.
 *
 * Replaces inline `<p className="text-sm text-destructive">{error}</p>` blocks.
 * Translates known error patterns into plain-English explanations + a one-click
 * AI fix prompt the admin can paste into Replit Agent / Cursor / etc.
 */
export function DevKitErrorCard({ error, title, onRetry, compact = false, context }: DevKitErrorCardProps) {
  // Always redact before render/copy/AI-prompt so secrets in upstream errors
  // (e.g. an API echo of a Bearer header) never leak via the UI or clipboard.
  const raw = redactSecrets((error ?? '').toString());
  const t = translateError(raw, context);
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
