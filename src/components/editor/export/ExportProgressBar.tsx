import { Download, Copy, Mic, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ExportProgress } from '@/hooks/useExportProgress';
import type { ExportType } from '@/types/resume';

interface ExportProgressBarProps {
  exportProgress?: ExportProgress;
  isOnline: boolean;
  selectedType: ExportType;
  isDownloadable: boolean;
  customFileName: string;
  fileSuffix: string;
  buttonLabel: string;
  isExporting: boolean;
  isButtonDisabled: boolean;
  isTextType: boolean;
  isInterviewPrep: boolean;
  onFileNameChange: (v: string) => void;
  onExport: () => void;
  /** When provided, shows a retry button on export failure warnings. */
  onRetry?: () => void;
}

export function ExportProgressBar({
  exportProgress, isOnline, selectedType, isDownloadable, customFileName,
  fileSuffix, buttonLabel, isExporting, isButtonDisabled, isTextType,
  isInterviewPrep, onFileNameChange, onExport, onRetry,
}: ExportProgressBarProps) {
  const hasError = !isExporting && !!exportProgress?.warning;
  return (
    <div className="shrink-0 pt-4 pb-safe border-t border-border/60 bg-background">
      {isDownloadable && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted mb-3">
          <Label className="text-sm font-medium shrink-0">File name</Label>
          <Input
            value={customFileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="h-8 text-sm"
            placeholder="Resume"
          />
          <span className="text-xs text-muted-foreground shrink-0">{fileSuffix}</span>
        </div>
      )}

      {exportProgress?.isActive && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{exportProgress.message}</span>
            <span className="font-medium">{Math.round(exportProgress.progress)}%</span>
          </div>
          <Progress value={exportProgress.progress} className="h-2" />
        </div>
      )}

      {exportProgress?.warning && (
        <Alert className={`mb-3 ${hasError ? 'border-destructive/50 bg-destructive/5' : ''}`}>
          <AlertCircle className={`h-4 w-4 ${hasError ? 'text-destructive' : ''}`} />
          <AlertDescription className="text-sm">
            {exportProgress.warning}
            {hasError && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="mt-2 w-full h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </Button>
            )}
            {hasError && !onRetry && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Try exporting as PNG, or use Print → Save as PDF in your browser.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && (selectedType === 'combined' || selectedType === 'cover-letter') && (
        <Alert className="mb-3">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're offline. This export requires an internet connection. PDF and DOCX exports still work offline.
          </AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold gradient-primary btn-shimmer"
        onClick={onExport}
        disabled={isButtonDisabled}
        style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.45)' }}
      >
        {isExporting ? (
          <>
            <MiniSpinner size={20} className="mr-2" />
            {exportProgress?.isActive ? exportProgress.message : 'Generating...'}
          </>
        ) : (
          <>
            {isInterviewPrep ? <Mic className="w-5 h-5 mr-2" /> : isTextType ? <Copy className="w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-2" />}
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}
