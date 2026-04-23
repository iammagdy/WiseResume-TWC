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
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useResumeStore } from '@/store/resumeStore';
import {
  FONT_OPTIONS,
  getDefaultCustomization,
  COMPACT_SCALE_MIN,
} from '@/lib/templateCustomization';
import type { TemplateCustomization } from '@/types/resume';

const DEFAULT_FONT_VALUE = '__default__';

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
      // IMPORTANT: do NOT fall back to getDefaultCustomization() here.
      // Doing so would silently inject the default accent color / fonts into
      // a resume that previously had no customization, which then triggers
      // the existing accent-override CSS in generateCustomizationCSS and
      // turns the whole resume blue. Only persist the user's actual choices.
      const base = (currentResume.customization ?? {}) as TemplateCustomization;
      updateResume({ customization: { ...base, ...next } as TemplateCustomization });
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

  // True reset: wipes ALL persisted customization fields (including dirty
  // data like accentColor='#1e40af' that earlier panel versions baked in
  // and which silently re-painted everything blue). Keeps the panel ON so
  // the user can start customizing again from a clean slate.
  const clearAll = useCallback(() => {
    if (!currentResume) return;
    updateResume({ customization: { enabled: true } as TemplateCustomization });
  }, [currentResume, updateResume]);

  if (!currentResume) return null;

  // Treat undefined as ON so existing customized resumes behave identically
  // to before this flag existed.
  const isEnabled = c.enabled !== false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize style</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Tweaks apply to this resume only and update the preview live.
          </p>
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="customization-enabled" className="text-sm font-medium">
              Apply customizations
            </Label>
            <p className="text-xs text-muted-foreground">
              Off = original template defaults. On = your edits below.
            </p>
          </div>
          <Switch
            id="customization-enabled"
            checked={isEnabled}
            onCheckedChange={(v) => patch({ enabled: v })}
          />
        </div>

        <Accordion
          type="multiple"
          defaultValue={['fit', 'layout', 'typography', 'spacing']}
          className={`mt-4 ${isEnabled ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!isEnabled}
        >
          {/* AUTO-FIT — drives fontScale automatically so the resume occupies
              the requested page count. Read useFitToPages to understand the
              measurement loop. */}
          <AccordionItem value="fit">
            <AccordionTrigger>Auto-fit pages</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Automatically shrink font, line height, and spacing to fit your
                resume into a target page count. Overrides the manual Font Size
                slider while active.
              </p>
              <ToggleGroup
                type="single"
                value={c.targetPageCount ? String(c.targetPageCount) : 'off'}
                onValueChange={v => {
                  if (!v) return;
                  if (v === 'off') {
                    // Clear the target AND restore fontScale to 1 so the
                    // user isn't left with a small auto-computed scale that
                    // looks "stuck" on the manual slider after toggling off.
                    clearKeys(['targetPageCount']);
                    patch({ fontScale: 1 });
                  } else {
                    patch({ targetPageCount: Number(v) as 1 | 2 | 3 });
                  }
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="off" aria-label="Auto-fit off">Off</ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Fit to 1 page">1 page</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Fit to 2 pages">2 pages</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="Fit to 3 pages">3 pages</ToggleGroupItem>
              </ToggleGroup>
              {c.targetPageCount && typeof c.fontScale === 'number' && c.fontScale <= COMPACT_SCALE_MIN + 0.001 && (
                <p className="text-xs text-amber-600">
                  Resume is too long to fit on {c.targetPageCount} page{c.targetPageCount === 1 ? '' : 's'} at the minimum readable scale. Consider trimming content or raising the target.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

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
                    {c.targetPageCount ? ' (auto)' : ''}
                  </span>
                </div>
                <Slider
                  min={60}
                  max={115}
                  step={1}
                  value={[Math.round((c.fontScale ?? 1) * 100)]}
                  onValueChange={([v]) => patch({ fontScale: v / 100 })}
                  disabled={!!c.targetPageCount}
                />
                {c.targetPageCount ? (
                  <p className="text-[11px] text-muted-foreground">
                    Auto-fit is controlling this slider. Turn off Auto-fit to set the font size manually.
                  </p>
                ) : null}
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
                <Select
                  value={currentResume.customization?.fontBody ?? DEFAULT_FONT_VALUE}
                  onValueChange={v => v === DEFAULT_FONT_VALUE ? clearKeys(['fontBody']) : patch({ fontBody: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_FONT_VALUE}>Default (template)</SelectItem>
                    {FONT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Heading font</Label>
                <Select
                  value={currentResume.customization?.fontHeading ?? DEFAULT_FONT_VALUE}
                  onValueChange={v => v === DEFAULT_FONT_VALUE ? clearKeys(['fontHeading']) : patch({ fontHeading: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_FONT_VALUE}>Default (template)</SelectItem>
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

        <div className="mt-6 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={clearAll}
          >
            <RotateCcw className="w-3 h-3 mr-2" />
            Reset to template defaults
          </Button>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Clears every customization saved on this resume so the template renders with its original styling. Use this if your CV is stuck looking wrong (e.g. all-blue text).
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
