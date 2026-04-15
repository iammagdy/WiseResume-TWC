import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Send, CheckCircle2 } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';

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
  return cachedAppVersion!; // always set to a string by the try/catch above
}

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureRequestDialog({ open, onOpenChange }: FeatureRequestDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'saved' | 'error'>('idle');

  const handleSend = useCallback(async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) return;
    setStatus('sending');

    const userId = getUserId() || undefined;
    const userEmail = 'authenticated';

    const appVersion = await getAppVersion();

    const payload = {
      type: 'feature',
      email: user?.email || email.trim(),
      subject: `[Feature] ${featureTitle.trim()}`,
      message: featureDescription.trim(),
      metadata: {
        feature_title: featureTitle.trim(),
        user_id: userId || null,
        user_agent: navigator.userAgent,
        app_version: appVersion,
        route: window.location.pathname,
      },
    };

    try {
      const { data: res, error } = await edgeFunctions.functions.invoke('send-contact-email', {
        body: payload,
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      if (res?.saved === true && res?.success === false) {
        setStatus('saved');
        setTimeout(() => {
          onOpenChange(false);
          setTimeout(() => { setStatus('idle'); setFeatureTitle(''); setFeatureDescription(''); }, 300);
        }, 3500);
        return;
      }
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setStatus('idle');
          setFeatureTitle('');
          setFeatureDescription('');
        }, 300);
      }, 2000);
    } catch {
      setStatus('error');
    }
  }, [featureTitle, featureDescription, onOpenChange]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStatus('idle');
        setFeatureTitle('');
        setFeatureDescription('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-6 gap-0 z-[100]">
        {(status === 'success' || status === 'saved') ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Thank you!
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {status === 'saved'
                ? "Your message was saved — we'll follow up via the app."
                : "Your feature request has been received. We'll review it and consider adding it to our roadmap."
              }
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Request a Feature
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Have an idea to make WiseResume better? Describe the feature you'd like to see and we'll review it.
              </p>
            </div>

            <div className="space-y-4">
              {!user && (
                <div>
                  <label htmlFor="feature-email" className="text-sm font-medium text-foreground mb-1.5 block">
                    Your Email (to reply to you)
                  </label>
                  <Input
                    id="feature-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="feature-title" className="text-sm font-medium text-foreground mb-1.5 block">
                  Feature title
                </label>
                <Input
                  id="feature-title"
                  placeholder="e.g. Dark mode for PDF export"
                  value={featureTitle}
                  onChange={(e) => setFeatureTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="feature-desc" className="text-sm font-medium text-foreground mb-1.5 block">
                  Description
                </label>
                <Textarea
                  id="feature-desc"
                  placeholder="Describe the feature, why it would be useful, and how you'd expect it to work..."
                  value={featureDescription}
                  onChange={(e) => setFeatureDescription(e.target.value)}
                  className="min-h-[5rem] resize-none text-sm"
                  maxLength={500}
                />
              </div>

              {status === 'error' && (
                <p className="text-xs text-destructive text-center">
                  Failed to send request. Please try again.
                </p>
              )}

              <Button
                onClick={handleSend}
                disabled={status === 'sending' || !featureTitle.trim() || !featureDescription.trim() || (!user && !email.trim())}
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
