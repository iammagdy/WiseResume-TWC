import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ScanText } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

interface OCRPromptDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress?: { page: number; total: number; status?: string };
  estimatedTime?: string;
}

export function OCRPromptDialog({
  open,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  estimatedTime,
}: OCRPromptDialogProps) {
  const progressPercent = progress 
    ? Math.round((progress.page / progress.total) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isProcessing && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {isProcessing ? (
          // Processing state
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MiniSpinner size={20} />
                Extracting Text with OCR
              </DialogTitle>
              <DialogDescription>
                {progress?.status || 'Processing...'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-3">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Page {progress?.page || 0} of {progress?.total || 0}
              </p>
            </div>
            
            <DialogFooter>
              <p className="text-xs text-muted-foreground w-full text-center">
                Please wait, this may take a moment...
              </p>
            </DialogFooter>
          </>
        ) : (
          // Prompt state
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ScanText className="w-5 h-5 text-secondary" />
                Scanned PDF Detected
              </DialogTitle>
              <DialogDescription>
                This PDF doesn't contain selectable text. We can try OCR (optical character recognition) to extract text from the images.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                <AlertTriangle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Before you continue</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• OCR may take {estimatedTime || '30-60 seconds'}</li>
                    <li>• Results may not be 100% accurate</li>
                    <li>• You'll need to review and correct the extracted text</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onConfirm} className="gap-2">
                <ScanText className="w-4 h-4" />
                Try OCR
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
