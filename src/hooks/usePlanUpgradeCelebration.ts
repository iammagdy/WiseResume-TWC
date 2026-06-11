import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useMe } from './useMe';
import { usePlan } from './usePlan';
import type { PlanName } from './usePlan';

const PLAN_TIER: Record<PlanName, number> = { free: 0, pro: 1, premium: 2 };

const UPGRADE_MESSAGES: Record<string, string> = {
  'free→pro':
    "Welcome to Pro! You've unlocked AI tools, unlimited resume tailoring, and the Application Tracker.",
  'free→premium':
    "Welcome to Premium! You have unlimited AI credits, full Analytics, and every Pro feature.",
  'pro→premium':
    "Upgraded to Premium! Unlimited AI credits and Analytics are now unlocked for you.",
};

function storageKey(userId: string) {
  return `wr-last-known-plan:${userId}`;
}

function celebratedKey(userId: string, transition: string) {
  return `wr-plan-upgrade-celebrated:${userId}:${transition}`;
}

export function usePlanUpgradeCelebration() {
  const { user } = useAuth();
  const { plan, isLoading } = usePlan();
  const { isFetching, isSuccess, data: meData } = useMe();

  useEffect(() => {
    const userId = user?.id;
    if (!userId || isLoading || isFetching || !isSuccess) return;

    // Ignore transient "free" reads when subscription payload is missing (failed fetch).
    if (plan === 'free' && !meData?.subscription) return;

    const key = storageKey(userId);
    let storedValue = localStorage.getItem(key);

    // Migrate legacy global key (pre-user-scoping).
    if (storedValue === null) {
      const legacy = localStorage.getItem('wr-last-known-plan');
      if (legacy) {
        storedValue = legacy;
        localStorage.setItem(key, legacy);
        localStorage.removeItem('wr-last-known-plan');
        // Heal corrupted "free" storage when the account is already on a paid plan.
        if (legacy === 'free' && PLAN_TIER[plan] > PLAN_TIER.free) {
          localStorage.setItem(key, plan);
          localStorage.setItem(celebratedKey(userId, `free→${plan}`), '1');
          return;
        }
      }
    }

    if (storedValue === null) {
      localStorage.setItem(key, plan);
      // Already subscribed — don't treat the first read as a fresh upgrade.
      if (PLAN_TIER[plan] > PLAN_TIER.free) {
        for (const from of ['free', 'pro'] as PlanName[]) {
          if (PLAN_TIER[plan] > PLAN_TIER[from]) {
            localStorage.setItem(celebratedKey(userId, `${from}→${plan}`), '1');
          }
        }
      }
      return;
    }

    const lastKnown = storedValue as PlanName;
    if (plan === lastKnown) return;

    const transition = `${lastKnown}→${plan}`;
    const isUpgrade = PLAN_TIER[plan] > PLAN_TIER[lastKnown];

    // Never persist a downgrade — subscription fetches can briefly default to free.
    if (isUpgrade) {
      localStorage.setItem(key, plan);
    }

    if (!isUpgrade) return;

    const message = UPGRADE_MESSAGES[transition];
    if (!message) return;

    if (localStorage.getItem(celebratedKey(userId, transition))) return;

    localStorage.setItem(celebratedKey(userId, transition), '1');

    setTimeout(() => {
      toast.success(message, { duration: 6000, icon: '🎉' });
    }, 800);
  }, [user?.id, plan, isLoading, isFetching, isSuccess, meData?.subscription]);
}
