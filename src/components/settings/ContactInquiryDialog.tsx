import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

const SESSION_CACHE_KEY = 'sb-auth-session-cache';

let cachedAppVersion: string | null = null;
async function getAppVersion(): Promise<string> {
  if (cachedAppVersion) return cachedAppVersion;
  try {
    const res = await fetch('/changelog.json');
    if (!res.ok) throw new Error();
    const data = await res.json();
    cachedAppVersion = data?.[0]?.version || 'unknown';
  } catch {
    cachedAppVersion = 'unknown';
  }
  return cachedAppVersion;
}

function getAuthFromCache() {
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        userId: parsed.user?.id as string | undefined,
        userEmail: parsed.user?.email as string | undefined,
      };
    }
  } catch { /* ignore */ }
  return { userId: undefined, userEmail: undefined };
}

interface ContactInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactInquiryDialog({ open, onOpenChange }: ContactInquiryDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !message.trim()) return;
    setStatus('sending');

    let userId: string | undefined;
    let userEmail = 'anonymous';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email || 'anonymous';
      }
    } catch { /* proceed without auth */ }

    const appVersion = await getAppVersion();

    const payload = {
      subject: subject.trim(),
      message: message.trim(),
      user_id: userId || null,
      user_email: userEmail,
      user_agent: navigator.userAgent,
      app_version: appVersion,
      route: window.location.pathname,
    };

    try {
      const { error } = await edgeFunctions.functions.invoke('send-contact-inquiry', {
        body: payload,
      });
      if (error) throw error;
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setStatus('idle');
          setSubject('');
          setMessage('');
        }, 300);
      }, 3000);
    } catch {
      setStatus('error');
    }
  }, [subject, message, onOpenChange]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStatus('idle');
        setSubject('');
        setMessage('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-6 gap-0">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Inquiry Received
            </DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've received your inquiry. Our team typically responds within <strong className="text-foreground">24–48 hours</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Contact Us
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Have a question or concern? Send us a message and we'll get back to you.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="inquiry-subject" className="text-sm font-medium text-foreground mb-1.5 block">
                  Subject
                </label>
                <Input
                  id="inquiry-subject"
                  placeholder="e.g. Question about my account"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                />
              </div>

              <div>
                <label htmlFor="inquiry-message" className="text-sm font-medium text-foreground mb-1.5 block">
                  Message
                </label>
                <Textarea
                  id="inquiry-message"
                  placeholder="Describe your question or concern in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[5rem] resize-none text-sm"
                  maxLength={1000}
                />
              </div>

              {status === 'error' && (
                <p className="text-xs text-destructive text-center">
                  Failed to send inquiry. Please try again.
                </p>
              )}

              <Button
                onClick={handleSend}
                disabled={status === 'sending' || !subject.trim() || !message.trim()}
                className="w-full h-12 active:scale-95 transition-transform"
                size="lg"
              >
                {status === 'sending' ? (
                  <MiniSpinner size={16} className="mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {status === 'sending' ? 'Sending…' : 'Send Inquiry'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
