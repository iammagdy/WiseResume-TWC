export type PaymentStatus = 'available' | 'unavailable';
export type BillingMode = 'active' | 'disabled';

export interface BillingState {
  mode: BillingMode;
  paymentStatus: PaymentStatus;
  paymentsEnabled: boolean;
  availablePaymentMethods: string[];
  isSandboxTestMode: boolean;
}

/**
 * Fail-closed internal configuration model.
 * In default unconfigured runtime state, payments remain disabled and unavailable.
 * Server-authoritative checkout readiness (can_subscribe) is determined dynamically
 * by the backend API per-user, never trusted to client-side flags.
 */
export const billingState: BillingState = {
  mode: 'disabled',
  paymentStatus: 'unavailable',
  paymentsEnabled: false,
  availablePaymentMethods: [],
  isSandboxTestMode: false,
};

export function isSandboxTestMode(): boolean {
  return false;
}

export function isBillingComingSoon(): boolean {
  return !billingState.paymentsEnabled;
}
