export type PaymentStatus = 'available' | 'unavailable';
export type BillingMode = 'active' | 'disabled';

export interface BillingState {
  mode: BillingMode;
  paymentStatus: PaymentStatus;
  paymentsEnabled: boolean;
  availablePaymentMethods: string[];
  isSandboxTestMode: boolean;
}

export const billingState: BillingState = {
  mode: 'active',
  paymentStatus: 'available',
  paymentsEnabled: true,
  availablePaymentMethods: ['paypal'],
  isSandboxTestMode: false,
};

export function isSandboxTestMode() {
  return false;
}

export function isBillingComingSoon() {
  return false;
}
