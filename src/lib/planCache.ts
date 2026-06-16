import type { PlanName } from '@/hooks/usePlan';

const CACHE_KEY = 'wr_plan_cache';
const TTL_MS = 15 * 60 * 1000; // 15 minutes — aligns with useMe staleTime

export interface PlanCacheEntry {
  plan: PlanName;
  trialPlan: string | null;
  trialExpiresAt: string | null;
  cachedAt: number;
}

export function readPlanCache(): PlanCacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PlanCacheEntry;
    if (!entry?.cachedAt || Date.now() - entry.cachedAt > TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export function writePlanCache(
  plan: PlanName,
  trialPlan: string | null,
  trialExpiresAt: string | null,
): void {
  try {
    const entry: PlanCacheEntry = { plan, trialPlan, trialExpiresAt, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function clearPlanCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
