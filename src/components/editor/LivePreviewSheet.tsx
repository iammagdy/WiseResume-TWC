import { memo } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { LivePreviewPanel } from './LivePreviewPanel';

interface LivePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LivePreviewSheet = memo(function LivePreviewSheet({ open, onOpenChange }: LivePreviewSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95dvh] max-h-[95dvh] flex flex-col">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 my-2" />
        <LivePreviewPanel
          onClose={() => onOpenChange(false)}
          className="flex-1 min-h-0"
        />
      </DrawerContent>
    </Drawer>
  );
});
