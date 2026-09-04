import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: invokeMock },
}));

describe('server-owned billing checkout client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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
    const result = await createBillingCheckoutSession('premium', { idempotencyKey: 'retry-key', environment: 'sandbox' });
    expect(result.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'create-session', plan: 'premium', idempotency_key: 'retry-key' },
    });
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('user_id');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('environment');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('price_id');
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('transaction_id');
  });

  it('maps a disabled server response to a non-retryable safe error', async () => {
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

  it('cancels billing subscription via server-derived identity and sanitizes response envelope', async () => {
    invokeMock.mockResolvedValue({
      data: { status: 'success', canceled: true, message: 'Cancellation request accepted.' },
      error: null,
    });
    const { cancelBillingSubscription } = await import('./billingCheckout');
    const result = await cancelBillingSubscription({ reason: 'User requested cancellation' });
    expect(result.ok).toBe(true);
    expect(result).toEqual({ ok: true, canceled: true });
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'cancel-subscription', reason: 'User requested cancellation' },
    });
    // Strict contract defense: never send or return subscription_id
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('subscription_id');
    expect(result).not.toHaveProperty('subscriptionId');
    expect(result).not.toHaveProperty('subscription_id');
  });

  it('enforces environment-specific origin validation for sandbox and production', async () => {
    const { getApprovedPayPalOrigins, isValidCheckoutUrl } = await import('./billingCheckout');

    // Sandbox environment accepts only sandbox PayPal
    expect(getApprovedPayPalOrigins('sandbox')).toEqual(['https://www.sandbox.paypal.com']);
    expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST', 'sandbox')).toBe(true);
    expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-TEST', 'sandbox')).toBe(false);

    // Production environment accepts only production PayPal
    expect(getApprovedPayPalOrigins('production')).toEqual(['https://www.paypal.com']);
    expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD', 'production')).toBe(true);
    expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-PROD', 'production')).toBe(false);

    // Unknown or untrusted environment strictly fails closed
    expect(getApprovedPayPalOrigins('unknown')).toEqual([]);
    expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST', 'unknown')).toBe(false);
    expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-TEST', 'unknown')).toBe(false);

    // Phishing or third-party origins are unconditionally rejected
    expect(isValidCheckoutUrl('https://paypal.com.attacker.com/checkoutnow', 'production')).toBe(false);
    expect(isValidCheckoutUrl('https://malicious-site.com/checkout', 'sandbox')).toBe(false);
  });

  it('derives approved origins from VITE_BILLING_PUBLIC_MODE with deterministic precedence', async () => {
    const { getApprovedPayPalOrigins, isValidCheckoutUrl } = await import('./billingCheckout');
    const originalPublicMode = import.meta.env.VITE_BILLING_PUBLIC_MODE;
    const originalBillingEnv = import.meta.env.VITE_BILLING_ENVIRONMENT;
    const originalCheckoutEnv = import.meta.env.VITE_CHECKOUT_ENVIRONMENT;

    try {
      // 1. VITE_BILLING_PUBLIC_MODE=sandbox -> Sandbox allowed, Live rejected
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'sandbox';
      delete import.meta.env.VITE_BILLING_ENVIRONMENT;
      delete import.meta.env.VITE_CHECKOUT_ENVIRONMENT;
      expect(getApprovedPayPalOrigins()).toEqual(['https://www.sandbox.paypal.com']);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST')).toBe(true);
      expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-TEST')).toBe(false);

      // 2. VITE_BILLING_PUBLIC_MODE=production -> Live allowed, Sandbox rejected
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'production';
      expect(getApprovedPayPalOrigins()).toEqual(['https://www.paypal.com']);
      expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD')).toBe(true);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-PROD')).toBe(false);

      // 3. disabled -> both rejected
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'disabled';
      expect(getApprovedPayPalOrigins()).toEqual([]);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST')).toBe(false);
      expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD')).toBe(false);

      // 4. unknown / empty -> both rejected
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'unknown_env';
      expect(getApprovedPayPalOrigins()).toEqual([]);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST')).toBe(false);
      expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD')).toBe(false);

      import.meta.env.VITE_BILLING_PUBLIC_MODE = '';
      expect(getApprovedPayPalOrigins()).toEqual([]);

      // 5. Precedence: explicit argument overrides VITE_BILLING_PUBLIC_MODE
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'production';
      expect(getApprovedPayPalOrigins('sandbox')).toEqual(['https://www.sandbox.paypal.com']);

      // 6. Precedence: VITE_BILLING_PUBLIC_MODE takes precedence over fallback VITE_BILLING_ENVIRONMENT
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'sandbox';
      import.meta.env.VITE_BILLING_ENVIRONMENT = 'production';
      expect(getApprovedPayPalOrigins()).toEqual(['https://www.sandbox.paypal.com']);
    } finally {
      import.meta.env.VITE_BILLING_PUBLIC_MODE = originalPublicMode;
      import.meta.env.VITE_BILLING_ENVIRONMENT = originalBillingEnv;
      import.meta.env.VITE_CHECKOUT_ENVIRONMENT = originalCheckoutEnv;
    }
  });

  it('manages plan attempt keys in sessionStorage correctly across lifecycle', async () => {
    const { getOrCreatePlanAttemptKey, clearPlanAttemptKey, getPlanAttemptStorageKey } = await import('./billingCheckout');

    // Generates key and persists in sessionStorage
    const proKey1 = getOrCreatePlanAttemptKey('pro');
    expect(proKey1).toMatch(/^web-/);
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('pro'))).toBe(proKey1);

    // Reuses existing key for same plan
    const proKey2 = getOrCreatePlanAttemptKey('pro');
    expect(proKey2).toBe(proKey1);

    // Separate key for premium plan
    const premKey = getOrCreatePlanAttemptKey('premium');
    expect(premKey).toMatch(/^web-/);
    expect(premKey).not.toBe(proKey1);
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('premium'))).toBe(premKey);

    // Clear pro plan key leaves premium intact
    clearPlanAttemptKey('pro');
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('pro'))).toBeNull();
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('premium'))).toBe(premKey);

    // Clear all keys removes both
    getOrCreatePlanAttemptKey('pro');
    clearPlanAttemptKey();
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('pro'))).toBeNull();
    expect(sessionStorage.getItem(getPlanAttemptStorageKey('premium'))).toBeNull();
  });

  it('validates approved PayPal origins in openServerCheckout', async () => {
    const { openServerCheckout } = await import('./billingCheckout');
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: assignMock },
      writable: true,
    });

    // Valid sandbox PayPal origin when environment is sandbox
    const valid = openServerCheckout({
      session_reference: 'ref',
      plan: 'pro',
      state: 'created_or_reused',
      expires_at: '2026-09-01T00:00:00Z',
      checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-VALID',
    }, 'sandbox');
    expect(valid).toBe(true);
    expect(assignMock).toHaveBeenCalledWith('https://www.sandbox.paypal.com/checkoutnow?token=BA-VALID');

    // Invalid/malicious origin rejected
    const invalid = openServerCheckout({
      session_reference: 'ref',
      plan: 'pro',
      state: 'created_or_reused',
      expires_at: '2026-09-01T00:00:00Z',
      checkout_url: 'https://malicious-phishing.test/checkout',
    }, 'sandbox');
    expect(invalid).toBe(false);
  });

  it('maps plan_change_unavailable to a non-retryable error with correct fallback message', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { code: 'plan_change_unavailable' },
    });
    const { createBillingCheckoutSession } = await import('./billingCheckout');
    const result = await createBillingCheckoutSession('premium');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('plan_change_unavailable');
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Plan changes are temporarily unavailable.');
    }
  });
});
