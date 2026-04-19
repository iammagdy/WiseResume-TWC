import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureError } from '@/lib/monitoring';

interface Props {
  panelName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetKey: number;
  errorTimestamp: string | null;
  errorRoute: string | null;
  copySuccess: boolean;
}

/**
 * Crash-safety boundary scoped to a single DevKit panel.
 *
 * Unlike the top-level ErrorBoundary in src/components/ErrorBoundary.tsx
 * (which wraps the entire app and offers chunk-recovery / bug-report flows),
 * this boundary keeps the rest of the DevKit shell — sidebar, tab bar,
 * header, lock button — alive when a single panel throws. The admin can
 * switch tabs or hit "Try again" without losing the DevKit session.
 *
 * Resetting on tab switch is automatic: DevToolsPage passes a fresh `key`
 * so each panel gets its own boundary instance per mount.
 */
export class DevKitPanelBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    resetKey: 0,
    errorTimestamp: null,
    errorRoute: null,
    copySuccess: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[DevKitPanelBoundary:${this.props.panelName}]`, error, info);
    this.setState({
      errorInfo: info,
      errorTimestamp: new Date().toISOString(),
      errorRoute: window.location.pathname + window.location.search,
    });
    try {
      captureError(error, {
        type: 'devkit-panel-crash',
        panel: this.props.panelName,
        componentStack: info.componentStack,
      });
    } catch {
      // monitoring should never break the boundary itself
    }
  }

  handleReset = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: s.resetKey + 1,
      errorTimestamp: null,
      errorRoute: null,
      copySuccess: false,
    }));
  };

  handleCopy = () => {
    const { error, errorInfo, errorTimestamp, errorRoute } = this.state;
    const parts = [
      `Panel: ${this.props.panelName}`,
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

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    const { error, errorInfo, errorTimestamp, errorRoute } = this.state;

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-2xl mx-auto my-8 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg p-2 bg-destructive/10 text-destructive shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-destructive">
              The {this.props.panelName} panel hit an error
            </p>
            <p className="text-xs text-muted-foreground">
              The rest of the DevKit is still working — switch tabs or retry below.
            </p>
            {(errorRoute || errorTimestamp) && (
              <p className="text-[11px] font-mono text-muted-foreground">
                {errorRoute && <span>Route: {errorRoute}</span>}
                {errorRoute && errorTimestamp && <span> · </span>}
                {errorTimestamp && <span>{errorTimestamp}</span>}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-background/60 rounded-md p-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Error</p>
              <pre className="text-[11px] font-mono text-destructive whitespace-pre-wrap break-all">
                {error?.name ?? 'Error'}: {error?.message ?? 'Unknown error'}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stack Trace</p>
              <pre className="text-[11px] font-mono text-destructive/80 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {error?.stack ?? '(no stack)'}
              </pre>
            </div>
            {errorInfo?.componentStack && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Component Stack</p>
                <pre className="text-[11px] font-mono text-muted-foreground overflow-auto max-h-36 whitespace-pre-wrap break-all">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleCopy}
            className="flex items-center gap-2"
          >
            {this.state.copySuccess ? (
              <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" />Copy full error</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
