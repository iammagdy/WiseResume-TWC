/**
 * ActAsDialog — replaces the previous "auto-popup" Act As flow.
 *
 * Shows the impersonation `/act-as#<payload>` URL with:
 *  - Read-only input + "Copy link" button (so the admin can paste it
 *    elsewhere if their popup-blocker swallows the new tab).
 *  - "Open in new tab" button — explicit user gesture, predictable
 *    popup-blocker behavior.
 *  - Live mm:ss countdown driven by the session's `expires_at`.
 *  - Cancel/Close button.
 *
 * The dialog is a UI-only convenience — it does NOT enforce expiry.
 * The actual impersonation token is what the backend trusts; the
 * countdown is just a visible cue. When it hits 00:00 we auto-close
 * and surface a toast so the admin knows the link is no longer usable.
 *
 * BroadcastChannel('wr_act_as') is preserved for the "session_ended"
 * cross-tab signal. It's mounted alongside the dialog so we don't
 * leak channels when the dialog isn't open.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ActAsSession {
  /** Path-relative URL e.g. `/act-as#<payload>` (no origin). */
  url: string;
  email: string;
  userId: string;
  /** Epoch ms when the impersonation token expires. */
  expiresAt: number;
}

interface Props {
  session: ActAsSession | null;
  onClose: () => void;
}

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActAsDialog({ session, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  // Track last-rendered session id so the "copied" indicator and countdown
  // reset cleanly when the admin opens a different user's session.
  const lastSessionKey = useRef<string | null>(null);

  // Live countdown — recompute every second from the source-of-truth
  // `expires_at` rather than decrementing a counter, so a slow tab/sleep
  // can't desync the displayed time from reality.
  useEffect(() => {
    if (!session) return;
    const compute = () =>
      Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));

    setSecondsLeft(compute());

    const intervalId = window.setInterval(() => {
      const next = compute();
      setSecondsLeft(next);
      if (next <= 0) {
        window.clearInterval(intervalId);
        toast.info(`Act As session for ${session.email} expired`, {
          description: 'The impersonation link is no longer valid.',
        });
        onClose();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [session, onClose]);

  // Cross-tab "session ended" notification — preserved from the prior flow.
  // Scoped to the dialog's open state so we don't leak channels.
  useEffect(() => {
    if (!session) return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('wr_act_as');
      channel.onmessage = (
        ev: MessageEvent<{ type: string; userId: string | null }>,
      ) => {
        if (
          ev.data?.type === 'session_ended' &&
          ev.data?.userId === session.userId
        ) {
          toast.info(`Act As session for ${session.email} ended`, {
            description: 'The Act As tab was closed.',
          });
        }
      };
    } catch {
      // BroadcastChannel not supported — silent fallback, matches prior behavior.
    }
    return () => {
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [session]);

  // Reset transient UI state when the user opens a different session.
  useEffect(() => {
    const key = session ? `${session.userId}:${session.expiresAt}` : null;
    if (key !== lastSessionKey.current) {
      lastSessionKey.current = key;
      setCopied(false);
    }
  }, [session]);

  const fullUrl = session ? window.location.origin + session.url : '';

  const handleCopy = useCallback(async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy link', {
        description: 'Select the URL field and copy manually.',
      });
    }
  }, [fullUrl, session]);

  const handleOpen = useCallback(() => {
    if (!session) return;
    const popup = window.open(session.url, '_blank');
    if (!popup) {
      toast.error('Popup blocked', {
        description: 'Allow popups for this site, then click Open again.',
      });
    }
  }, [session]);

  if (!session) return null;

  // Tone matches the spec: neutral above 2 min, warning ≤2 min, destructive ≤30s.
  const countdownTone =
    secondsLeft <= 30
      ? 'text-destructive'
      : secondsLeft <= 120
        ? 'text-amber-500'
        : 'text-foreground';

  return (
    <Dialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Act As {session.email}</DialogTitle>
          <DialogDescription>
            Open this link in a new tab to start the impersonation session.
            Closing that tab ends the session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="act-as-url"
              className="text-xs font-medium text-muted-foreground"
            >
              Session link
            </label>
            <div className="flex gap-2">
              <Input
                id="act-as-url"
                readOnly
                value={fullUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy link'}
                title={copied ? 'Copied' : 'Copy link'}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p
                className="text-xs text-green-600"
                role="status"
                aria-live="polite"
              >
                Copied to clipboard
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Expires in</span>
            </div>
            <span
              className={cn(
                'font-mono tabular-nums text-sm font-semibold',
                countdownTone,
              )}
              aria-live="polite"
            >
              {formatMmSs(secondsLeft)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleOpen}
            disabled={secondsLeft <= 0}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
