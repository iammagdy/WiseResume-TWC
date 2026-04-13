import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AISheetErrorBoundaryProps {
  children: React.ReactNode;
  onClose?: () => void;
}

interface AISheetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AISheetErrorBoundary extends React.Component<AISheetErrorBoundaryProps, AISheetErrorBoundaryState> {
  constructor(props: AISheetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AISheetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AISheetErrorBoundary] Caught error:', error, info);
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Something went wrong in this tool</p>
            <p className="text-xs text-muted-foreground mt-1">Close and reopen to try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleClose}>
            Close
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
