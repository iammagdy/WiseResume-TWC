import { memo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const shortcuts = [
  { keys: `${mod} + S`, action: 'Save resume' },
  { keys: `${mod} + P`, action: 'Preview resume' },
  { keys: `${mod} + D`, action: 'Download / Export' },
  { keys: `${mod} + Z`, action: 'Undo' },
  { keys: `${mod} + Shift + Z`, action: 'Redo' },
  { keys: `${mod} + Y`, action: 'Redo (alt)' },
  { keys: 'N', action: 'New resume (dashboard)' },
  { keys: 'I', action: 'Import PDF (dashboard)' },
];

export const KeyboardShortcutsSheet = memo(function KeyboardShortcutsSheet({
  open,
  onOpenChange,
}: KeyboardShortcutsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Keyboard Shortcuts
          </SheetTitle>
          <SheetDescription>Quick actions available throughout the app</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto space-y-1 pb-safe">
          {shortcuts.map(({ keys, action }) => (
            <div
              key={keys}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/30 min-h-[44px]"
            >
              <span className="text-sm text-foreground">{action}</span>
              <kbd className="text-xs font-mono px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
});
