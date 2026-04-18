import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureError } from '@/lib/monitoring';

interface Props {
  panelName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
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
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log so production monitoring still picks it up; keep DevKit shell alive.
    // eslint-disable-next-line no-console
    console.error(`[DevKitPanelBoundary:${this.props.panelName}]`, error, info);
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
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    const message = this.state.error?.message || 'Unknown error';

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-xl mx-auto my-8 space-y-4">
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
            <pre className="mt-3 text-[11px] font-mono text-destructive/80 bg-background/60 rounded-md p-2 max-h-32 overflow-auto whitespace-pre-wrap break-all">
              {message}
            </pre>
          </div>
        </div>
        <div className="flex justify-end">
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
