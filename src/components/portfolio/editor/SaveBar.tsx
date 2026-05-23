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
  hasUnpublishedChanges?: boolean;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
}

export function SaveBar({
  onSave,
  saving,
  disabled,
  portfolioEnabled,
  onPortfolioEnabledChange,
  portfolioUrl,
  hasUnpublishedChanges = false,
  onSaveDraft,
  savingDraft = false,
}: SaveBarProps) {
  const publishLabel = hasUnpublishedChanges && portfolioEnabled
    ? 'Publish changes'
    : portfolioEnabled
    ? 'Save & Publish'
    : 'Save Draft';

  const saveDraftMode = !portfolioEnabled && !!onSaveDraft;
  const primaryAction = saveDraftMode ? onSaveDraft! : onSave;
  const primaryBusy = saveDraftMode ? savingDraft : saving;

  return (
    <div className="shrink-0 px-4 sm:px-6 py-3 pb-safe border-t border-border/70 bg-card/95 backdrop-blur-md">
      <div className="flex items-center gap-3 max-w-6xl mx-auto w-full">
        {/* Publish toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={portfolioEnabled}
            onCheckedChange={onPortfolioEnabledChange}
            disabled={disabled || saving || savingDraft}
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

        {/* "Save draft" secondary action (only when there are changes and portfolio is live) */}
        {portfolioEnabled && onSaveDraft && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={savingDraft || saving || disabled}
            className="h-9 px-3 rounded-xl text-xs shrink-0 touch-manipulation active:scale-95">
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save draft'}
          </Button>
        )}

        {/* Publish button — tooltip when disabled explains why */}
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
          onClick={primaryAction}
          disabled={primaryBusy || (saveDraftMode ? saving : savingDraft)}
          className="flex-1 h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation">
          
            {primaryBusy
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{saveDraftMode ? 'Saving draft…' : 'Publishing…'}</>
              : publishLabel
            }
          </Button>
        }
      </div>
    </div>);
}
