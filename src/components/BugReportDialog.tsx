import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HeartHandshake, Send, CheckCircle2, MapPin, Info, Wrench, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import {
  onBugReport,
  detectScreen,
  categorizeError,
  type BugReportData,
  type ErrorCategoryInfo,
} from '@/lib/bugReport';
import { activityTracker } from '@/lib/activityTracker';

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

// ── Detected Context Card ──────────────────────────────────────────────────

function DetectedContextCard({
  screenLabel,
  categoryInfo,
  action,
  activeFeature,
  recentErrorMessage,
}: {
  screenLabel: string;
  categoryInfo: ErrorCategoryInfo;
  action?: string;
  activeFeature?: string | null;
  recentErrorMessage?: string | null;
}) {
  const CategoryIcon = categoryInfo.icon;
  return (
    <div className="rounded-2xl bg-muted/50 border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground">{screenLabel}</span>
      </div>
      {activeFeature && (
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground">{activeFeature}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <CategoryIcon className="w-3.5 h-3.5 text-[hsl(var(--warning,45_93%_47%))] shrink-0" />
        <span className="text-xs text-muted-foreground">{categoryInfo.label}</span>
      </div>
      {recentErrorMessage && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="text-xs text-destructive/80 truncate">{recentErrorMessage.slice(0, 100)}</span>
        </div>
      )}
      {action && !activeFeature && (
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground italic truncate">{action}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────

export function BugReportDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BugReportData | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reportMode, setReportMode] = useState<'detected' | 'custom'>('detected');

  useEffect(() => {
    return onBugReport((reportData) => {
      setData(reportData);
      setAdditionalContext('');
      setStatus('idle');
      // If there's a detected error, default to 'detected' mode; otherwise 'custom'
      const hasDetectedError = reportData.detectedContext?.recentErrors?.length;
      setReportMode(hasDetectedError ? 'detected' : 'custom');
      setOpen(true);
    });
  }, []);

  const activeFeature = data?.detectedContext?.activeFeature || data?.action || null;
  const recentError = data?.detectedContext?.recentErrors?.[0] || null;
  const screenLabel = data ? detectScreen(data.route) : 'General';
  const categoryInfo = data ? categorizeError(data.errorMessage, activeFeature) : categorizeError('');
  const isShake = data?.source === 'shake';

  // Dynamic header
  const dialogTitle = recentError
    ? 'We Noticed an Issue'
    : activeFeature
      ? `Report Issue with ${activeFeature}`
      : isShake
        ? 'Shake Detected'
        : 'What Went Wrong?';

  const dialogDescription = recentError
    ? <>We've captured the details automatically. Our team will investigate within{' '}<span className="font-medium text-foreground">24 hours</span>.</>
    : activeFeature
      ? <>Describe what went wrong with <span className="font-medium text-foreground">{activeFeature}</span>. We'll look into it within{' '}<span className="font-medium text-foreground">24 hours</span>.</>
      : isShake
        ? <>You shook your device to report a problem. Describe what went wrong and we'll look into it within{' '}<span className="font-medium text-foreground">24 hours</span>.</>
        : <>Tell us what happened and our team will investigate within{' '}<span className="font-medium text-foreground">24 hours</span>.</>;

  const handleSend = useCallback(async () => {
    if (!data) return;
    setStatus('sending');

    // Get auth from the same client the app uses
    let userId: string | undefined;
    let userEmail = 'anonymous';
    let sessionId: string | undefined;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      userId = session?.user?.id;
      userEmail = session?.user?.email || 'anonymous';
      sessionId = session?.access_token?.slice(-8);
    } catch { /* proceed without auth */ }

    const appVersion = await getAppVersion();

    const effectiveMessage = reportMode === 'detected' && recentError
      ? recentError.message
      : data.errorMessage;

    const payload = {
      error_message: effectiveMessage,
      error_stack: (reportMode === 'detected' && recentError?.stack) || data.errorStack || null,
      component_stack: data.componentStack || null,
      route: data.route,
      selected_screen: screenLabel,
      error_category: categoryInfo.category,
      action: data.action || null,
      active_feature: activeFeature || null,
      recent_errors: data.detectedContext?.recentErrors || null,
      user_id: userId || null,
      user_email: userEmail,
      session_id: sessionId || null,
      user_agent: navigator.userAgent,
      app_version: appVersion,
      additional_context: additionalContext.trim() || null,
      timestamp: new Date().toISOString(),
    };

    try {
      // Primary path: edge function
      const { error } = await edgeFunctions.functions.invoke('send-bug-report', {
        body: payload,
      });
      if (error) throw error;
      activityTracker.clearErrors();
      setStatus('success');
      setTimeout(() => setOpen(false), 2000);
    } catch {
      // Fallback: direct DB insert (works even if function deployment drifts)
      if (userId) {
        try {
          const { error: dbErr } = await supabase.from('bug_reports').insert({
            user_id: userId,
            user_email: userEmail,
            error_message: effectiveMessage.slice(0, 2000),
            error_stack: payload.error_stack?.slice(0, 5000) || null,
            component_stack: payload.component_stack?.slice(0, 5000) || null,
            route: payload.route || null,
            session_id: payload.session_id || null,
            user_agent: payload.user_agent?.slice(0, 500) || null,
            additional_context: payload.additional_context?.slice(0, 1000) || null,
            app_version: appVersion,
            active_feature: payload.active_feature || null,
            recent_errors: payload.recent_errors || null,
          });
          if (dbErr) throw dbErr;
          activityTracker.clearErrors();
          setStatus('success');
          setTimeout(() => setOpen(false), 2000);
          return;
        } catch { /* both paths failed */ }
      }
      setStatus('error');
    }
  }, [data, additionalContext, screenLabel, categoryInfo.category, activeFeature, recentError, reportMode]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="
        max-w-[min(90vw,24rem)] 
        max-h-[90vh] 
        overflow-y-auto 
        rounded-2xl 
        p-6 
        gap-0
        fixed
        top-[50%]
        left-[50%]
        -translate-x-1/2
        -translate-y-1/2
        z-[100]
        m-0
      "
      style={{
        transform: 'translate(-50%, -50%)',
      }}
      >
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
                {dialogTitle}
              </DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dialogDescription}
              </p>
            </div>

            <div className="space-y-4">
              <DetectedContextCard
                screenLabel={screenLabel}
                categoryInfo={categoryInfo}
                action={data?.action}
                activeFeature={activeFeature}
                recentErrorMessage={recentError?.message}
              />

              {/* Report mode toggle - only show when there's a detected error */}
              {recentError && (
                <button
                  type="button"
                  onClick={() => setReportMode(reportMode === 'detected' ? 'custom' : 'detected')}
                  className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {reportMode === 'detected' ? (
                    <ToggleRight className="w-4 h-4 text-primary" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                  {reportMode === 'detected' ? 'Reporting detected issue' : 'Reporting something else'}
                </button>
              )}

              {isShake && !recentError && (
                <p className="text-xs text-muted-foreground/70 text-center italic">
                  Triggered by device shake gesture
                </p>
              )}

              <div>
                <label htmlFor="bug-context" className="text-sm font-medium text-foreground mb-1.5 block">
                  {reportMode === 'detected' && recentError
                    ? 'Anything else you\'d like to share?'
                    : 'Describe what went wrong'}
                </label>
                <Textarea
                  id="bug-context"
                  placeholder={reportMode === 'detected' && recentError
                    ? 'What were you doing when this happened? (optional)'
                    : 'Describe the issue you encountered…'}
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
                  <MiniSpinner size={16} className="mr-2" />
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

export default BugReportDialog;
