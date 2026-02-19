import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerBugReport } from '@/lib/bugReport';
 
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
}
 
 export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
 
    public static getDerivedStateFromError(error: Error): Partial<State> {
      return { hasError: true, error, errorInfo: null };
    }
 
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      this.setState({ errorInfo });

      // Auto-retry once for transient network/chunk errors
      if (this.state.retryCount < 1) {
        const msg = error?.message || '';
        const isTransient = msg.includes('Failed to fetch') ||
          msg.includes('dynamically imported module') ||
          msg.includes('Loading chunk') ||
          msg.includes('Load failed');
        if (isTransient) {
          setTimeout(() => {
            this.setState({ hasError: false, error: null, errorInfo: null, retryCount: this.state.retryCount + 1 });
          }, 1500);
        }
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
              <details className="text-left bg-muted/50 rounded-lg p-4">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
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
               {!isChunkError && (
                 <Button
                   onClick={() => {
                     triggerBugReport({
                       errorMessage: this.state.error?.message || 'Unknown error',
                       errorStack: this.state.error?.stack,
                       componentStack: this.state.errorInfo?.componentStack || undefined,
                       route: window.location.pathname,
                     });
                   }}
                   variant="outline"
                   className="w-full h-12 active:scale-95 transition-transform"
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
        </div>
      );
    }

    return this.props.children;
   }
 }