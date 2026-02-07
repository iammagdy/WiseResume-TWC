import { forwardRef } from 'react';
import { FileText, FileIcon, ImageIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type FileType = 'pdf' | 'word' | 'image';

interface FileTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: FileType) => void;
}

const fileTypes: { type: FileType; icon: React.ElementType; title: string; subtitle: string }[] = [
  {
    type: 'pdf',
    icon: FileText,
    title: 'PDF Document',
    subtitle: 'Best for text-based resumes (.pdf)',
  },
  {
    type: 'word',
    icon: FileIcon,
    title: 'Word Document',
    subtitle: 'Microsoft Word files (.doc, .docx)',
  },
  {
    type: 'image',
    icon: ImageIcon,
    title: 'Photo / Image',
    subtitle: 'Scanned or photo resumes (.jpg, .png)',
  },
];

export const FileTypeSelector = forwardRef<HTMLDivElement, FileTypeSelectorProps>(
  function FileTypeSelector({ open, onClose, onSelectType }, _ref) {
    const handleSelect = (type: FileType) => {
      onSelectType(type);
      onClose();
    };

    return (
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-lg font-display">
              What type of file?
            </SheetTitle>
            <p className="text-sm text-muted-foreground text-left">
              Select your resume format
            </p>
          </SheetHeader>

          <div className="flex flex-col gap-3 pb-4">
            {fileTypes.map(({ type, icon: Icon, title, subtitle }) => (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className="flex items-center gap-4 p-4 min-h-[72px] rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all touch-manipulation text-left"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);
