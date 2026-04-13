import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'wr-ai-privacy-accepted';

export function hasAcceptedAIPrivacy(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markAIPrivacyAccepted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

interface AIPrivacyDisclosureProps {
  open: boolean;
  providerName: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function AIPrivacyDisclosure({
  open,
  providerName,
  onAccept,
  onDismiss,
}: AIPrivacyDisclosureProps) {
  const handleAccept = () => {
    markAIPrivacyAccepted();
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent hideCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <DialogTitle>AI Data Processing Notice</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-3 pt-1">
              <p>
                To provide AI-powered features, your resume content — including personal
                details such as your name, contact information, and work history — will
                be sent to <strong className="text-foreground">{providerName}</strong> for
                processing.
              </p>
              <p>
                Please review {providerName}&apos;s privacy policy before continuing.
                You can also enable <em>Redact personal info before AI processing</em> in
                AI &amp; Voice settings to replace identifying details with placeholders.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="ghost" onClick={onDismiss} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleAccept} className="w-full sm:w-auto">
            I understand, continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
