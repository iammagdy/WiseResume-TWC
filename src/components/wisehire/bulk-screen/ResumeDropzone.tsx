import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResumeDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResumeDropzone({
  files,
  onChange,
  disabled = false,
  maxFiles = 10,
}: ResumeDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const candidates = Array.from(incoming);
      const rejected: string[] = [];
      const accepted = candidates.filter((file) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          rejected.push(`${file.name}: PDF files only`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          rejected.push(`${file.name}: exceeds 10 MB`);
          return false;
        }
        return true;
      });
      const unique = [...files, ...accepted].filter((file, index, all) => (
        all.findIndex((candidate) => (
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified
        )) === index
      ));
      if (unique.length > maxFiles) rejected.push(`Only the first ${maxFiles} PDFs were added`);
      const merged = unique.slice(0, maxFiles);
      setRejectionMessage(rejected.join('. '));
      onChange(merged);
    },
    [files, maxFiles, onChange]
  );

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload resume PDFs"
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-border hover:border-blue-400 hover:bg-muted/30',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag PDFs here or <span className="text-blue-600 dark:text-blue-400">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF only · max {maxFiles} files · 10 MB per file
        </p>
        {files.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
            {files.length} / {maxFiles} file{files.length !== 1 ? 's' : ''} selected
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {rejectionMessage && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {rejectionMessage}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="flex-1 truncate text-foreground">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
