import { useEffect } from 'react';
import { toast } from 'sonner';
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

const STORAGE_KEY = 'wr-last-known-plan';
const SESSION_FIRED_KEY = 'wr-upgrade-toast-fired';

export function usePlanUpgradeCelebration() {
  const { plan, isLoading } = usePlan();

  useEffect(() => {
    if (isLoading) return;

    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (storedValue === null) {
      // First time we've ever run this hook for this user (or after storage clear).
      // Establish baseline without firing a toast — there was no observed transition.
      localStorage.setItem(STORAGE_KEY, plan);
      return;
    }

    const lastKnown = storedValue as PlanName;

    if (plan === lastKnown) return;

    // Update the stored plan so the next session treats this as the new baseline.
    localStorage.setItem(STORAGE_KEY, plan);

    // Only celebrate actual upgrades (not downgrades or lateral moves).
    if (PLAN_TIER[plan] > PLAN_TIER[lastKnown]) {
      const key = `${lastKnown}→${plan}`;
      const message = UPGRADE_MESSAGES[key];
      if (!message) return;

      // Use sessionStorage as a cross-mount dedup guard: only one surface fires per session.
      if (sessionStorage.getItem(SESSION_FIRED_KEY)) return;
      sessionStorage.setItem(SESSION_FIRED_KEY, '1');

      setTimeout(() => {
        toast.success(message, { duration: 6000, icon: '🎉' });
      }, 800);
    }
  }, [plan, isLoading]);
}
