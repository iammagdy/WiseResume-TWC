import { memo } from 'react';
import { Bell, BellOff, Sparkles } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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
    } = useSettingsStore();

    return (
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
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
            <Separator className="ml-[52px] bg-border/30" />
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
        </div>
    );
});
