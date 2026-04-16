import { memo } from 'react';
import { ThemeToggle } from '@/components/settings/ThemeToggle';

export const AppearanceSection = memo(function AppearanceSection() {
    return (
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="p-4">
                <ThemeToggle className="w-full justify-center" />
            </div>
        </div>
    );
});
