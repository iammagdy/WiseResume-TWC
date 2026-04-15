import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Scorecard } from '@/hooks/wisehire/useScorecards';

interface ScorecardShareModalProps {
  open: boolean;
  onClose: () => void;
  scorecard: Scorecard;
  onRevoke: () => void;
  isRevoking: boolean;
}

export function ScorecardShareModal({
  open,
  onClose,
  scorecard,
  onRevoke,
  isRevoking,
}: ScorecardShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const shareUrl = `${window.location.origin}/share/scorecard/${scorecard.share_token}`;

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = () => {
    if (!confirmRevoke) { setConfirmRevoke(true); return; }
    onRevoke();
    setConfirmRevoke(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Scorecard</DialogTitle>
          <DialogDescription>
            Anyone with this link can view the read-only scorecard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!scorecard.share_token_active && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>This share link has been revoked.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(shareUrl, '_blank')}
              aria-label="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t pt-4">
            {confirmRevoke ? (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    The current link will stop working immediately. A new link will be generated.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRevoking ? 'animate-spin' : ''}`} />
                    Confirm Revoke
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Revoke & Generate New Link
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
