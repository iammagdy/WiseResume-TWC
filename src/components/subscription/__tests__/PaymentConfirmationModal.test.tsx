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

  it('regression: clears stale attempt key on modal open and does not reuse consumed key on explicit retry', async () => {
    sessionStorage.setItem('wr_billing_attempt_pro', 'web-stale-consumed-key-123');
    sessionStorage.setItem('wr_billing_attempt_pro_ts', String(Date.now() - 3600000));

    // Opening modal clears stale key
    const { rerender } = render(
      <LocaleProvider initialLocale="en">
        <PaymentConfirmationModal open={true} onOpenChange={vi.fn()} plan="pro" />
      </LocaleProvider>
    );
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();

    // First checkout attempt generates key A and encounters idempotency conflict
    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({
      ok: false,
      code: 'idempotency_conflict',
      message: 'This checkout request key cannot be replayed.',
      retryable: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /continue with whop/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This checkout request key cannot be replayed.'));

    const firstKey = vi.mocked(billingModule.createBillingCheckoutSession).mock.calls[0][1]?.idempotencyKey;
    expect(firstKey).toMatch(/^web-/);
    // Key was cleared upon receiving non-retryable idempotency conflict
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();

    // User explicitly retries: second call receives a FRESH distinct attempt key
    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({
      ok: true,
      session: {
        session_reference: 'sess_fresh',
        checkout_url: 'https://sandbox.whop.com/checkout/ch_fresh',
        plan: 'pro',
        state: 'created_or_reused',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        provider: 'whop',
      },
    });
    vi.mocked(billingModule.openServerCheckout).mockReturnValueOnce(true);

    fireEvent.click(screen.getByRole('button', { name: /continue with whop/i }));
    await waitFor(() => expect(billingModule.createBillingCheckoutSession).toHaveBeenCalledTimes(2));

    const secondKey = vi.mocked(billingModule.createBillingCheckoutSession).mock.calls[1][1]?.idempotencyKey;
    expect(secondKey).toMatch(/^web-/);
    expect(secondKey).not.toBe(firstKey);

    // Closing modal also purges attempt key
    rerender(
      <LocaleProvider initialLocale="en">
        <PaymentConfirmationModal open={false} onOpenChange={vi.fn()} plan="pro" />
      </LocaleProvider>
    );
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();
  });
});
