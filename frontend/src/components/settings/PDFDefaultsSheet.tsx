import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PDFOptions } from '@/types/resume';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface PDFDefaultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfDefaults: PDFOptions;
  onUpdate: (defaults: Partial<PDFOptions>) => void;
}

export function PDFDefaultsSheet({
  open,
  onOpenChange,
  pdfDefaults,
  onUpdate,
}: PDFDefaultsSheetProps) {
  const handleFormatChange = (format: 'simple' | 'full') => {
    haptics.light();
    onUpdate({ pageNumberFormat: format });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle>PDF Export Defaults</SheetTitle>
          <p className="text-sm text-muted-foreground">
            These settings apply to all new PDF exports
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-6">
          {/* Page numbers toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="default-page-numbers" className="font-medium">
                Show Page Numbers
              </Label>
              <p className="text-xs text-muted-foreground">
                Display page numbers in PDF footer
              </p>
            </div>
            <Switch
              id="default-page-numbers"
              checked={pdfDefaults.showPageNumbers ?? true}
              onCheckedChange={(checked) => {
                haptics.light();
                onUpdate({ showPageNumbers: checked });
              }}
            />
          </div>

          {/* Page number format */}
          {pdfDefaults.showPageNumbers !== false && (
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <Label className="font-medium">Page Number Format</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFormatChange('simple')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                    'border-2 active:scale-[0.98] touch-manipulation',
                    pdfDefaults.pageNumberFormat === 'simple'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50'
                  )}
                >
                  Simple (1)
                </button>
                <button
                  onClick={() => handleFormatChange('full')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                    'border-2 active:scale-[0.98] touch-manipulation',
                    (pdfDefaults.pageNumberFormat ?? 'full') === 'full'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50'
                  )}
                >
                  Full (Page 1 of 3)
                </button>
              </div>
            </div>
          )}

          {/* Branding toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="default-branding" className="font-medium flex items-center gap-1.5">
                <span className="text-primary">✦</span>
                WiseResume Badge
              </Label>
              <p className="text-xs text-muted-foreground">
                Professional prestige stamp on exports
              </p>
            </div>
            <Switch
              id="default-branding"
              checked={pdfDefaults.showBranding ?? true}
              onCheckedChange={(checked) => {
                haptics.light();
                onUpdate({ showBranding: checked });
              }}
            />
          </div>

          {/* Done button */}
          <Button
            size="lg"
            className="w-full h-12 font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
