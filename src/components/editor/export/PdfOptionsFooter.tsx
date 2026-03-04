import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface PdfOptionsFooterProps {
  visible: boolean;
  showPageNumbers: boolean;
  showBranding: boolean;
  onPageNumbersChange: (v: boolean) => void;
  onBrandingChange: (v: boolean) => void;
}

export function PdfOptionsFooter({ visible, showPageNumbers, showBranding, onPageNumbersChange, onBrandingChange }: PdfOptionsFooterProps) {
  return (
    <div
      className={cn(
        'space-y-3 shrink-0 transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
        <div className="space-y-0.5">
          <Label htmlFor="page-numbers" className="font-medium">Page Numbers</Label>
          <p className="text-xs text-muted-foreground">Show "Page X of Y" in footer</p>
        </div>
        <Switch id="page-numbers" checked={showPageNumbers} onCheckedChange={onPageNumbersChange} />
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
        <div className="space-y-0.5">
          <Label htmlFor="branding" className="font-medium flex items-center gap-1.5">
            <span className="text-primary">✦</span>
            WiseResume Badge
          </Label>
          <p className="text-xs text-muted-foreground">Professional prestige stamp</p>
        </div>
        <Switch id="branding" checked={showBranding} onCheckedChange={onBrandingChange} />
      </div>
    </div>
  );
}
