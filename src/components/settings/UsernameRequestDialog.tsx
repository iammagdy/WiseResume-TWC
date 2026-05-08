import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AtSign, Send, CheckCircle2 } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { useAuth } from '@/hooks/useAuth';

interface UsernameRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestedUsername: string;
  checkReason?: string;
}

export function UsernameRequestDialog({
  open,
  onOpenChange,
  requestedUsername,
  checkReason,
}: UsernameRequestDialogProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (open && user) {
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        '';
      if (metaName) setFullName(metaName);
    }
  }, [open, user]);

  const handleSend = useCallback(async () => {
    if (!requestedUsername.trim() || !reason.trim()) return;
    setStatus('sending');

    const userId = user?.id;
    const payload = {
      type: 'username-request',
      email: user?.email || email.trim(),
      subject: `Username Requested: ${requestedUsername}`,
      message: reason.trim(),
      metadata: {
        requested_username: requestedUsername,
        full_name: fullName.trim(),
        reason: reason.trim(),
        check_reason: checkReason || null,
        user_id: userId || null,
        user_agent: navigator.userAgent,
        route: window.location.pathname,
      },
    };

    try {
      const { data: res, error } = await edgeFunctions.invoke('send-contact-email', {
        body: payload,
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      if (res?.saved === true && res?.success === false) {
        setStatus('saved');
      } else {
        setStatus('success');
      }
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setStatus('idle');
          setReason('');
        }, 300);
      }, 2500);
    } catch {
      setStatus('error');
    }
  }, [requestedUsername, reason, fullName, email, user, checkReason, onOpenChange]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStatus('idle');
        setReason('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-6 gap-0 z-[100]">
        {(status === 'success' || status === 'saved') ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Request received
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {status === 'saved'
                ? "We've saved your request. We'll follow up in the app."
                : `We'll review your request for @${requestedUsername} and get back to you by email.`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <AtSign className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Request this username
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-mono font-semibold text-foreground">@{requestedUsername}</span> is{' '}
                {checkReason ? checkReason.toLowerCase() : 'reserved'}. Tell us why you need it and we'll review your request.
              </p>
            </div>

            <div className="space-y-4">
              {!user && (
                <div>
                  <label htmlFor="username-req-email" className="text-sm font-medium text-foreground mb-1.5 block">
                    Your email
                  </label>
                  <Input
                    id="username-req-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="username-req-name" className="text-sm font-medium text-foreground mb-1.5 block">
                  Full name
                </label>
                <Input
                  id="username-req-name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="username-req-reason" className="text-sm font-medium text-foreground mb-1.5 block">
                  Why do you need this username?
                </label>
                <Textarea
                  id="username-req-reason"
                  placeholder="e.g. This matches my professional brand, my GitHub handle, or a company I represent…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[6rem] resize-none text-sm"
                  maxLength={600}
                />
                <p className="text-xs text-muted-foreground mt-1">{reason.length}/600</p>
              </div>

              {status === 'error' && (
                <p className="text-xs text-destructive text-center">
                  Failed to send request. Please try again.
                </p>
              )}

              <Button
                onClick={handleSend}
                disabled={
                  status === 'sending' ||
                  !reason.trim() ||
                  (!user && !email.trim())
                }
                className="w-full h-12 active:scale-95 transition-transform"
                size="lg"
              >
                {status === 'sending' ? (
                  <MiniSpinner size={16} className="mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {status === 'sending' ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
