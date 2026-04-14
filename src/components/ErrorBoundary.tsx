import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, MessageSquareWarning, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { captureError } from '@/lib/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  countdown: number;
  reportOpen: boolean;
  reportContext: string;
  reportStatus: 'idle' | 'sending' | 'sent' | 'error';
  isRetrying: boolean;
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
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] caught an error:', error, errorInfo);
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
    this.setState({ errorInfo });

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
      
      // Prevent infinite reload loops using sessionStorage
      const now = Date.now();
      const lastRetry = Number(sessionStorage.getItem('wiseresume-chunk-retry-time') || 0);
      const retryCount = Number(sessionStorage.getItem('wiseresume-chunk-retry-count') || 0);
      
      // If we retried more than 3 times in the last 30 seconds, don't auto-reload again
      if (retryCount >= 3 && (now - lastRetry) < 30000) {
        console.warn('[ErrorBoundary] Too many chunk retries. Stopping auto-reload.');
        this.setState({ hasError: true });
        return;
      }

      // Track retry
      sessionStorage.setItem('wiseresume-chunk-retry-time', String(now));
      sessionStorage.setItem('wiseresume-chunk-retry-count', String(retryCount + 1));

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

  private handleRetry = () => {
    const isChunkError = this.state.error?.message &&
      (this.state.error.message.includes('dynamically imported module') ||
       this.state.error.message.includes('Failed to fetch') ||
       this.state.error.message.includes('Loading chunk'));

    if (isChunkError) {
      window.location.reload();
      return;
    }

    this.props.onReset?.();
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

      // Treat saved-but-not-emailed as success — the request is in the database
      if (res?.saved === true || res?.success === true) {
        this.setState({ reportStatus: 'sent' });
        return;
      }
      if (res?.error) throw new Error(res.error);

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
        <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-background">
          <div className="w-full max-w-md text-center space-y-6">
            {/* Error icon */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isChunkError ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <AlertTriangle className={`w-10 h-10 ${isChunkError ? 'text-warning' : 'text-destructive'}`} />
            </div>

            {/* Error message */}
            <div className="space-y-2">
              <h1 className="text-xl font-display font-semibold text-foreground">
                {isChunkError ? 'Connection hiccup' : 'Something went wrong'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isChunkError
                  ? "The page couldn't load properly. This usually fixes itself — just tap Reload."
                  : "We encountered an unexpected error. This has been logged and we're working on it."}
              </p>
            </div>

            {/* Error details (collapsed by default) — hidden for chunk errors */}
            {!isChunkError && this.state.error && (
              <details className="text-left bg-muted rounded-lg p-4">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
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

                {this.state.reportStatus === 'sent' ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <MessageSquareWarning className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Report sent!</p>
                    <p className="text-xs text-muted-foreground">Thank you. We'll look into this.</p>
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
