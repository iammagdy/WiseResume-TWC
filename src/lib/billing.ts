export type PaymentStatus = 'coming_soon';

export interface BillingState {
  paymentStatus: PaymentStatus;
  paymentsEnabled: boolean;
  availablePaymentMethods: string[];
}

export const billingState: BillingState = {
  paymentStatus: 'coming_soon',
  paymentsEnabled: false,
  availablePaymentMethods: [],
};

export function isBillingComingSoon() {
  return billingState.paymentStatus === 'coming_soon';
}
