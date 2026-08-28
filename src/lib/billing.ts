export type PaymentStatus = 'coming_soon' | 'sandbox_unavailable';
export type BillingMode = 'sandbox' | 'disabled';

const configuredMode = String(import.meta.env.VITE_BILLING_PUBLIC_MODE ?? 'sandbox').trim().toLowerCase();

export interface BillingState {
  mode: BillingMode;
  paymentStatus: PaymentStatus;
  paymentsEnabled: false;
  availablePaymentMethods: string[];
  isSandboxTestMode: boolean;
}

export const billingState: BillingState = {
  mode: configuredMode === 'sandbox' ? 'sandbox' : 'disabled',
  paymentStatus: configuredMode === 'sandbox' ? 'sandbox_unavailable' : 'coming_soon',
  paymentsEnabled: false,
  availablePaymentMethods: [],
  isSandboxTestMode: configuredMode === 'sandbox',
};

export function isSandboxTestMode() {
  return billingState.isSandboxTestMode;
}

export function isBillingComingSoon() {
  return billingState.paymentStatus === 'coming_soon';
}
