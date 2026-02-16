import { BookOpen, Mail, MessageCircle, Bug } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsRow } from './SettingsRow';
import { Separator } from '@/components/ui/separator';
import { openExternal } from '@/lib/openExternal';

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <SheetHeader className="mb-4">
          <SheetTitle>Get Help</SheetTitle>
          <SheetDescription>Docs, email support, and community</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col min-h-0 overflow-y-auto rounded-2xl glass-elevated">
          <SettingsRow
            type="navigation"
            label="Documentation & FAQ"
            description="Guides, tips, and frequently asked questions"
            icon={<BookOpen className="w-4 h-4" />}
            onClick={() => openExternal('https://magdysaber.com/wiseresume/docs')}
          />
          <Separator className="bg-border/30" />
          <SettingsRow
            type="navigation"
            label="Email Support"
            description="We typically respond within 24 hours"
            icon={<Mail className="w-4 h-4" />}
            onClick={() => openExternal('mailto:support@magdysaber.com?subject=WiseResume%20Support')}
          />
          <Separator className="bg-border/30" />
          <SettingsRow
            type="navigation"
            label="Feature Requests"
            description="Suggest improvements or vote on ideas"
            icon={<MessageCircle className="w-4 h-4" />}
            onClick={() => openExternal('https://magdysaber.com/wiseresume/feedback')}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
