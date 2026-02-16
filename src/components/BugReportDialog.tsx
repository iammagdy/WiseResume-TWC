import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HeartHandshake, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { onBugReport, type BugReportData } from '@/lib/bugReport';

const APP_VERSION = '1.0.0';
const SESSION_CACHE_KEY = 'sb-auth-session-cache';

function getAuthFromCache() {
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        userId: parsed.user?.id as string | undefined,
        userEmail: parsed.user?.email as string | undefined,
        sessionId: parsed.session?.access_token
          ? (parsed.session.access_token as string).slice(-8)
          : undefined,
      };
    }
  } catch { /* ignore */ }
  return { userId: undefined, userEmail: undefined, sessionId: undefined };
}

export function BugReportDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BugReportData | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    return onBugReport((reportData) => {
      setData(reportData);
      setAdditionalContext('');
      setStatus('idle');
      setOpen(true);
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!data) return;
    setStatus('sending');

    const auth = getAuthFromCache();

    const payload = {
      error_message: data.errorMessage,
      error_stack: data.errorStack || null,
      component_stack: data.componentStack || null,
      route: data.route,
      user_id: auth.userId || null,
      user_email: auth.userEmail || 'anonymous',
      session_id: auth.sessionId || null,
      user_agent: navigator.userAgent,
      app_version: APP_VERSION,
      additional_context: additionalContext.trim() || null,
      timestamp: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.functions.invoke('send-bug-report', {
        body: payload,
      });
      if (error) throw error;
      setStatus('success');
      setTimeout(() => setOpen(false), 2000);
    } catch {
      setStatus('error');
    }
  }, [data, additionalContext]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              Your report has been received. We'll investigate and resolve this shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <HeartHandshake className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Help Us Improve
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                WiseResume is in its early access phase, and your feedback helps us build a better experience.
                Our team will investigate and resolve this within <span className="font-medium text-foreground">24 hours</span>.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 border border-border/50 p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Error detected</p>
                <p className="text-xs text-foreground/70 font-mono line-clamp-2 break-all">
                  {data?.errorMessage || 'Unknown error'}
                </p>
              </div>

              <div>
                <label htmlFor="bug-context" className="text-sm font-medium text-foreground mb-1.5 block">
                  Anything else you'd like to share?
                </label>
                <Textarea
                  id="bug-context"
                  placeholder="What were you doing when this happened? (optional)"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="min-h-[5rem] resize-none text-sm"
                  maxLength={500}
                />
              </div>

              {status === 'error' && (
                <p className="text-xs text-destructive text-center">
                  Failed to send report. Please try again.
                </p>
              )}

              <Button
                onClick={handleSend}
                disabled={status === 'sending'}
                className="w-full h-12 active:scale-95 transition-transform"
                size="lg"
              >
                {status === 'sending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {status === 'sending' ? 'Sending…' : 'Send Report'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
