import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

export type SettingsTabId = 'account' | 'preferences' | 'notifications' | 'privacy' | 'help';

export interface SettingsTabDefinition {
  id: SettingsTabId;
  labelKey: string;
  defaultLabel: string;
}

export const SETTINGS_TABS: SettingsTabDefinition[] = [
  { id: 'account', labelKey: 'settings.tabs.account', defaultLabel: 'Account' },
  { id: 'preferences', labelKey: 'settings.tabs.preferences', defaultLabel: 'AI & Preferences' },
  { id: 'notifications', labelKey: 'settings.tabs.notifications', defaultLabel: 'Notifications' },
  { id: 'privacy', labelKey: 'settings.tabs.privacy', defaultLabel: 'Privacy & Security' },
  { id: 'help', labelKey: 'settings.tabs.help', defaultLabel: 'Help' },
];

interface SettingsTabLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsTabLayout({ children, className }: SettingsTabLayoutProps) {
  const { t, direction } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTabId = searchParams.get('tab') as SettingsTabId | null;

  // Default to account if no valid tab in URL
  const activeTab = useMemo(() => {
    const isValid = SETTINGS_TABS.some(tab => tab.id === activeTabId);
    return isValid && activeTabId ? activeTabId : 'account';
  }, [activeTabId]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tabId);
      // Ensure other params like ?changelog=true are naturally preserved by using prev
      return newParams;
    });
  };

  const isRtl = direction === 'rtl';

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="sticky top-0 z-10 w-full bg-background border-b border-border shadow-sm sm:shadow-none">
        <div className="w-full overflow-x-auto scrollbar-none">
          <nav
            className="flex px-4 sm:px-0"
            aria-label={t('settings.tabsLabel', 'Settings navigation')}
            dir={direction}
          >
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative min-w-fit px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                    "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(tab.labelKey, tab.defaultLabel)}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute bottom-0 h-0.5 bg-primary",
                        isRtl ? "right-0 left-0" : "left-0 right-0"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

interface SettingsTabContentProps {
  id: SettingsTabId;
  children: React.ReactNode;
}

export function SettingsTabContent({ id, children }: SettingsTabContentProps) {
  const [searchParams] = useSearchParams();
  const activeTabId = searchParams.get('tab');
  const isValid = SETTINGS_TABS.some(t => t.id === activeTabId);
  const activeTab = isValid && activeTabId ? activeTabId : 'account';

  if (activeTab !== id) return null;
  return <div className="px-4 sm:px-0 animate-in fade-in duration-300">{children}</div>;
}
