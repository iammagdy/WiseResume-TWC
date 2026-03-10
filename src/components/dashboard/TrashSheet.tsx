import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Trash2 } from 'lucide-react';

interface TrashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashSheet({ open, onOpenChange }: TrashSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
            Delete
          </SheetTitle>
          <SheetDescription>
            Deleted resumes are permanently removed and cannot be recovered.
          </SheetDescription>
        </SheetHeader>

        <div className="text-center py-12">
          <Trash2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">
            Deletions are permanent. There is no trash.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
