import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DashboardWorkspaceToolbarProps {
  userName?: string | null;
  className?: string;
}

export const DashboardWorkspaceToolbar = memo(function DashboardWorkspaceToolbar({
  userName,
  className,
}: DashboardWorkspaceToolbarProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName?.trim().split(/\s+/)[0];

  return (
    <header className={cn('dashboard-workspace-greeting mb-3', className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {firstName ? `${greeting}, ${firstName}` : greeting}
        <span className="ml-1.5" aria-hidden>
          👋
        </span>
      </h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-snug">
        Here&apos;s what to improve next across your resumes and applications.
      </p>
    </header>
  );
});
