import { ExternalLink } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocale } from '@/i18n/LocaleProvider';

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
  const { t } = useLocale();
  const publishLabel = hasUnpublishedChanges && portfolioEnabled
    ? t('app.portfolioEditor.saveBar.publishChanges', 'نشر التغييرات')
    : portfolioEnabled
    ? t('app.portfolioEditor.saveBar.saveAndPublish', 'حفظ ونشر')
    : t('app.portfolioEditor.saveBar.saveDraftPrimary', 'حفظ كمسودة');

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
            {portfolioEnabled
              ? t('app.portfolioEditor.statusBar.live', 'مباشر')
              : t('app.portfolioEditor.statusBar.draft', 'مسودة')}
          </span>
        </div>

        {/* Open public page link when live */}
        {portfolioEnabled && portfolioUrl && (
          <a
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0"
            title={t('app.portfolioEditor.header.viewTitle', 'عرض الملف العام')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('app.portfolioEditor.header.viewLive', 'عرض المباشر')}
          </a>
        )}

        {/* Secondary draft action shown only when the portfolio is live */}
        {portfolioEnabled && onSaveDraft && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={savingDraft || saving || disabled}
            className="h-9 px-3 rounded-xl text-xs shrink-0 touch-manipulation active:scale-95">
            {savingDraft ? <MiniSpinner size={14} /> : t('app.portfolioEditor.saveBar.saveDraftSecondary', 'حفظ المسودة')}
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
                    {t('app.portfolioEditor.saveBar.saveAndPublish', 'حفظ ونشر')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t('app.portfolioEditor.saveBar.fixUsernameErrors', 'أصلح أخطاء اسم المستخدم قبل الحفظ')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> :

        <Button
          onClick={primaryAction}
          disabled={primaryBusy || (saveDraftMode ? saving : savingDraft)}
          className="flex-1 h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation">
          
            {primaryBusy
              ? (
                <>
                  <MiniSpinner size={16} className="mr-2" />
                  {saveDraftMode
                    ? t('app.portfolioEditor.saveBar.savingDraft', 'جارٍ حفظ المسودة...')
                    : t('app.portfolioEditor.saveBar.publishing', 'جارٍ النشر...')}
                </>
              )
              : publishLabel
            }
          </Button>
        }
      </div>
    </div>);
}
