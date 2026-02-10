import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageBreakSettings, SectionId, TemplateId, ResumeData } from '@/types/resume';
import { TemplateConfig, filterBreakableSections } from '@/lib/templateConfig';
import { AlertCircle, Lightbulb, FileText, ChevronDown } from 'lucide-react';
import { getSectionIcon, getSectionName, getSectionPreview, calculatePageNumbers, countPagesFromBreaks } from '@/lib/sectionHelpers';
import { cn } from '@/lib/utils';

interface PageBreakSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PageBreakSettings;
  onSettingsChange: (settings: PageBreakSettings) => void;
  availableSections: SectionId[];
  templateConfig: TemplateConfig;
  resume?: ResumeData;
  onSwitchTemplate?: (templateId: TemplateId) => void;
}

export function PageBreakSheet({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange,
  availableSections,
  templateConfig,
  resume,
  onSwitchTemplate
}: PageBreakSheetProps) {
  const { supportsPageBreaks, warningMessage, suggestedAlternatives } = templateConfig;
  
  // Filter available sections to only those that can have breaks
  const breakableSections = filterBreakableSections(templateConfig.id, availableSections);
  
  // Calculate page numbers based on current selections
  const pageNumbers = calculatePageNumbers(availableSections, settings.breakAfterSections);
  const totalPages = countPagesFromBreaks(availableSections, settings.breakAfterSections);
  
  const handleToggleBreak = (sectionId: SectionId) => {
    const newSections = settings.breakAfterSections.includes(sectionId)
      ? settings.breakAfterSections.filter(s => s !== sectionId)
      : [...settings.breakAfterSections, sectionId];
    
    onSettingsChange({ 
      ...settings, 
      mode: 'manual',
      breakAfterSections: newSections 
    });
  };
  
  const handleModeChange = (isManual: boolean) => {
    onSettingsChange({
      ...settings,
      mode: isManual ? 'manual' : 'auto',
      breakAfterSections: isManual ? settings.breakAfterSections : []
    });
  };
  
  // Template doesn't support page breaks at all
  if (!supportsPageBreaks) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Single-Page Layout
            </SheetTitle>
            <SheetDescription>
              This template is optimized for single-page resumes
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-4 min-h-0 overflow-y-auto flex-1">
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
          
          <div className="shrink-0 pb-safe">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>Page Breaks</span>
            {settings.mode === 'manual' && settings.breakAfterSections.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {totalPages} {totalPages === 1 ? 'page' : 'pages'}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Control how your resume is split across pages
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 space-y-4 min-h-0 overflow-y-auto flex-1">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Manual breaks</span>
              <span className="text-xs text-muted-foreground">
                {settings.mode === 'manual' ? 'Choose where pages end' : 'Using smart detection'}
              </span>
            </div>
            <Switch
              checked={settings.mode === 'manual'}
              onCheckedChange={handleModeChange}
            />
          </div>
          
          {/* Template-specific warning for linear-grid templates */}
          {templateConfig.layout === 'linear-grid' && warningMessage && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{warningMessage}</p>
            </div>
          )}
          
          {/* Section Cards (Manual Mode) */}
          {settings.mode === 'manual' && breakableSections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium px-1">
                Sections
              </p>
              
              {availableSections.map((sectionId, index) => {
                const isBreakable = breakableSections.includes(sectionId);
                const hasBreak = settings.breakAfterSections.includes(sectionId);
                const pageNum = pageNumbers.get(sectionId) || 1;
                const isLastSection = index === availableSections.length - 1;
                
                return (
                  <div key={sectionId}>
                    {/* Section Card */}
                    <div
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        isBreakable 
                          ? "bg-background border-border hover:border-primary/30 active:scale-[0.99]" 
                          : "bg-muted/30 border-transparent opacity-60"
                      )}
                      onClick={() => isBreakable && !isLastSection && handleToggleBreak(sectionId)}
                      role={isBreakable && !isLastSection ? "button" : undefined}
                      tabIndex={isBreakable && !isLastSection ? 0 : undefined}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl" aria-hidden>
                          {getSectionIcon(sectionId)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getSectionName(sectionId)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {resume ? getSectionPreview(resume, sectionId) : 'Loading...'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                          Page {pageNum}
                        </span>
                        
                        {isBreakable && !isLastSection && (
                          <Switch
                            checked={hasBreak}
                            onCheckedChange={() => handleToggleBreak(sectionId)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Break after ${getSectionName(sectionId)}`}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Page Break Indicator */}
                    {hasBreak && !isLastSection && (
                      <div className="flex items-center gap-2 py-2 px-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        <div className="flex items-center gap-1 text-xs text-primary font-medium">
                          <ChevronDown className="w-3 h-3" />
                          Page {pageNum} ends
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
              
              {settings.breakAfterSections.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  Toggle sections to add page breaks after them
                </p>
              )}
            </div>
          )}
          
          {/* Auto Mode Message */}
          {settings.mode === 'auto' && (
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Lightbulb className="w-5 h-5 text-primary shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Smart Detection Active</p>
                <p>Page breaks are automatically placed at optimal positions to avoid cutting through content.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="shrink-0 pb-safe">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
