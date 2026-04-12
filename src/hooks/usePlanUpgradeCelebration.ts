import { useEffect, useRef } from 'react';
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

export function usePlanUpgradeCelebration() {
  const { plan, isLoading } = usePlan();
  const firedRef = useRef(false);

  useEffect(() => {
    if (isLoading || firedRef.current || plan === 'free') return;

    const lastKnown = (localStorage.getItem(STORAGE_KEY) ?? 'free') as PlanName;

    if (plan === lastKnown) return;

    localStorage.setItem(STORAGE_KEY, plan);

    if (PLAN_TIER[plan] > PLAN_TIER[lastKnown]) {
      const key = `${lastKnown}→${plan}`;
      const message = UPGRADE_MESSAGES[key];
      if (message) {
        firedRef.current = true;
        setTimeout(() => {
          toast.success(message, { duration: 6000, icon: '🎉' });
        }, 800);
      }
    }
  }, [plan, isLoading]);
}
