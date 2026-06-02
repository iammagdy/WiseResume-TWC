import { useState, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Send } from 'lucide-react';
import { useAIDraftOutreach, useSendOutreach } from '@/hooks/wisehire/useOutreach';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  roleTitle?: string;
}

export function OutreachDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  candidateEmail,
  roleTitle,
}: Props) {
  const [toEmail, setToEmail] = useState(candidateEmail ?? '');
  const [subject, setSubject] = useState(roleTitle ? `Opportunity: ${roleTitle}` : 'Exciting Opportunity');
  const [body, setBody] = useState('');

  const aiDraft = useAIDraftOutreach();
  const sendEmail = useSendOutreach();

  useEffect(() => {
    if (open) {
      setToEmail(candidateEmail ?? '');
      setSubject(roleTitle ? `Opportunity: ${roleTitle}` : 'Exciting Opportunity');
      setBody('');
    }
  }, [open, candidateEmail, roleTitle]);

  function handleAIDraft() {
    aiDraft.mutate(
      { candidate_id: candidateId, candidate_name: candidateName, role_title: roleTitle },
      { onSuccess: (data) => setBody(data.draft) },
    );
  }

  function handleSend() {
    if (!toEmail.trim()) { toast.error('Recipient email is required'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Email body is required'); return; }

    sendEmail.mutate(
      { candidate_id: candidateId, to_email: toEmail.trim(), subject: subject.trim(), body: body.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const isBusy = aiDraft.isPending || sendEmail.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Outreach to {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="candidate@email.com"
              type="email"
              disabled={isBusy}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isBusy}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Message</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-purple-600 dark:text-purple-400 gap-1"
                onClick={handleAIDraft}
                disabled={isBusy}
              >
                {aiDraft.isPending
                  ? <MiniSpinner size={12} />
                  : <Sparkles className="h-3 w-3" />}
                AI Draft
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message or click AI Draft to generate one…"
              rows={7}
              disabled={isBusy}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">
              Sent via Resend · logged to candidate record
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isBusy}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isBusy || !toEmail.trim() || !subject.trim() || !body.trim()}
                className="gap-1.5"
              >
                {sendEmail.isPending
                  ? <MiniSpinner size={14} />
                  : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
