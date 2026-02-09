/**
 * Import Resume Sheet
 * 
 * Redesigned import UI with megZone-inspired dark glassmorphism aesthetic.
 * Features inline format pills, AI branding, and privacy trust section.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  FileCode, 
  Image as ImageIcon, 
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FileType = 'pdf' | 'word' | 'image' | 'json' | 'html';

interface FormatPillProps {
  type: FileType;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  isActive: boolean;
  onClick: () => void;
}

function FormatPill({ type, icon, label, sublabel, isActive, onClick }: FormatPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all touch-manipulation min-w-[70px]",
        "active:scale-95",
        isActive 
          ? "border-primary/60 bg-primary/10 text-primary" 
          : "border-border/50 bg-card/30 text-muted-foreground hover:border-primary/30"
      )}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground/80">{sublabel}</span>
    </button>
  );
}

interface ImportUploadSheetProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: File, type: FileType) => void;
  isProcessing?: boolean;
}

export function ImportUploadSheet({ 
  open, 
  onClose, 
  onFileSelect, 
  isProcessing = false 
}: ImportUploadSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<FileType>('pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get accept string based on file type
  const getAcceptString = (type: FileType): string => {
    switch (type) {
      case 'pdf': return '.pdf,application/pdf';
      case 'word': return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'image': return '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
      case 'json': return '.json,application/json';
      case 'html': return '.html,.htm,text/html';
    }
  };

  const handleUploadClick = useCallback(() => {
    if (isProcessing || !fileInputRef.current) return;
    fileInputRef.current.accept = getAcceptString(selectedType);
    fileInputRef.current.click();
  }, [selectedType, isProcessing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    onFileSelect(file, selectedType);
  }, [selectedType, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Detect type from file
      const detectedType = detectFileType(file);
      onFileSelect(file, detectedType);
    }
  }, [onFileSelect]);

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
        className="h-auto max-h-[90vh] flex flex-col rounded-t-3xl border-t border-border/50 bg-gradient-to-b from-card to-background"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
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
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Resume
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your existing CV and let our AI parse, organize, and optimize it for the editor.
          </p>
        </div>

        {/* Drop Zone */}
        <motion.div
          role="button"
          tabIndex={isProcessing ? -1 : 0}
          onClick={handleUploadClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUploadClick();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:border-primary/50 bg-card/30",
            isProcessing && "pointer-events-none opacity-60"
          )}
          animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDragging ? 'drop' : 'upload'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-2"
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
              )}>
                {isDragging ? (
                  <FileText className="w-7 h-7 text-primary" />
                ) : (
                  <Upload className="w-7 h-7 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium">
                {isDragging ? 'Drop to upload' : 'Click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">or drag and drop</p>
            </motion.div>
          </AnimatePresence>
          
          {/* File types hint */}
          <div className="text-xs text-muted-foreground/70 mt-2">
            .JSON, .PDF, .DOCX, .PNG, .HTML
          </div>
        </motion.div>

        {/* Format Pills */}
        <div className="pt-5 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <FormatPill
              type="pdf"
              icon={<FileText className="w-5 h-5" />}
              label="PDF"
              sublabel="Auto Parse"
              isActive={selectedType === 'pdf'}
              onClick={() => setSelectedType('pdf')}
            />
            <FormatPill
              type="word"
              icon={<FileText className="w-5 h-5" />}
              label="DOCX"
              sublabel="Word Docs"
              isActive={selectedType === 'word'}
              onClick={() => setSelectedType('word')}
            />
            <FormatPill
              type="image"
              icon={<ImageIcon className="w-5 h-5" />}
              label="IMG"
              sublabel="OCR Vision"
              isActive={selectedType === 'image'}
              onClick={() => setSelectedType('image')}
            />
            <FormatPill
              type="json"
              icon={<FileCode className="w-5 h-5" />}
              label="JSON"
              sublabel="Direct Data"
              isActive={selectedType === 'json'}
              onClick={() => setSelectedType('json')}
            />
            <FormatPill
              type="html"
              icon={<FileCode className="w-5 h-5" />}
              label="HTML"
              sublabel="Web Export"
              isActive={selectedType === 'html'}
              onClick={() => setSelectedType('html')}
            />
          </div>
        </div>

        {/* Privacy Badge */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 mb-safe">
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

/**
 * Detect file type from MIME type or extension
 */
function detectFileType(file: File): FileType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime === 'application/json' || ext === 'json') return 'json';
  if (mime === 'text/html' || ext === 'html' || ext === 'htm') return 'html';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'image';
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' ||
    ext === 'docx'
  ) return 'word';
  
  return 'pdf'; // Default fallback
}
