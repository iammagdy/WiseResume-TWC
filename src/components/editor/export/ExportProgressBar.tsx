import { Download, Copy, Mic, WifiOff } from 'lucide-react';
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
}

export function ExportProgressBar({
  exportProgress, isOnline, selectedType, isDownloadable, customFileName,
  fileSuffix, buttonLabel, isExporting, isButtonDisabled, isTextType,
  isInterviewPrep, onFileNameChange, onExport,
}: ExportProgressBarProps) {
  return (
    <>
      {isDownloadable && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{exportProgress.message}</span>
            <span className="font-medium">{Math.round(exportProgress.progress)}%</span>
          </div>
          <Progress value={exportProgress.progress} className="h-2" />
        </div>
      )}

      {!isOnline && (selectedType === 'combined' || selectedType === 'cover-letter') && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're offline. This export requires an internet connection. PDF and DOCX exports still work offline.
          </AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className="w-full h-14 text-lg font-semibold gradient-primary"
        onClick={onExport}
        disabled={isButtonDisabled}
        style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)' }}
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
    </>
  );
}
