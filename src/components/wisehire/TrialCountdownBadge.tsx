import { Link } from 'react-router-dom';
import { Clock, Sparkles } from 'lucide-react';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';

/**
 * Shows a trial countdown badge in the WiseHire UI.
 * - Active trial: "N days left in trial" (red/amber when ≤ 3 days)
 * - Coupon plan (no trial): "Early Access"
 * - No trial, no coupon: hidden
 */
export function TrialCountdownBadge() {
  const { data, isLoading } = useWiseHireAccount();

  if (isLoading || !data) return null;

  const { isTrialActive, daysRemaining, subscription } = data;

  if (isTrialActive) {
    const isUrgent = daysRemaining <= 3;
    return (
      <Link
        to="/wisehire/subscription"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          isUrgent
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
        }`}
      >
        <Clock className="h-3 w-3" />
        {daysRemaining === 0
          ? 'Trial expires today'
          : daysRemaining === 1
          ? '1 day left in trial'
          : `${daysRemaining} days left in trial`}
      </Link>
    );
  }

  if (subscription?.coupon_code) {
    return (
      <Link
        to="/wisehire/subscription"
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 text-xs font-semibold transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        Early Access
      </Link>
    );
  }

  return null;
}
