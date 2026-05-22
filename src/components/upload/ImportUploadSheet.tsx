/**
 * Import Resume Sheet
 *
 * Single-step upload sheet (Task #26). One sheet, one explicit
 * "Browse device" button that opens the native file picker accepting
 * every supported format in a single call — the user no longer has to
 * pre-select PDF / Word / Image / JSON / HTML before browsing. The
 * picked file's type is detected after selection and routed through
 * the existing per-type parsers in UploadPage.
 *
 * Drag-and-drop on the sheet body remains as a secondary affordance
 * for desktop users.
 */

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FolderOpen,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  detectFileType,
  ALL_ACCEPT_STRING,
  type FileType,
} from '@/lib/detectFileType';

// Re-export so existing consumers that import FileType from this module
// keep working unchanged.
export type { FileType };

interface ImportUploadSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Called when the user picks (or drops) a file. `type` is `null` when
   * the file's extension/MIME doesn't match any supported format — the
   * caller should reject it with the standard unsupported-type toast
   * rather than guess a parser.
   */
  onFileSelect: (file: File, type: FileType | null) => void;
  isProcessing?: boolean;
}

export function ImportUploadSheet({
  open,
  onClose,
  onFileSelect,
  isProcessing = false,
}: ImportUploadSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = useCallback(() => {
    if (isProcessing || !fileInputRef.current) return;
    fileInputRef.current.click();
  }, [isProcessing]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset so re-selecting the same file still fires onChange.
      e.target.value = '';
      onFileSelect(file, detectFileType(file));
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      // Mirror the picker/button guard: ignore drops while a file is
      // still being parsed so a stray drop can't kick off a second
      // upload mid-flight.
      if (isProcessing) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file, detectFileType(file));
      }
    },
    [onFileSelect, isProcessing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[90vh] flex flex-col rounded-t-3xl border-t border-border bg-gradient-to-b from-card to-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Hidden file input — one accept string covers every supported format */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Header with AI Badge */}
        <div className="pb-4">
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary px-3 py-1"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            WISE AI ENGINE
          </Badge>
        </div>

        {/* Title */}
        <div className="pb-5">
          <h2 className="text-h3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Resume
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick your CV from your device — we'll detect the format and parse it for you.
          </p>
        </div>

        {/* Accepted formats — informational only. Highlights when the
            user is dragging a file over the sheet on desktop. */}
        <div
          className={cn(
            'rounded-2xl border bg-card p-4 mb-4 transition-colors',
            isDragging ? 'border-primary bg-primary/5 shadow-soft-md ring-1 ring-primary/20' : 'border-border shadow-soft'
          )}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Accepted formats
          </p>
          <p className="text-sm">
            PDF · Word (.doc / .docx) · Image · JSON · HTML
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to 10MB.{' '}
            {isDragging
              ? 'Drop your file to upload.'
              : 'Drag and drop also works on desktop.'}
          </p>
        </div>

        {/* Single primary CTA — opens the device picker with all types at once */}
        <Button
          type="button"
          size="lg"
          onClick={handleBrowseClick}
          disabled={isProcessing}
          className="w-full h-14 gap-2 mb-4 text-base"
          aria-label="Browse device for resume"
        >
          <FolderOpen className="w-5 h-5" />
          Browse device
        </Button>

        {/* Privacy Badge */}
        <div className="rounded-xl border border-border bg-muted p-4 mb-safe">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Privacy First</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We parse your document securely. No data is stored permanently until you save.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

