import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { DashboardStats } from '@/components/wisehire/dashboard/DashboardStats';
import { RecentBriefs } from '@/components/wisehire/dashboard/RecentBriefs';
import { QuickActions } from '@/components/wisehire/dashboard/QuickActions';
import { PipelineBreakdown } from '@/components/wisehire/dashboard/PipelineBreakdown';
import { RecentActivity } from '@/components/wisehire/dashboard/RecentActivity';

const NUDGE_DISMISSED_KEY = 'wh_onboarding_nudge_dismissed';

export default function WiseHireDashboardPage() {
  const { data: account } = useWiseHireAccount();
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return sessionStorage.getItem(NUDGE_DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const showNudge =
    !nudgeDismissed &&
    account !== undefined &&
    account.company !== null &&
    !account.company.onboarding_completed;

  function dismissNudge() {
    try { sessionStorage.setItem(NUDGE_DISMISSED_KEY, '1'); } catch { /**/ }
    setNudgeDismissed(true);
  }

  return (
    <WiseHireShell>
      <div className="p-5 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Welcome back — here's your hiring overview.
          </p>
        </div>

        {/* Onboarding nudge banner */}
        {showNudge && (
          <div className="relative flex items-center gap-4 bg-blue-700 text-white rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5">Complete your company setup</p>
              <p className="text-xs opacity-80 leading-relaxed">
                Finish onboarding to unlock your full WiseHire workspace — takes about 2 minutes.
              </p>
            </div>
            <Link to="/wisehire/onboarding" className="shrink-0">
              <Button
                size="sm"
                variant="secondary"
                className="text-blue-700 font-semibold whitespace-nowrap"
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
            <button
              onClick={dismissNudge}
              className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Stats */}
        <DashboardStats />

        {/* Pipeline breakdown + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PipelineBreakdown />
          <RecentActivity />
        </div>

        {/* Quick actions */}
        <QuickActions />

        {/* Recent briefs */}
        <RecentBriefs />
      </div>
    </WiseHireShell>
  );
}
