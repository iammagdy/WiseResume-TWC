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
          checkout_reference: 'paddle_public_reference',
          checkout_url: 'https://checkout.example.test/session',
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
      error: { code: 'payments_disabled', message: 'Checkout is not available.' },
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
});
