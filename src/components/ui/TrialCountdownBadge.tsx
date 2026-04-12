import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';

export function TrialCountdownBadge() {
  const { data: meData } = useMe();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const trialPlan = meData?.subscription?.trial_plan ?? null;
  const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
  const isActiveTrial =
    !!trialPlan &&
    !!trialExpiresAt &&
    new Date(trialExpiresAt) > new Date();

  if (!isActiveTrial) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialExpiresAt!).getTime() - Date.now()) / 86_400_000),
  );

  const planLabel = trialPlan === 'premium' ? 'Premium' : 'Pro';
  const isPremiumTrial = trialPlan === 'premium';

  return (
    <button
      onClick={() => navigate('/subscription')}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors touch-manipulation active:scale-95 ${
        isPremiumTrial
          ? 'bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
          : 'bg-violet-500/10 border-violet-400/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20'
      }`}
      aria-label={`${planLabel} Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. View subscription.`}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span className="whitespace-nowrap">
        {planLabel} Trial · {daysLeft}d left
      </span>
      <span
        role="button"
        aria-label="Dismiss trial badge"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </span>
    </button>
  );
}
