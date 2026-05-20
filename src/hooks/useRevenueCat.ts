import { useState, useEffect, useCallback } from 'react';
import { type Package, type Offering, type CustomerInfo, ErrorCode } from '@revenuecat/purchases-js';
import { getRevenueCat, isRevenueCatConfigured } from '@/lib/revenuecat';
import { useRevenueCatReady } from '@/providers/RevenueCatProvider';

export type { Package, CustomerInfo };

interface UseRevenueCatReturn {
  /** Current offering loaded from RC dashboard */
  offering: Offering | null;
  /** Packages sorted cheapest → most expensive (Pro first, Premium second) */
  packages: Package[];
  loadingOfferings: boolean;
  purchasing: boolean;
  /**
   * Purchase a package. Returns customerInfo on success.
   * Throws PurchasesError on failure; UserCancelledError when user cancels.
   */
  purchase: (pkg: Package) => Promise<CustomerInfo>;
  /** Fetch fresh customer info including entitlements + managementURL */
  getCustomerInfo: () => Promise<CustomerInfo>;
  /** Reload offerings from RC */
  reloadOfferings: () => void;
}

export function useRevenueCat(): UseRevenueCatReturn {
  const ready = useRevenueCatReady();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const loadOfferings = useCallback(() => {
    if (!ready || !isRevenueCatConfigured()) return;
    setLoadingOfferings(true);
    getRevenueCat()
      .getOfferings()
      .then((o) => setOffering(o.current))
      .catch((e) => console.warn('[RevenueCat] Failed to load offerings:', e))
      .finally(() => setLoadingOfferings(false));
  }, [ready]);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const packages: Package[] = (offering?.availablePackages ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.webBillingProduct.currentPrice.amountMicros ?? 0) -
        (b.webBillingProduct.currentPrice.amountMicros ?? 0),
    );

  const purchase = useCallback(async (pkg: Package): Promise<CustomerInfo> => {
    if (!isRevenueCatConfigured()) throw new Error('RevenueCat not configured');
    setPurchasing(true);
    try {
      const result = await getRevenueCat().purchase({ rcPackage: pkg });
      return result.customerInfo;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const getCustomerInfo = useCallback((): Promise<CustomerInfo> => {
    if (!isRevenueCatConfigured()) return Promise.reject(new Error('RevenueCat not configured'));
    return getRevenueCat().getCustomerInfo();
  }, []);

  return {
    offering,
    packages,
    loadingOfferings,
    purchasing,
    purchase,
    getCustomerInfo,
    reloadOfferings: loadOfferings,
  };
}

/** Returns true if the PurchasesError represents a user cancellation. */
export function isPurchaseCancelled(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'errorCode' in e &&
    (e as { errorCode: number }).errorCode === ErrorCode.UserCancelledError
  );
}
