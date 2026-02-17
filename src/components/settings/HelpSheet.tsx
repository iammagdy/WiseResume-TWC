import { useState } from 'react';
import { BookOpen, Keyboard, MessageCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsRow } from './SettingsRow';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FeatureRequestDialog } from './FeatureRequestDialog';
import { KeyboardShortcutsSheet } from '@/components/editor/KeyboardShortcutsSheet';

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[60vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Get Help</SheetTitle>
            <SheetDescription>Docs, community, and feature requests</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col min-h-0 overflow-y-auto rounded-2xl glass-elevated">
            <SettingsRow
              type="navigation"
              label="Documentation & FAQ"
              description="Guides, tips, and frequently asked questions"
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => toast.info('Coming Soon', { description: 'Documentation & FAQ is under construction.' })}
            />
            <Separator className="bg-border/30" />
            <SettingsRow
              type="navigation"
              label="Keyboard Shortcuts"
              description="View all available keyboard shortcuts"
              icon={<Keyboard className="w-4 h-4" />}
              onClick={() => setShortcutsOpen(true)}
            />
            <Separator className="bg-border/30" />
            <SettingsRow
              type="navigation"
              label="Feature Requests"
              description="Suggest improvements or new features"
              icon={<MessageCircle className="w-4 h-4" />}
              onClick={() => setFeatureDialogOpen(true)}
            />
          </div>
        </SheetContent>
      </Sheet>
      <KeyboardShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <FeatureRequestDialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen} />
    </>
  );
}
