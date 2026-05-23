import { Download, Copy, Mic, WifiOff, AlertCircle, RefreshCw, FileEdit } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onRetry?: () => void;
}

export function ExportProgressBar({
  exportProgress, isOnline, selectedType, isDownloadable, customFileName,
  fileSuffix, buttonLabel, isExporting, isButtonDisabled, isTextType,
  isInterviewPrep, onFileNameChange, onExport, onRetry,
}: ExportProgressBarProps) {
  const hasError = !isExporting && !!exportProgress?.warning;

  return (
    <div className="shrink-0 pt-3 pb-safe border-t border-border/50 bg-background space-y-3">

      {/* ── File name row ── */}
      {isDownloadable && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/60">
          <FileEdit className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            value={customFileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="h-auto py-0 border-0 bg-transparent shadow-none text-sm font-medium focus-visible:ring-0 px-0 flex-1"
            placeholder="Resume"
          />
          <span className="text-xs text-muted-foreground/60 shrink-0 font-mono">{fileSuffix}</span>
        </div>
      )}

      {/* ── Progress ── */}
      {exportProgress?.isActive && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{exportProgress.message}</span>
            <span className="font-semibold tabular-nums">{Math.round(exportProgress.progress)}%</span>
          </div>
          <Progress value={exportProgress.progress} className="h-1.5 rounded-full" />
        </div>
      )}

      {/* ── Warning / error ── */}
      {exportProgress?.warning && (
        <Alert className={`py-2.5 ${hasError ? 'border-destructive/40 bg-destructive/5' : ''}`}>
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

      {/* ── Offline warning ── */}
      {!isOnline && (selectedType === 'combined' || selectedType === 'cover-letter') && (
        <Alert className="py-2.5">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're offline. PDF and DOCX exports still work without internet.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Download button ── */}
      <Button
        size="lg"
        className="w-full h-13 min-h-[52px] text-base font-semibold gap-2 shadow-md"
        onClick={onExport}
        disabled={isButtonDisabled}
      >
        {isExporting ? (
          <>
            <MiniSpinner size={18} className="shrink-0" />
            {exportProgress?.isActive ? exportProgress.message : 'Generating…'}
          </>
        ) : (
          <>
            {isInterviewPrep
              ? <Mic className="w-5 h-5 shrink-0" />
              : isTextType
                ? <Copy className="w-5 h-5 shrink-0" />
                : <Download className="w-5 h-5 shrink-0" />}
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}
