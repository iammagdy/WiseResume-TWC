import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface SaveBarProps {
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  portfolioEnabled: boolean;
  onPortfolioEnabledChange: (val: boolean) => void;
  portfolioUrl?: string;
}

export function SaveBar({ onSave, saving, disabled, portfolioEnabled, onPortfolioEnabledChange, portfolioUrl }: SaveBarProps) {
  return (
    <div className="shrink-0 px-4 py-3 pb-safe border-t border-border bg-background">
      <div className="flex items-center gap-3">
        {/* Publish toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={portfolioEnabled}
            onCheckedChange={onPortfolioEnabledChange}
            disabled={disabled || saving}
            className="scale-90" />
          
          <span className="text-[11px] font-medium text-muted-foreground">
            {portfolioEnabled ? 'Live' : 'Draft'}
          </span>
        </div>

        {/* Open public page link when live */}
        {portfolioEnabled && portfolioUrl && (
          <a
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0"
            title="View public portfolio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View live
          </a>
        )}

        {/* Save button — tooltip when disabled explains why */}
        {disabled ?
        <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <Button
                  disabled
                  className="w-full h-11 min-h-[44px] rounded-xl pointer-events-none">
                    Save & Publish
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Fix username errors before saving</TooltipContent>
            </Tooltip>
          </TooltipProvider> :

        <Button
          onClick={onSave}
          disabled={saving}
          className="flex-1 h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation">
          
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : portfolioEnabled ? 'Save & Publish' : 'Save Draft'
            }
          </Button>
        }
      </div>
    </div>);
}
