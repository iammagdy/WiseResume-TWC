import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';

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

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureRequestDialog({ open, onOpenChange }: FeatureRequestDialogProps) {
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSend = useCallback(async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) return;
    setStatus('sending');

    const auth = getAuthFromCache();
    const appVersion = await getAppVersion();

    const payload = {
      feature_title: featureTitle.trim(),
      feature_description: featureDescription.trim(),
      user_id: auth.userId || null,
      user_email: auth.userEmail || 'anonymous',
      user_agent: navigator.userAgent,
      app_version: appVersion,
      route: window.location.pathname,
    };

    try {
      const { error } = await supabase.functions.invoke('send-feature-request', {
        body: payload,
      });
      if (error) throw error;
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        // Reset after close animation
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
      <DialogContent className="max-w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-6 gap-0">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Thank you!
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Your feature request has been received. We'll review it and consider adding it to our roadmap.
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
                disabled={status === 'sending' || !featureTitle.trim() || !featureDescription.trim()}
                className="w-full h-12 active:scale-95 transition-transform"
                size="lg"
              >
                {status === 'sending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
