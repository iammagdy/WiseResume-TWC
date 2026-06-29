import { memo } from 'react';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import { useAppSettings } from '@/hooks/useAppSettings';

export const AppearanceSection = memo(function AppearanceSection() {
    const appSettings = useAppSettings();
    return (
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="p-4">
                <ThemeToggle className="w-full justify-center" />
                {(appSettings.feature_arabic_locale || import.meta.env.DEV) && (
                    <div className="mt-4 border-t border-border/60 pt-4">
                        <LanguageSwitcher />
                    </div>
                )}
            </div>
        </div>
    );
});
