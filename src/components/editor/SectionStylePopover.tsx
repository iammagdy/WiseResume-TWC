import { useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import type { SectionStyleOverride } from '@/types/resume';

interface SectionStylePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  trigger: React.ReactNode;
}

export function SectionStylePopover({ open, onOpenChange, sectionName, trigger }: SectionStylePopoverProps) {
  const override = useResumeStore(
    s => s.currentResume?.customization?.sectionOverrides?.[sectionName],
  ) as SectionStyleOverride | undefined;
  const updateSectionOverride = useResumeStore(s => s.updateSectionOverride);

  const fontScale = override?.fontScale ?? 1;

  const onPaddingChange = useCallback(
    (key: 'paddingTop' | 'paddingBottom' | 'marginBottom', raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === '') {
        updateSectionOverride(sectionName, { [key]: undefined });
        return;
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return;
      updateSectionOverride(sectionName, { [key]: Math.max(0, n) });
    },
    [sectionName, updateSectionOverride],
  );

  const onReset = useCallback(() => {
    updateSectionOverride(sectionName, {});
  }, [sectionName, updateSectionOverride]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-64 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Font size</Label>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {Math.round(fontScale * 100)}%
            </span>
          </div>
          <Slider
            min={70}
            max={130}
            step={5}
            value={[Math.round(fontScale * 100)]}
            onValueChange={([v]) => updateSectionOverride(sectionName, { fontScale: v / 100 })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Padding top (px)</Label>
          <Input
            type="number"
            min={0}
            max={60}
            placeholder="Auto"
            value={override?.paddingTop ?? ''}
            onChange={(e) => onPaddingChange('paddingTop', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Padding bottom (px)</Label>
          <Input
            type="number"
            min={0}
            max={60}
            placeholder="Auto"
            value={override?.paddingBottom ?? ''}
            onChange={(e) => onPaddingChange('paddingBottom', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Margin below (px)</Label>
          <Input
            type="number"
            min={0}
            max={80}
            placeholder="Auto"
            value={override?.marginBottom ?? ''}
            onChange={(e) => onPaddingChange('marginBottom', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="pt-1 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground"
            onClick={onReset}
          >
            Reset section
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
