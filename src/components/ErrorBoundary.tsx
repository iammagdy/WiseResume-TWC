import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, MessageSquareWarning, Send, X, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { captureError } from '@/lib/captureErrorShim';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void | Promise<void>;
  routeScoped?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  countdown: number;
  reportOpen: boolean;
  reportContext: string;
  reportStatus: 'idle' | 'sending' | 'sent' | 'saved' | 'error';
  isRetrying: boolean;
  errorTimestamp: string | null;
  errorRoute: string | null;
  copySuccess: boolean;
}

const MAX_RETRIES = 2;
const TRANSIENT_ERRORS = [
  'Failed to fetch',
  'dynamically imported module',
  'Loading chunk',
  'Load failed'
];

export class ErrorBoundary extends Component<Props, State> {
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: number | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
    countdown: 0,
    reportOpen: false,
    reportContext: '',
    reportStatus: 'idle',
    isRetrying: false,
    errorTimestamp: null,
    errorRoute: null,
    copySuccess: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // Log message + stack separately: Error instances serialise to {} in
    // JSON-based log collectors because their properties are non-enumerable.
    const detail = error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
      : String(error);
    console.error('[ErrorBoundary] caught an error:', detail, errorInfo);
  }

  private async clearSiteData() {
    console.log('[ErrorBoundary] Aggressively clearing site data to resolve chunk error...');
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear all named caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }

      console.log('[ErrorBoundary] Site data cleared. Reloading...');
    } catch (err) {
      console.error('[ErrorBoundary] Failed to clear site data:', err);
    } finally {
      window.location.reload();
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.state.isRetrying) return;

    this.logError(error, errorInfo);
    this.setState({
      errorInfo,
      errorTimestamp: new Date().toISOString(),
      errorRoute: window.location.pathname + window.location.search,
    });

    captureError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      source: 'ErrorBoundary.componentDidCatch',
    });

    // Specific check for ChunkLoadError (Vite/Webpack)
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      /Loading chunk .* failed/.test(error.message) ||
      /Failed to fetch dynamically imported module/.test(error.message);

    if (isChunkError) {
      console.error('[ErrorBoundary] Chunk loading failed. This is likely a stale PWA/deployment issue.');
      
      // Prevent infinite reload loops using sessionStorage. Wrapped in
      // try/catch because some privacy modes (Safari Private, storage-disabled
      // enterprise policies) throw on every storage access — without this,
      // the error handler itself would throw and the user would be left with
      // a blank tab. On storage failure we proceed without retry bookkeeping
      // (the visible fallback UI + manual Reload button still renders below).
      const now = Date.now();
      let lastRetry = 0;
      let retryCount = 0;
      try {
        lastRetry = Number(sessionStorage.getItem('wiseresume-chunk-retry-time') || 0);
        retryCount = Number(sessionStorage.getItem('wiseresume-chunk-retry-count') || 0);
      } catch {
        /* storage unavailable — skip loop guard, render fallback UI */
      }

      // If we retried more than 3 times in the last 30 seconds, don't auto-reload again
      if (retryCount >= 3 && (now - lastRetry) < 30000) {
        console.warn('[ErrorBoundary] Too many chunk retries. Stopping auto-reload.');
        this.setState({ hasError: true });
        return;
      }

      // Track retry
      try {
        sessionStorage.setItem('wiseresume-chunk-retry-time', String(now));
        sessionStorage.setItem('wiseresume-chunk-retry-count', String(retryCount + 1));
      } catch {
        /* storage unavailable — proceed without bookkeeping */
      }

      this.setState({ isRetrying: true });
      
      // Show countdown then clear and reload
      this.startCountdown();
      setTimeout(() => this.clearSiteData(), 5000);
      return;
    }

    // Generic retry logic for other transient errors
    const isTransient = TRANSIENT_ERRORS.some(msg => error.message?.includes(msg));
    if (isTransient && this.state.retryCount < MAX_RETRIES) {
      this.setState({ isRetrying: true, retryCount: this.state.retryCount + 1 });
      this.retryTimer = window.setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  private handleCopyError = () => {
    const { error, errorInfo, errorTimestamp, errorRoute } = this.state;
    const parts = [
      `Error: ${error?.name ?? 'Error'}: ${error?.message ?? ''}`,
      `Timestamp: ${errorTimestamp ?? new Date().toISOString()}`,
      `Route: ${errorRoute ?? window.location.pathname}`,
      '',
      '--- Stack ---',
      error?.stack ?? '(no stack)',
      '',
      '--- Component Stack ---',
      errorInfo?.componentStack ?? '(no component stack)',
    ];
    navigator.clipboard.writeText(parts.join('\n')).then(() => {
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 2000);
    }).catch(() => undefined);
  };

  private handleRetry = async () => {
    const isChunkError = this.state.error?.message &&
      (this.state.error.message.includes('dynamically imported module') ||
       this.state.error.message.includes('Failed to fetch') ||
       this.state.error.message.includes('Loading chunk'));

    if (isChunkError) {
      window.location.reload();
      return;
    }

    await this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private startCountdown = () => {
    this.setState({ countdown: 5 });
    this.countdownTimer = setInterval(() => {
      this.setState((prev) => {
        const next = prev.countdown - 1;
        if (next <= 0) {
          if (this.countdownTimer) clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          window.location.reload();
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: next };
      });
    }, 1000);
  };

  public componentWillUnmount() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private handleSendReport = async () => {
    this.setState({ reportStatus: 'sending' });
    try {
      const userId = getUserId() || 'anonymous';
      const errorMsg = this.state.error?.message || 'Unknown error';
      const userNote = this.state.reportContext?.trim();

      const payload = {
        type: 'auto-crash-report',
        email: 'crash@wiseresume.app',
        subject: `Auto Crash: ${errorMsg.slice(0, 80)}`,
        message: errorMsg + (userNote ? `\n\nUser note: ${userNote}` : ''),
        metadata: {
          error_stack: this.state.error?.stack?.slice(0, 4000) ?? null,
          component_stack: this.state.errorInfo?.componentStack?.slice(0, 4000) ?? null,
          route: window.location.pathname,
          user_agent: navigator.userAgent,
          user_id: userId,
          app_version: 'unknown',
        },
      };

      const { data: res, error } = await supabase.functions.invoke('send-contact-email', { body: payload });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);

      if (res?.success === true) {
        this.setState({ reportStatus: 'sent' });
        return;
      }
      if (res?.saved === true) {
        this.setState({ reportStatus: 'saved' });
        return;
      }

      this.setState({ reportStatus: 'sent' });
    } catch (err) {
      console.error('Failed to send crash report:', err);
      // Fallback: use submit-contact-request edge function (service role insert)
      try {
        await supabase.functions.invoke('submit-contact-request', {
          body: {
            type: 'auto-crash-report',
            email: 'crash@wiseresume.app',
            subject: `Auto Crash: ${this.state.error?.message?.slice(0, 80) ?? 'Unknown'}`,
            message: this.state.error?.message || 'Unknown error',
            metadata: {
              error_stack: this.state.error?.stack?.slice(0, 4000) ?? null,
              component_stack: this.state.errorInfo?.componentStack?.slice(0, 4000) ?? null,
              route: window.location.pathname,
              user_agent: navigator.userAgent,
              user_id: getUserId() ?? null,
            },
          },
        });
        this.setState({ reportStatus: 'sent' });
      } catch {
        this.setState({ reportStatus: 'error' });
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.error?.message != null &&
        (this.state.error.message.includes('dynamically imported module') ||
         this.state.error.message.includes('Failed to fetch') ||
         this.state.error.message.includes('Loading chunk'));

      return (
        <div className={`${this.props.routeScoped ? 'min-h-[50vh]' : 'min-h-screen min-h-[100dvh]'} relative z-[1] flex flex-col items-center justify-center p-6 bg-background`}>
          <div className="w-full max-w-2xl text-center space-y-6">
            {/* Error icon */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isChunkError ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <AlertTriangle className={`w-10 h-10 ${isChunkError ? 'text-warning' : 'text-destructive'}`} />
            </div>

            {/* Error headline — always shows error name + message */}
            <div className="space-y-2">
              <h1 className="text-xl font-display font-semibold text-foreground break-all font-mono text-destructive">
                {this.state.error?.name ?? 'Error'}: {this.state.error?.message ?? 'Unknown error'}
              </h1>
              {isChunkError && (
                <p className="text-sm text-muted-foreground">
                  The page couldn&apos;t load properly. This usually fixes itself — just tap Reload.
                </p>
              )}
              {(this.state.errorRoute || this.state.errorTimestamp) && (
                <p className="text-xs text-muted-foreground font-mono">
                  {this.state.errorRoute && <span>Route: {this.state.errorRoute}</span>}
                  {this.state.errorRoute && this.state.errorTimestamp && <span> · </span>}
                  {this.state.errorTimestamp && <span>{this.state.errorTimestamp}</span>}
                </p>
              )}
            </div>

            {/* Full error details — always expanded */}
            {this.state.error && (
              <div className="text-left space-y-3">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stack Trace</p>
                    <pre className="text-xs text-destructive overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                      {this.state.error.stack ?? this.state.error.message}
                    </pre>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Component Stack</p>
                      <pre className="text-xs text-muted-foreground overflow-auto max-h-36 font-mono whitespace-pre-wrap break-all">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
                <Button
                  onClick={this.handleCopyError}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {this.state.copySuccess ? (
                    <><Check className="w-3.5 h-3.5 mr-2 text-green-500" />Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-2" />Copy full error</>
                  )}
                </Button>
              </div>
            )}

            {/* Auto-retry countdown for chunk errors */}
            {isChunkError && this.state.countdown > 0 && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Retrying in {this.state.countdown}…
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleRetry}
                className="w-full h-12"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isChunkError ? 'Reload' : 'Try Again'}
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full h-12"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              {!isChunkError && (
                <Button
                  onClick={() => this.setState({ reportOpen: true, reportStatus: 'idle', reportContext: '' })}
                  variant="outline"
                  className="w-full h-12 min-h-[48px] active:scale-95 transition-transform touch-manipulation"
                  size="lg"
                >
                  <MessageSquareWarning className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              )}
              <Button
                onClick={this.handleGoHome}
                variant={isChunkError ? 'outline' : 'ghost'}
                className="w-full h-12"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>

          {/* Inline Bug Report Dialog */}
          {this.state.reportOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => this.setState({ reportOpen: false })} />
              <div className="relative w-full max-w-md bg-background border border-border rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Report Issue</h2>
                  <button
                    onClick={() => this.setState({ reportOpen: false })}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(this.state.reportStatus === 'sent' || this.state.reportStatus === 'saved') ? (
                  <div className="text-center py-6 space-y-2">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${this.state.reportStatus === 'sent' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                      <MessageSquareWarning className={`w-6 h-6 ${this.state.reportStatus === 'sent' ? 'text-green-400' : 'text-amber-400'}`} />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {this.state.reportStatus === 'sent' ? 'Report sent!' : 'Report saved'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {this.state.reportStatus === 'sent'
                        ? "We received your report. We'll look into this."
                        : 'Your report was saved. Email delivery is pending — our team will still review it.'}
                    </p>
                    <Button
                      onClick={() => this.setState({ reportOpen: false })}
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Error detected:</p>
                      <p className="text-xs font-mono text-destructive truncate">
                        {this.state.error?.message || 'Unknown error'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm text-muted-foreground">
                        What were you doing? (optional)
                      </label>
                      <textarea
                        value={this.state.reportContext}
                        onChange={(e) => this.setState({ reportContext: e.target.value })}
                        placeholder="e.g. I was trying to sign up..."
                        className="w-full h-20 bg-muted border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => this.setState({ reportOpen: false })}
                        variant="ghost"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={this.handleSendReport}
                        disabled={this.state.reportStatus === 'sending'}
                        className="flex-1"
                      >
                        {this.state.reportStatus === 'sending' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {this.state.reportStatus === 'sending' ? 'Sending…' : 'Send Report'}
                      </Button>
                    </div>

                    {this.state.reportStatus === 'error' && (
                      <p className="text-xs text-destructive text-center">
                        Failed to send. Please email contact@thewise.cloud directly.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
