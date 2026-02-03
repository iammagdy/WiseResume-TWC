import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageBreakSettings, SectionId, TemplateId } from '@/types/resume';
import { TemplateConfig, filterBreakableSections } from '@/lib/templateConfig';
import { AlertCircle, Lightbulb, FileText } from 'lucide-react';

const SECTION_LABELS: Record<SectionId, string> = {
  summary: 'Summary',
  experience: 'Experience', 
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
};

interface PageBreakSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PageBreakSettings;
  onSettingsChange: (settings: PageBreakSettings) => void;
  availableSections: SectionId[];
  templateConfig: TemplateConfig;
  onSwitchTemplate?: (templateId: TemplateId) => void;
}

export function PageBreakSheet({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange,
  availableSections,
  templateConfig,
  onSwitchTemplate
}: PageBreakSheetProps) {
  const { supportsPageBreaks, supportsManualBreaks, singlePageOptimized, warningMessage, suggestedAlternatives } = templateConfig;
  
  // Filter available sections to only those that can have breaks
  const breakableSections = filterBreakableSections(templateConfig.id, availableSections);
  
  // Template doesn't support page breaks at all
  if (!supportsPageBreaks) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Single-Page Layout
            </SheetTitle>
            <SheetDescription>
              This template is optimized for single-page resumes
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-4">
            {/* Explanation */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  {templateConfig.name} Template
                </p>
                <p>{warningMessage}</p>
              </div>
            </div>
            
            {/* Suggestion to switch templates */}
            {suggestedAlternatives && suggestedAlternatives.length > 0 && onSwitchTemplate && (
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Need multiple pages?</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedAlternatives.map(altId => (
                      <Button
                        key={altId}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSwitchTemplate(altId);
                          onOpenChange(false);
                        }}
                        className="capitalize"
                      >
                        Switch to {altId}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Page Break Settings</SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-6">
          {/* Template-specific warning for linear-grid templates */}
          {templateConfig.layout === 'linear-grid' && warningMessage && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{warningMessage}</p>
            </div>
          )}
          
          {/* Mode Selection */}
          <RadioGroup 
            value={settings.mode} 
            onValueChange={(mode) => onSettingsChange({ ...settings, mode: mode as 'auto' | 'manual' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto">Auto (smart detection)</Label>
            </div>
            {supportsManualBreaks && breakableSections.length > 0 && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual (choose sections)</Label>
              </div>
            )}
          </RadioGroup>
          
          {/* Section Checkboxes (only when manual and supported) */}
          {settings.mode === 'manual' && supportsManualBreaks && breakableSections.length > 0 && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground">Force page break after:</p>
              {breakableSections.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox 
                    id={section}
                    checked={settings.breakAfterSections.includes(section)}
                    onCheckedChange={(checked) => {
                      const newSections = checked 
                        ? [...settings.breakAfterSections, section]
                        : settings.breakAfterSections.filter(s => s !== section);
                      onSettingsChange({ ...settings, breakAfterSections: newSections });
                    }}
                  />
                  <Label htmlFor={section} className="flex-1">{SECTION_LABELS[section]}</Label>
                  {settings.breakAfterSections.includes(section) && (
                    <span className="text-xs text-muted-foreground">
                      Page {settings.breakAfterSections.filter(s => 
                        breakableSections.indexOf(s) <= breakableSections.indexOf(section)
                      ).length}
                    </span>
                  )}
                </div>
              ))}
              {settings.breakAfterSections.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Select sections to force page breaks after them
                </p>
              )}
            </div>
          )}
        </div>
        
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Apply
        </Button>
      </SheetContent>
    </Sheet>
  );
}
