import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageBreakSettings, SectionId } from '@/types/resume';

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
}

export function PageBreakSheet({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange,
  availableSections 
}: PageBreakSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Page Break Settings</SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-6">
          {/* Mode Selection */}
          <RadioGroup 
            value={settings.mode} 
            onValueChange={(mode) => onSettingsChange({ ...settings, mode: mode as 'auto' | 'manual' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto">Auto (smart detection)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual">Manual (choose sections)</Label>
            </div>
          </RadioGroup>
          
          {/* Section Checkboxes (only when manual) */}
          {settings.mode === 'manual' && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground">Force page break after:</p>
              {availableSections.map((section, index) => (
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
                        availableSections.indexOf(s) <= availableSections.indexOf(section)
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
