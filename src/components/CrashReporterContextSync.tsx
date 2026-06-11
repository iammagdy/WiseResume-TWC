import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { setCrashReporterContext, clearCrashReporterContext } from '@/lib/crashReportContext';
import { setMonitoringUser } from '@/lib/monitoring';

/**
 * Keeps module-level crash reporter context in sync with auth/plan state
 * so ErrorBoundary (class component) can attach user + tier to auto reports.
 */
export function CrashReporterContextSync() {
  const { user, authReady } = useAuth();
  const { plan, isPremium, isLoading: planLoading } = usePlan();

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      clearCrashReporterContext();
      setMonitoringUser(null);
      return;
    }

    setMonitoringUser(user.id);
    setCrashReporterContext({
      userId: user.id,
      userEmail: user.email || null,
      userName: user.name || null,
      planTier: planLoading ? null : plan,
      isPremium: planLoading ? false : isPremium,
    });
  }, [user, authReady, plan, isPremium, planLoading]);

  return null;
}
