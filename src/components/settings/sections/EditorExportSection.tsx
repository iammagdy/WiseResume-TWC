import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { memo, useState, Suspense } from 'react';
import { Download, Database, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { usePlan } from '@/hooks/usePlan';

const CloudSyncBadge = lazyWithRetry(() => import('./CloudSyncBadge'));

interface EditorExportSectionProps {
    isSignedIn: boolean;
    onManageExports: () => void;
    onNavigateAuth: () => void;
}

export const EditorExportSection = memo(function EditorExportSection({
    isSignedIn,
    onManageExports,
    onNavigateAuth,
}: EditorExportSectionProps) {
    const { t } = useLocale();
    const [pdfOpen, setPdfOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const { pdfDefaults, setPdfDefaults } = useSettingsStore();
    const { isPremium, subscriptionVerified } = usePlan();
    const canRemoveBranding = isPremium && subscriptionVerified;
    const effectiveBranding = canRemoveBranding ? (pdfDefaults.showBranding ?? true) : true;

    return (
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            {/* PDF Export Settings - Collapsible */}
            <Collapsible open={pdfOpen} onOpenChange={setPdfOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors touch-manipulation">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Download className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">{t('app.settingsPage.exports.pdfTitle', 'PDF Export Settings')}</p>
                        <p className="text-xs text-muted-foreground">
                            {t('app.settingsPage.exports.pdfSummary', '{{format}}, badge {{badge}}', {
                                format: pdfDefaults.showPageNumbers === false
                                    ? t('app.settingsPage.exports.off', 'Off')
                                    : pdfDefaults.pageNumberFormat === 'simple'
                                    ? t('app.settingsPage.exports.simple', 'Simple')
                                    : t('app.settingsPage.exports.full', 'Full'),
                                badge: effectiveBranding
                                    ? t('app.settingsPage.exports.on', 'on')
                                    : t('app.settingsPage.exports.off', 'off'),
                            })}
                        </p>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        pdfOpen && "rotate-180"
                    )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                            <div className="space-y-0.5">
                                <Label htmlFor="settings-page-numbers" className="text-sm font-medium">{t('app.settingsPage.exports.showPageNumbers', 'Show Page Numbers')}</Label>
                                <p className="text-xs text-muted-foreground">{t('app.settingsPage.exports.pageNumbersDescription', 'Display in PDF footer')}</p>
                            </div>
                            <Switch
                                id="settings-page-numbers"
                                checked={pdfDefaults.showPageNumbers ?? true}
                                onCheckedChange={(checked) => {
                                    haptics.light();
                                    setPdfDefaults({ showPageNumbers: checked });
                                }}
                            />
                        </div>
                        {pdfDefaults.showPageNumbers !== false && (
                            <div className="p-3 rounded-xl bg-muted space-y-2">
                                <Label className="text-sm font-medium">{t('app.settingsPage.exports.format', 'Format')}</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'simple' }); }}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                            pdfDefaults.pageNumberFormat === 'simple'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background hover:border-primary/50'
                                        )}
                                    >
                                        {t('app.settingsPage.exports.simpleFormat', 'Simple (1)')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'full' }); }}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                            (pdfDefaults.pageNumberFormat ?? 'full') === 'full'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background hover:border-primary/50'
                                        )}
                                    >
                                        {t('app.settingsPage.exports.fullFormat', 'Full (1 of 3)')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                            <div className="space-y-0.5">
                                <Label htmlFor="settings-branding" className="text-sm font-medium flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                                    {t('app.settingsPage.exports.badgeTitle', 'WiseResume Badge')}
                                    {!canRemoveBranding && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                            <Lock className="h-3 w-3" aria-hidden /> Premium
                                        </span>
                                    )}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {canRemoveBranding
                                        ? t('app.settingsPage.exports.badgeDescription', 'Small footer credit on exports')
                                        : t('app.settingsPage.exports.badgeRequired', 'Required on Free and Pro exports')}
                                </p>
                            </div>
                            <Switch
                                id="settings-branding"
                                checked={effectiveBranding}
                                disabled={!canRemoveBranding}
                                onCheckedChange={canRemoveBranding ? (checked) => {
                                    haptics.light();
                                    setPdfDefaults({ showBranding: checked });
                                } : undefined}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Separator className="ml-[52px] bg-border/30" />

            {/* Export Resumes - Collapsible */}
            <Collapsible open={exportOpen} onOpenChange={setExportOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors touch-manipulation">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">{t('app.settingsPage.exports.exportResumes', 'Export Resumes')}</p>
                    </div>
                    <Suspense fallback={null}>
                        <CloudSyncBadge isSignedIn={isSignedIn} />
                    </Suspense>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200 ml-1",
                        exportOpen && "rotate-180"
                    )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4">
                        {isSignedIn ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={onManageExports}
                            >
                                <Database className="w-4 h-4 mr-2" />
                                {t('app.settingsPage.exports.manageExports', 'Manage Exports')}
                            </Button>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-2">
                                <p className="text-sm text-muted-foreground text-center">
                                    {t('app.settingsPage.exports.signInDescription', 'Sign in to backup and export your resumes')}
                                </p>
                                <Button size="sm" onClick={onNavigateAuth}>
                                    {t('app.settingsPage.guest.signIn', 'Sign in')}
                                </Button>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
});
