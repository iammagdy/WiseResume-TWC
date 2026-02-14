import { memo, useState, useCallback, useMemo } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getDefaultCustomization, PRESET_PALETTES, FONT_OPTIONS, type PresetPalette, type FontOption } from '@/lib/templateCustomization';
import type { TemplateCustomization } from '@/types/resume';

interface CustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customization?: TemplateCustomization;
  onApply: (customization: TemplateCustomization) => void;
}

export const CustomizeSheet = memo(function CustomizeSheet({
  open,
  onOpenChange,
  customization,
  onApply,
}: CustomizeSheetProps) {
  const [draft, setDraft] = useState<TemplateCustomization>(() => customization ?? getDefaultCustomization());

  // Reset draft when sheet opens
  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (o) setDraft(customization ?? getDefaultCustomization());
      onOpenChange(o);
    },
    [customization, onOpenChange]
  );

  const update = useCallback(<K extends keyof TemplateCustomization>(key: K, value: TemplateCustomization[K]) => {
    haptics.selection();
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    haptics.medium();
    setDraft(getDefaultCustomization());
  }, []);

  const handleApply = useCallback(() => {
    haptics.success();
    onApply(draft);
    onOpenChange(false);
  }, [draft, onApply, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0" hideCloseButton>
        {/* Drag handle */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full" />
        </div>

        <SheetTitle className="px-4 pb-3 text-lg font-semibold">Customize Template</SheetTitle>

        {/* Live preview */}
        <div className="px-4 pb-4">
          <div
            className="w-full h-32 rounded-xl glass-surface border border-border/30 overflow-hidden flex items-center justify-center transition-all duration-300"
            style={{
              fontFamily: draft.fontBody,
              backgroundColor: `${draft.accentColor}08`,
              borderColor: `${draft.accentColor}30`,
            }}
          >
            <div className="text-center space-y-1 p-4">
              <h3
                className="text-base font-bold"
                style={{ fontFamily: draft.fontHeading, color: draft.accentColor }}
              >
                John Doe
              </h3>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: draft.fontBody }}>
                Software Engineer • San Francisco, CA
              </p>
              <div className="flex gap-1 justify-center mt-2">
                {['React', 'TypeScript', 'Node.js'].map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: `${draft.accentColor}15`, color: draft.accentColor }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto px-4">
          <Accordion type="single" collapsible defaultValue="colors">
            {/* Colors */}
            <AccordionItem value="colors">
              <AccordionTrigger className="text-sm font-medium">Colors</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-4 gap-3 pb-3">
                  {PRESET_PALETTES.map((pal) => (
                    <button
                      key={pal.name}
                      onClick={() => update('accentColor', pal.color)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all touch-manipulation active:scale-95',
                        draft.accentColor === pal.color ? 'glass-elevated ring-2 ring-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div
                        className="w-11 h-11 rounded-full border-2 border-background shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: pal.color }}
                      >
                        {draft.accentColor === pal.color && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{pal.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-xs text-muted-foreground">Custom:</label>
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(e) => update('accentColor', e.target.value)}
                    className="w-11 h-11 rounded-lg border-0 cursor-pointer touch-manipulation"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Fonts */}
            <AccordionItem value="fonts">
              <AccordionTrigger className="text-sm font-medium">Fonts</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Heading Font</label>
                  <Select value={draft.fontHeading} onValueChange={(v) => update('fontHeading', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.value }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Body Font</label>
                  <Select value={draft.fontBody} onValueChange={(v) => update('fontBody', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.value }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Font Size</label>
                  <SegmentedControl
                    options={['small', 'medium', 'large']}
                    labels={['Small', 'Medium', 'Large']}
                    value={draft.fontSize}
                    onChange={(v) => update('fontSize', v as TemplateCustomization['fontSize'])}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layout */}
            <AccordionItem value="layout">
              <AccordionTrigger className="text-sm font-medium">Layout</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Columns</label>
                  <SegmentedControl
                    options={['single', 'two-column']}
                    labels={['Single', 'Two Column']}
                    value={draft.layout}
                    onChange={(v) => update('layout', v as TemplateCustomization['layout'])}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Spacing</label>
                  <SegmentedControl
                    options={['compact', 'normal', 'spacious']}
                    labels={['Compact', 'Normal', 'Spacious']}
                    value={draft.spacing}
                    onChange={(v) => update('spacing', v as TemplateCustomization['spacing'])}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Margins</label>
                  <SegmentedControl
                    options={['narrow', 'normal', 'wide']}
                    labels={['Narrow', 'Normal', 'Wide']}
                    value={draft.margins}
                    onChange={(v) => update('margins', v as TemplateCustomization['margins'])}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Fixed bottom bar */}
        <div className="shrink-0 px-4 py-3 pb-safe border-t border-border flex gap-3">
          <Button variant="ghost" size="lg" className="flex-1 h-12" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <Button size="lg" className="flex-1 h-12 gradient-primary" onClick={handleApply}>
            <Check className="w-4 h-4 mr-1.5" />
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

// ===== Segmented Control =====

interface SegmentedControlProps {
  options: string[];
  labels: string[];
  value: string;
  onChange: (value: string) => void;
}

const SegmentedControl = memo(function SegmentedControl({ options, labels, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex rounded-xl glass-surface p-1 gap-1">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => { haptics.selection(); onChange(opt); }}
          className={cn(
            'flex-1 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-95',
            value === opt ? 'glass-elevated text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
});
