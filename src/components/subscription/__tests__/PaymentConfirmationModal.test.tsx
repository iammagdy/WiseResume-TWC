import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentConfirmationModal } from '../PaymentConfirmationModal';
import * as billingModule from '@/lib/billingCheckout';
import { LocaleProvider } from '@/i18n/LocaleProvider';

const renderModal = (props: React.ComponentProps<typeof PaymentConfirmationModal>) =>
  render(<LocaleProvider initialLocale="en"><PaymentConfirmationModal {...props} /></LocaleProvider>);

vi.mock('@/lib/billingCheckout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/billingCheckout')>()),
  createBillingCheckoutSession: vi.fn(),
  openServerCheckout: vi.fn(),
}));

describe('PaymentConfirmationModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders recurring pricing with Whop selected as the default', () => {
    renderModal({ open: true, onOpenChange: vi.fn(), plan: 'pro' });
    expect(screen.getByText(/Upgrade to Pro/i)).toBeDefined();
    expect(screen.getByText('Monthly recurring subscription')).toBeDefined();
    expect(screen.getByText('Whop')).toBeDefined();
    expect(screen.getByRole('button', { name: /continue with whop/i })).toBeDefined();
    expect(screen.queryByText('30-Day Access')).toBeNull();
    expect(screen.queryByText(/coupon code/i)).toBeNull();
  });

  it('supports Ultimate pricing and explicit PayPal selection', () => {
    renderModal({ open: true, onOpenChange: vi.fn(), plan: 'premium' });
    expect(screen.getByText(/Upgrade to Ultimate/i)).toBeDefined();
    expect(screen.getByText('$10.00')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /paypal alternative/i }));
    expect(screen.getByRole('button', { name: /continue with paypal/i })).toBeDefined();
  });

  it('sends provider preference while keeping plan and amount server-owned', async () => {
    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({
      ok: true,
      session: { session_reference: 'sess_123', checkout_url: 'https://sandbox.whop.com/checkout/ch_123', plan: 'pro', state: 'created_or_reused', expires_at: new Date(Date.now() + 3600000).toISOString(), provider: 'whop' },
    });
    vi.mocked(billingModule.openServerCheckout).mockReturnValueOnce(true);
    const onSuccess = vi.fn();
    renderModal({ open: true, onOpenChange: vi.fn(), plan: 'pro', onSuccess });
    fireEvent.click(screen.getByRole('button', { name: /continue with whop/i }));
    await waitFor(() => expect(billingModule.createBillingCheckoutSession).toHaveBeenCalledWith('pro', expect.objectContaining({ provider: 'whop', environment: undefined })));
    expect(billingModule.createBillingCheckoutSession.mock.calls[0][1]).not.toHaveProperty('couponCode');
    expect(billingModule.createBillingCheckoutSession.mock.calls[0][1]).not.toHaveProperty('paymentMode');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a safe checkout error', async () => {
    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({ ok: false, code: 'provider_unavailable', message: 'Checkout unavailable.', retryable: false });
    renderModal({ open: true, onOpenChange: vi.fn(), plan: 'pro' });
    fireEvent.click(screen.getByRole('button', { name: /continue with whop/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Checkout unavailable.'));
  });
});
