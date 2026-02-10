import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
 
 interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
 
 export class ErrorBoundary extends Component<Props, State> {
   public state: State = {
     hasError: false,
     error: null,
     errorInfo: null,
   };
 
   public static getDerivedStateFromError(error: Error): State {
     return { hasError: true, error, errorInfo: null };
   }
 
   public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     console.error('ErrorBoundary caught an error:', error, errorInfo);
     this.setState({ errorInfo });
   }
 
   private handleRetry = () => {
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
 
       return (
         <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-background">
           <div className="w-full max-w-md text-center space-y-6">
             {/* Error icon */}
             <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
               <AlertTriangle className="w-10 h-10 text-destructive" />
             </div>
 
             {/* Error message */}
             <div className="space-y-2">
               <h1 className="text-xl font-display font-semibold text-foreground">
                 Something went wrong
               </h1>
               <p className="text-sm text-muted-foreground">
                 We encountered an unexpected error. This has been logged and we're working on it.
               </p>
             </div>
 
             {/* Error details (collapsed by default) */}
             {this.state.error && (
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
                 Try Again
               </Button>
               <Button
                 onClick={this.handleGoHome}
                 variant="outline"
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