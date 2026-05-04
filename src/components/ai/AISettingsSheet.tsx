import { Zap, Shield, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface AISettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsSheet({ open, onOpenChange }: AISettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            AI Engine
          </SheetTitle>
          <SheetDescription className="text-left">
            All AI features run on WiseResume's managed infrastructure.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium">WiseResume AI Pool</span>
        </div>

        <div className="rounded-2xl bg-card border border-border px-4 py-4 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Managed AI — no setup needed</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                WiseResume provides access to best-in-class AI models. Your requests are processed
                securely through our infrastructure — no API key required.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40">
          <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your resume data is used only to generate your requested output and is never stored or used for model training.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
