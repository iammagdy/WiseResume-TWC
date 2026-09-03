import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: invokeMock },
}));

describe('server-owned billing checkout client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends only the internal plan contract and accepts a safe server session', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          session_reference: 'sess_public',
          plan: 'premium',
          state: 'created_or_reused',
          expires_at: '2026-08-28T10:15:00.000Z',
          checkout_reference: 'paypal_public_reference',
          checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
        },
      },
      error: null,
    });
    const { createBillingCheckoutSession } = await import('./billingCheckout');
    const result = await createBillingCheckoutSession('premium', { idempotencyKey: 'retry-key' });
    expect(result.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'create-session', plan: 'premium', idempotency_key: 'retry-key' },
    });
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('user_id');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('environment');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('price_id');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('transaction_id');
  });

  it('maps a disabled server response to a retryable safe error', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { code: 'payments_disabled', message: 'Subscription enrollments are currently closed.' },
    });
    const { createBillingCheckoutSession } = await import('./billingCheckout');
    await expect(createBillingCheckoutSession('pro')).resolves.toMatchObject({
      ok: false,
      code: 'payments_disabled',
      retryable: false,
    });
  });

  it('rejects malformed success envelopes instead of claiming checkout success', async () => {
    invokeMock.mockResolvedValue({ data: { status: 'success', data: { plan: 'ultimate' } }, error: null });
    const { createBillingCheckoutSession } = await import('./billingCheckout');
    await expect(createBillingCheckoutSession('pro')).resolves.toMatchObject({ ok: false, code: 'unknown' });
  });

  it('cancels billing subscription successfully via cancelBillingSubscription', async () => {
    invokeMock.mockResolvedValue({
      data: { status: 'success', canceled: true, subscription_id: 'I-SUB12345' },
      error: null,
    });
    const { cancelBillingSubscription } = await import('./billingCheckout');
    const result = await cancelBillingSubscription({ subscriptionId: 'I-SUB12345', reason: 'User cancel' });
    expect(result.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'cancel-subscription', subscription_id: 'I-SUB12345', reason: 'User cancel' },
    });
  });

  it('validates approved PayPal origins in openServerCheckout', async () => {
    const { openServerCheckout } = await import('./billingCheckout');
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: assignMock },
      writable: true,
    });

    // Valid sandbox PayPal origin
    const valid = openServerCheckout({
      session_reference: 'ref',
      plan: 'pro',
      state: 'created_or_reused',
      expires_at: '2026-09-01T00:00:00Z',
      checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-VALID',
    });
    expect(valid).toBe(true);
    expect(assignMock).toHaveBeenCalledWith('https://www.sandbox.paypal.com/checkoutnow?token=BA-VALID');

    // Invalid/malicious origin rejected
    const invalid = openServerCheckout({
      session_reference: 'ref',
      plan: 'pro',
      state: 'created_or_reused',
      expires_at: '2026-09-01T00:00:00Z',
      checkout_url: 'https://malicious-phishing.test/checkout',
    });
    expect(invalid).toBe(false);
  });
});
