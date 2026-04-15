import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCheck, RefreshCw, ExternalLink } from 'lucide-react';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { toast } from 'sonner';

interface BriefShareModalProps {
  brief: CandidateBrief;
  open: boolean;
  onClose: () => void;
  onRenew: () => void;
  isRenewing: boolean;
}

export function BriefShareModal({ brief, open, onClose, onRenew, isRenewing }: BriefShareModalProps) {
  const [copied, setCopied] = useState(false);

  const publicUrl = brief.share_token
    ? `${window.location.origin}/share/brief/${brief.share_token}`
    : null;

  async function handleCopy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Share link copied to clipboard.');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Candidate Brief</DialogTitle>
          <DialogDescription>
            Anyone with this link can view the brief (read-only, no login required).
          </DialogDescription>
        </DialogHeader>

        {publicUrl ? (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="font-mono text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="sm" className="shrink-0" onClick={handleCopy}>
                {copied
                  ? <CheckCheck className="h-4 w-4 text-emerald-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revoke by regenerating the link. Old link immediately becomes invalid.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-red-500"
                onClick={onRenew}
                disabled={isRenewing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRenewing ? 'animate-spin' : ''}`} />
                Revoke & Renew
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Share link is not available for this brief.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
