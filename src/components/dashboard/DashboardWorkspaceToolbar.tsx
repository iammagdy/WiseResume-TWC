import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface DashboardWorkspaceToolbarProps {
  userName?: string | null;
  className?: string;
}

export const DashboardWorkspaceToolbar = memo(function DashboardWorkspaceToolbar({
  userName,
  className,
}: DashboardWorkspaceToolbarProps) {
  const { t } = useLocale();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('app.dashboardStats.goodMorning', 'Good morning');
    if (hour < 17) return t('app.dashboardStats.goodAfternoon', 'Good afternoon');
    return t('app.dashboardStats.goodEvening', 'Good evening');
  }, [t]);

  const firstName = userName?.trim().split(/\s+/)[0];

  return (
    <header className={cn('dashboard-workspace-greeting mb-3', className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {firstName ? `${greeting}, ${firstName}` : greeting}
      </h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-snug">
        {t('app.dashboardPage.toolbarSubtitle', "Here's what to improve next across your resumes and applications.")}
      </p>
    </header>
  );
});
