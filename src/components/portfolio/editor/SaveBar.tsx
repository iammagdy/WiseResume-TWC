import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface SaveBarProps {
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  portfolioEnabled: boolean;
  onPortfolioEnabledChange: (val: boolean) => void;
}

export function SaveBar({ onSave, saving, disabled, portfolioEnabled, onPortfolioEnabledChange }: SaveBarProps) {
  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-2">
      <div className="glass-elevated border border-border/40 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
        {/* Publish toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={portfolioEnabled}
            onCheckedChange={onPortfolioEnabledChange}
            className="scale-90"
          />
          <span className="text-[11px] font-medium text-muted-foreground">
            {portfolioEnabled ? 'Live' : 'Draft'}
          </span>
        </div>

        {/* Save button — tooltip when disabled explains why (PE-1) */}
        {disabled ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <Button
                    disabled
                    className="w-full h-11 min-h-[44px] rounded-xl pointer-events-none"
                  >
                    Save Portfolio
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Fix username errors before saving</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            onClick={onSave}
            disabled={saving}
            className="flex-1 h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Portfolio
          </Button>
        )}
      </div>
    </div>
  );
}
