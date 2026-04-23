import { useCallback } from 'react';
import { AlignLeft, AlignCenter, AlignRight, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useResumeStore } from '@/store/resumeStore';
import { FONT_OPTIONS, getDefaultCustomization } from '@/lib/templateCustomization';
import type { TemplateCustomization } from '@/types/resume';

interface StyleCustomizationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StyleCustomizationPanel({ open, onOpenChange }: StyleCustomizationPanelProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);

  const c: TemplateCustomization = currentResume?.customization ?? getDefaultCustomization();

  const patch = useCallback(
    (next: Partial<TemplateCustomization>) => {
      if (!currentResume) return;
      const base = currentResume.customization ?? getDefaultCustomization();
      updateResume({ customization: { ...base, ...next } });
    },
    [currentResume, updateResume]
  );

  const clearKeys = useCallback(
    (keys: (keyof TemplateCustomization)[]) => {
      if (!currentResume?.customization) return;
      const base = { ...currentResume.customization };
      for (const k of keys) delete (base as Record<string, unknown>)[k];
      updateResume({ customization: base });
    },
    [currentResume, updateResume]
  );

  if (!currentResume) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize style</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Tweaks apply to this resume only and update the preview live.
          </p>
        </SheetHeader>

        <Accordion type="multiple" defaultValue={['layout', 'typography', 'spacing']} className="mt-4">
          {/* LAYOUT */}
          <AccordionItem value="layout">
            <AccordionTrigger>Layout</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Header alignment</Label>
                <ToggleGroup
                  type="single"
                  value={c.headerAlign ?? 'left'}
                  onValueChange={v => v && patch({ headerAlign: v as 'left' | 'center' | 'right' })}
                  className="justify-start"
                >
                  <ToggleGroupItem value="left" aria-label="Align header left">
                    <AlignLeft className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="center" aria-label="Align header center">
                    <AlignCenter className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="right" aria-label="Align header right">
                    <AlignRight className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label>Page format</Label>
                <Select value={c.pageFormat} onValueChange={v => patch({ pageFormat: v as 'a4' | 'letter' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Page margins</Label>
                <Select value={c.margins} onValueChange={v => patch({ margins: v as 'narrow' | 'normal' | 'wide' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="narrow">Narrow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clearKeys(['headerAlign'])}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset header alignment
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* TYPOGRAPHY */}
          <AccordionItem value="typography">
            <AccordionTrigger>Typography</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Font size</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.round((c.fontScale ?? 1) * 100)}%
                  </span>
                </div>
                <Slider
                  min={85}
                  max={115}
                  step={1}
                  value={[Math.round((c.fontScale ?? 1) * 100)]}
                  onValueChange={([v]) => patch({ fontScale: v / 100 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Line height</Label>
                <Select
                  value={c.lineHeight}
                  onValueChange={v => patch({ lineHeight: v as TemplateCustomization['lineHeight'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="1.15">1.15</SelectItem>
                    <SelectItem value="1.5">1.5</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Body font</Label>
                <Select value={c.fontBody} onValueChange={v => patch({ fontBody: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Heading font</Label>
                <Select value={c.fontHeading} onValueChange={v => patch({ fontHeading: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clearKeys(['fontScale'])}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset font size
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* SPACING */}
          <AccordionItem value="spacing">
            <AccordionTrigger>Spacing</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Density preset</Label>
                <Select
                  value={c.spacing}
                  onValueChange={v => patch({ spacing: v as 'compact' | 'normal' | 'spacious' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Gap between sections</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {c.sectionGap ?? 20}px
                  </span>
                </div>
                <Slider
                  min={4}
                  max={48}
                  step={1}
                  value={[c.sectionGap ?? 20]}
                  onValueChange={([v]) => patch({ sectionGap: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Gap between entries</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {c.entryGap ?? 8}px
                  </span>
                </div>
                <Slider
                  min={0}
                  max={32}
                  step={1}
                  value={[c.entryGap ?? 8]}
                  onValueChange={([v]) => patch({ entryGap: v })}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clearKeys(['sectionGap', 'entryGap'])}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset spacing
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}
