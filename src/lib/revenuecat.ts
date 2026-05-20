import { Purchases } from '@revenuecat/purchases-js';

const RC_API_KEY = import.meta.env.VITE_REVENUECAT_WEB_API_KEY as string | undefined;

let _purchases: Purchases | null = null;

export function configureRevenueCat(appUserId: string): Purchases {
  if (!RC_API_KEY) {
    throw new Error('[RevenueCat] VITE_REVENUECAT_WEB_API_KEY is not set');
  }
  _purchases = Purchases.configure({ apiKey: RC_API_KEY, appUserId });
  return _purchases;
}

export function getRevenueCat(): Purchases {
  if (!_purchases) throw new Error('[RevenueCat] SDK not configured — call configureRevenueCat first');
  return _purchases;
}

export function isRevenueCatConfigured(): boolean {
  return _purchases !== null;
}

export function resetRevenueCat(): void {
  _purchases = null;
}
