import { Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface PdfOptionsFooterProps {
  visible: boolean;
  showPageNumbers: boolean;
  showBranding: boolean;
  isPremium: boolean;
  onPageNumbersChange: (v: boolean) => void;
  onBrandingChange: (v: boolean) => void;
}

export function PdfOptionsFooter({ visible, showPageNumbers, showBranding, isPremium, onPageNumbersChange, onBrandingChange }: PdfOptionsFooterProps) {
  return (
    <div
      className={cn(
        'space-y-2 shrink-0 transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
      )}
    >
      {/* Page Numbers — always controllable */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
        <div>
          <Label htmlFor="page-numbers" className="font-medium text-sm">Page Numbers</Label>
          <p className="text-xs text-muted-foreground">Show "Page X of Y" in footer</p>
        </div>
        <Switch id="page-numbers" checked={showPageNumbers} onCheckedChange={onPageNumbersChange} />
      </div>

      {/* WiseResume Badge — locked for free/pro, controllable for premium */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 rounded-xl border transition-colors',
        isPremium
          ? 'bg-muted/50 border-border/50'
          : 'bg-muted/30 border-border/30'
      )}>
        <div className="flex-1 min-w-0">
          <Label
            htmlFor="branding"
            className={cn('font-medium text-sm flex items-center gap-1.5', !isPremium && 'cursor-default')}
          >
            <span className="text-primary text-xs">✦</span>
            WiseResume Badge
            {!isPremium && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 ml-1">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPremium ? 'Professional prestige stamp' : 'Required on free & pro exports'}
          </p>
        </div>
        <Switch
          id="branding"
          checked={isPremium ? showBranding : true}
          onCheckedChange={isPremium ? onBrandingChange : undefined}
          disabled={!isPremium}
          className={cn(!isPremium && 'opacity-60 cursor-not-allowed')}
        />
      </div>
    </div>
  );
}
