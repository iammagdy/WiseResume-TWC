import { Edit2, Copy, Download, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { haptics } from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

interface CoverLetterActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onDelete: () => void;
  title?: string;
}

export function CoverLetterActionSheet({
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDownload,
  onDelete,
  title,
}: CoverLetterActionSheetProps) {
  const { t } = useLocale();

  const actions = [
    { icon: Edit2, label: t('common.edit', 'Edit'), onClick: onEdit, destructive: false },
    { icon: Copy, label: t('common.duplicate', 'Duplicate'), onClick: onDuplicate, destructive: false },
    { icon: Download, label: t('app.coverLetters.downloadPdf', 'Download PDF'), onClick: onDownload, destructive: false },
    { icon: Trash2, label: t('common.delete', 'Delete'), onClick: onDelete, destructive: true },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left truncate">{title || t('app.aiStudio.tools.cover-letters.label', 'Cover Letter')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-1">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                haptics.light();
                action.onClick();
                onOpenChange(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors touch-manipulation active:scale-95 min-h-[48px] ${
                action.destructive
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <action.icon className="w-5 h-5" />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
