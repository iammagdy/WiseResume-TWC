import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, MessageSquareWarning, Send, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureError, getLastSentryEventId } from '@/lib/captureErrorShim';
import { sendFeedback } from '@/lib/sendFeedback';
import {
  buildCrashReportMetadata,
  buildCrashReportSubject,
} from '@/lib/crashReportPayload';
import { getCrashReporterContext } from '@/lib/crashReportContext';

// Module-level auth user id store — populated by AuthContext on each auth
// state change. Avoids hooks (impossible in a class component).
let _currentUserId: string | null = null;

export function setErrorBoundaryUserId(id: string | null): void {
  _currentUserId = id;
}

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
  showTechnicalDetails: boolean;
  autoReportStatus: 'idle' | 'sending' | 'sent' | 'saved' | 'error';
}

const MAX_RETRIES = 2;
const SHOW_TECHNICAL_DETAILS = import.meta.env.DEV;
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
    showTechnicalDetails: SHOW_TECHNICAL_DETAILS,
    autoReportStatus: 'idle',
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

    const isChunkError =
      error.name === 'ChunkLoadError' ||
      /Loading chunk .* failed/.test(error.message) ||
      /Failed to fetch dynamically imported module/.test(error.message);

    if (!isChunkError) {
      this.autoSendCrashReport(error, errorInfo);
    }

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

  private handleCopyError = async () => {
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
    const text = parts.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 2000);
      return;
    } catch {
      // Fallback for non-secure contexts / denied clipboard permission
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (copied) {
        this.setState({ copySuccess: true });
        setTimeout(() => this.setState({ copySuccess: false }), 2000);
      }
    } catch {
      // ignore — user can still use Report Issue
    }
  };

  private autoSendCrashReport = (error: Error, errorInfo: ErrorInfo) => {
    const route = window.location.pathname + window.location.search;
    const dedupeKey = `wr-crash-auto:${error.name}:${error.message.slice(0, 120)}:${route}`;
    const dedupeTtlMs = 30 * 60 * 1000;
    try {
      const raw = localStorage.getItem(dedupeKey) || sessionStorage.getItem(dedupeKey);
      if (raw && Date.now() - Number(raw) < dedupeTtlMs) return;
      localStorage.setItem(dedupeKey, String(Date.now()));
      sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch {
      // storage unavailable — still attempt send once
    }

    this.setState({ autoReportStatus: 'sending' });

    const sentryEventId = getLastSentryEventId();
    const metadata = buildCrashReportMetadata({
      error,
      componentStack: errorInfo.componentStack,
      route,
      source: 'error_boundary_auto',
      reportType: 'auto-crash-report',
      sentryEventId,
    });
    const ctx = getCrashReporterContext();

    void sendFeedback(
      {
        type: 'auto-crash-report',
        email: ctx.userEmail ?? 'anonymous@wiseresume.app',
        name: ctx.userName ?? undefined,
        subject: buildCrashReportSubject(metadata),
        message: metadata.error_message,
        associatedEventId: sentryEventId,
        metadata,
        tags: {
          source: 'error_boundary_auto',
          error_name: error.name,
          priority: metadata.priority,
          screen: metadata.screen,
          plan: metadata.plan_tier ?? 'unknown',
        },
      },
      { skipFallback: true },
    ).then((result) => {
      if (!result.anyDelivered) {
        this.setState({ autoReportStatus: 'error' });
        return;
      }
      const fullySent = result.emailOk && !result.emailSaved;
      this.setState({ autoReportStatus: fullySent ? 'sent' : 'saved' });
    }).catch(() => {
      this.setState({ autoReportStatus: 'error' });
    });
  };

  private handleRetry = async () => {
    const isChunkError = this.state.error?.message != null &&
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
    const error = this.state.error;
    if (!error) return;
    const userNote = this.state.reportContext?.trim();
    const sentryEventId = getLastSentryEventId();
    const metadata = buildCrashReportMetadata({
      error,
      componentStack: this.state.errorInfo?.componentStack,
      route: this.state.errorRoute ?? window.location.pathname,
      userNote,
      source: 'error_boundary_manual',
      reportType: 'auto-crash-report',
      sentryEventId,
    });
    const ctx = getCrashReporterContext();

    const result = await sendFeedback(
      {
        type: 'auto-crash-report',
        email: ctx.userEmail ?? 'anonymous@wiseresume.app',
        name: ctx.userName ?? undefined,
        subject: buildCrashReportSubject(metadata),
        message: metadata.error_message + (userNote ? `\n\nUser note: ${userNote}` : ''),
        associatedEventId: sentryEventId,
        metadata,
        tags: {
          source: 'error_boundary',
          error_name: error.name,
          priority: metadata.priority,
          screen: metadata.screen,
          plan: metadata.plan_tier ?? 'unknown',
        },
      },
      { skipFallback: true },
    );

    if (!result.anyDelivered) {
      console.error('Failed to send crash report on both channels:', result.emailError);
      this.setState({ reportStatus: 'error' });
      return;
    }

    // "sent" only when the email channel actually delivered via Resend;
    // otherwise "saved" (Sentry-only, or saved-to-DB without delivery).
    const fullySent = result.emailOk && !result.emailSaved;
    this.setState({ reportStatus: fullySent ? 'sent' : 'saved' });
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

      const { showTechnicalDetails, autoReportStatus } = this.state;

      return (
        <div className={`${this.props.routeScoped ? 'min-h-[50vh]' : 'min-h-screen min-h-[100dvh]'} relative z-[1] flex flex-col items-center justify-center p-6 bg-background`}>
          <div className="w-full max-w-lg text-center space-y-6">
            {/* Error icon */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isChunkError ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <AlertTriangle className={`w-10 h-10 ${isChunkError ? 'text-warning' : 'text-destructive'}`} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-display font-semibold text-foreground">
                {isChunkError ? 'This page needs a refresh' : 'Something went wrong'}
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isChunkError
                  ? "We couldn't load the latest version of this page. Reloading usually fixes it."
                  : "We're sorry — an unexpected error occurred. Our team has been notified and we're looking into it."}
              </p>
              {autoReportStatus === 'sent' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Report sent to our team.</p>
              )}
              {autoReportStatus === 'saved' && (
                <p className="text-xs text-muted-foreground">Issue logged for our team.</p>
              )}
              {SHOW_TECHNICAL_DETAILS && this.state.error && (
                <p className="text-xs text-destructive font-mono break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              )}
            </div>

            {this.state.error && (SHOW_TECHNICAL_DETAILS || showTechnicalDetails) && (
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
                    <><Copy className="w-3.5 h-3.5 mr-2" />Copy error details</>
                  )}
                </Button>
              </div>
            )}

            {!SHOW_TECHNICAL_DETAILS && this.state.error && !showTechnicalDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => this.setState({ showTechnicalDetails: true })}
              >
                Show technical details
              </Button>
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
                          <MiniSpinner size={16} className="mr-2" />
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
