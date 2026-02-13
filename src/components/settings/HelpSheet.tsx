import { BookOpen, Mail, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsRow } from './SettingsRow';
import { Separator } from '@/components/ui/separator';

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
            label="Documentation"
            description="Browse guides and FAQs"
            icon={<BookOpen className="w-4 h-4" />}
            onClick={() => window.open('https://docs.lovable.dev', '_blank')}
          />
          <Separator className="bg-border/30" />
          <SettingsRow
            type="navigation"
            label="Email Support"
            description="contact@magdysaber.com"
            icon={<Mail className="w-4 h-4" />}
            onClick={() => window.open('mailto:contact@magdysaber.com')}
          />
          <Separator className="bg-border/30" />
          <SettingsRow
            type="navigation"
            label="Community"
            description="Join the Discord community"
            icon={<Users className="w-4 h-4" />}
            onClick={() => window.open('https://discord.gg/lovable-dev', '_blank')}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
