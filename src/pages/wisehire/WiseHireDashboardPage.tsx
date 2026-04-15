import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { TrialCountdownBadge } from '@/components/wisehire/TrialCountdownBadge';

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
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-lg font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            WiseHire
          </span>
          <p className="text-xs text-slate-400">Dashboard</p>
        </div>
        <TrialCountdownBadge />
      </div>

      {/* Onboarding nudge banner */}
      {showNudge && (
        <div className="relative flex items-center gap-4 bg-blue-700 text-white rounded-xl px-5 py-4 mb-6 shadow-sm">
          <Building2 className="h-5 w-5 shrink-0 opacity-80" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5">Complete your company setup</p>
            <p className="text-xs opacity-80">
              Finish onboarding to unlock your full WiseHire workspace.
            </p>
          </div>
          <Link to="/wisehire/onboarding" className="shrink-0">
            <Button size="sm" variant="secondary" className="text-blue-700 font-semibold whitespace-nowrap">
              Continue setup
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

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 mx-auto mb-4">
          <Building2 className="h-8 w-8 text-blue-700 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          WiseHire Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Your hiring command centre is being built — coming in Phase 9.
        </p>
        {account?.company && !account.company.onboarding_completed && (
          <Link to="/wisehire/onboarding">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white">
              Complete onboarding
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
