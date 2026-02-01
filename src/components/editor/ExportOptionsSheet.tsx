import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Package, Loader2, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ExportType, CoverLetterContext } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ExportOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCoverLetter: boolean;
  coverLetterContext?: CoverLetterContext | null;
  onExport: (type: ExportType, showPageNumbers: boolean, showBranding: boolean) => void;
  isExporting: boolean;
}

export function ExportOptionsSheet({
  open,
  onOpenChange,
  hasCoverLetter,
  coverLetterContext,
  onExport,
  isExporting,
}: ExportOptionsSheetProps) {
  const [selectedType, setSelectedType] = useState<ExportType>('resume');
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showBranding, setShowBranding] = useState(true);

  const exportOptions = [
    {
      id: 'resume' as ExportType,
      label: 'Resume Only',
      description: 'Export your tailored resume',
      icon: FileText,
      available: true,
    },
    {
      id: 'cover-letter' as ExportType,
      label: 'Cover Letter Only',
      description: hasCoverLetter 
        ? `For ${coverLetterContext?.title || 'position'} at ${coverLetterContext?.company || 'company'}`
        : 'Generate a cover letter first',
      icon: FileText,
      available: hasCoverLetter,
    },
    {
      id: 'combined' as ExportType,
      label: 'Application Package',
      description: hasCoverLetter 
        ? 'Cover letter + Resume in one PDF'
        : 'Generate a cover letter first',
      icon: Package,
      available: hasCoverLetter,
    },
  ];

  const handleExport = () => {
    onExport(selectedType, showPageNumbers, showBranding);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Options
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Export type selection */}
          <div className="space-y-2">
            {exportOptions.map((option) => (
              <motion.button
                key={option.id}
                onClick={() => option.available && setSelectedType(option.id)}
                disabled={!option.available}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  selectedType === option.id && option.available
                    ? 'border-primary bg-primary/5'
                    : option.available
                      ? 'border-border hover:border-primary/50'
                      : 'border-border opacity-50 cursor-not-allowed'
                )}
                whileTap={option.available ? { scale: 0.98 } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    selectedType === option.id && option.available
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{option.label}</span>
                      {selectedType === option.id && option.available && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Footer options */}
          <div className="space-y-3">
            {/* Page numbers toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="page-numbers" className="font-medium">
                  Page Numbers
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show "Page X of Y" in footer
                </p>
              </div>
              <Switch
                id="page-numbers"
                checked={showPageNumbers}
                onCheckedChange={setShowPageNumbers}
              />
            </div>

            {/* Branding badge toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="branding" className="font-medium flex items-center gap-1.5">
                  <span className="text-primary">✦</span>
                  WiseResume Badge
                </Label>
                <p className="text-xs text-muted-foreground">
                  Professional prestige stamp
                </p>
              </div>
              <Switch
                id="branding"
                checked={showBranding}
                onCheckedChange={setShowBranding}
              />
            </div>
          </div>

          {/* Export button */}
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary"
            onClick={handleExport}
            disabled={isExporting || (selectedType !== 'resume' && !hasCoverLetter)}
            style={{
              boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
            }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                {selectedType === 'combined' ? 'Download Package' : 'Download PDF'}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
