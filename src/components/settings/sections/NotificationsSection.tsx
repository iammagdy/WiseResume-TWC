import { memo, Suspense, lazy } from 'react';
import { Bell, BellOff, Sparkles, Moon } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const PushNotificationSettings = lazy(() => import('@/components/settings/PushNotificationSettings').then(m => ({ default: m.PushNotificationSettings })));

export const NotificationsSection = memo(function NotificationsSection() {
    const {
        showAutoSaveToasts,
        setShowAutoSaveToasts,
        autoSaveToastMode,
        setAutoSaveToastMode,
        showAIEnhancementTips,
        setShowAIEnhancementTips,
        aiTipFrequency,
        setAITipFrequency,
        quietHoursEnabled,
        setQuietHoursEnabled,
        quietHoursStart,
        setQuietHoursStart,
        quietHoursEnd,
        setQuietHoursEnd,
    } = useSettingsStore();

    return (
        <div className="rounded-2xl glass-elevated overflow-hidden">
            <Suspense fallback={null}>
                <PushNotificationSettings />
            </Suspense>
            <SettingsRow
                type="toggle"
                label="Auto-save Toasts"
                description="Show save confirmations"
                icon={showAutoSaveToasts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                checked={showAutoSaveToasts}
                onCheckedChange={setShowAutoSaveToasts}
            />
            {showAutoSaveToasts && (
                <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-muted-foreground mb-2 pl-11">Show:</p>
                    <div className="flex gap-2 pl-11">
                        {(['always', 'errors-only'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => { haptics.light(); setAutoSaveToastMode(mode); }}
                                className={cn(
                                    'py-1.5 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                    autoSaveToastMode === mode
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-background hover:border-primary/50'
                                )}
                            >
                                {mode === 'always' ? 'Always' : 'Errors Only'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <Separator className="bg-border/30" />
            <SettingsRow
                type="toggle"
                label="AI Enhancement Tips"
                description="Proactive improvement suggestions"
                icon={<Sparkles className="w-4 h-4" />}
                checked={showAIEnhancementTips}
                onCheckedChange={setShowAIEnhancementTips}
            />
            {showAIEnhancementTips && (
                <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-muted-foreground mb-2 pl-11">Frequency:</p>
                    <div className="flex gap-2 pl-11">
                        {(['daily', 'weekly', 'on-demand'] as const).map((freq) => (
                            <button
                                key={freq}
                                onClick={() => { haptics.light(); setAITipFrequency(freq); }}
                                className={cn(
                                    'py-1.5 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                    aiTipFrequency === freq
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-background hover:border-primary/50'
                                )}
                            >
                                {freq === 'on-demand' ? 'On-Demand' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <Separator className="bg-border/30" />
            {/* Quiet Hours */}
            <SettingsRow
                type="toggle"
                label="Quiet Hours"
                description="Silence notifications during set times"
                icon={<Moon className="w-4 h-4" />}
                checked={quietHoursEnabled}
                onCheckedChange={(v) => { setQuietHoursEnabled(v); haptics.light(); }}
            />
            {quietHoursEnabled && (
                <div className="px-4 pb-3 pt-1">
                    <div className="flex items-center gap-2 pl-11">
                        <div className="flex flex-col items-center">
                            <label className="text-[10px] text-muted-foreground mb-1">From</label>
                            <input
                                type="time"
                                value={quietHoursStart}
                                onChange={(e) => setQuietHoursStart(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs w-[90px] text-center"
                            />
                        </div>
                        <span className="text-muted-foreground text-xs mt-4">–</span>
                        <div className="flex flex-col items-center">
                            <label className="text-[10px] text-muted-foreground mb-1">To</label>
                            <input
                                type="time"
                                value={quietHoursEnd}
                                onChange={(e) => setQuietHoursEnd(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs w-[90px] text-center"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
