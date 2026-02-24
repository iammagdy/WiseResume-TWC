import { memo } from 'react';
import { Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';

interface AppearanceSectionProps {
    onLanguage: () => void;
}

export const AppearanceSection = memo(function AppearanceSection({ onLanguage }: AppearanceSectionProps) {
    return (
        <div className="rounded-2xl glass-elevated overflow-hidden">
            <div className="p-4">
                <ThemeToggle className="w-full justify-center" />
            </div>
            <Separator className="bg-border/30" />
            <SettingsRow
                type="navigation"
                label="Language"
                value="English"
                icon={<Globe className="w-4 h-4" />}
                onClick={onLanguage}
            />
        </div>
    );
});
