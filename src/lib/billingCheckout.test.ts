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
    expect(isValidCheckoutUrl('https://sandbox.whop.com/checkout/plan_test', 'sandbox', 'whop')).toBe(true);
    expect(isValidCheckoutUrl('https://whop.com/checkout/plan_test', 'sandbox', 'whop')).toBe(false);

    // Production environment accepts only production PayPal
    expect(getApprovedPayPalOrigins('production')).toEqual(['https://www.paypal.com']);
    expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD', 'production')).toBe(true);
    expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-PROD', 'production')).toBe(false);
    expect(isValidCheckoutUrl('https://whop.com/checkout/plan_test', 'production', 'whop')).toBe(true);
    expect(isValidCheckoutUrl('https://sandbox.whop.com/checkout/plan_test', 'production', 'whop')).toBe(false);

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
      expect(isValidCheckoutUrl('https://sandbox.whop.com/checkout/plan_test', undefined, 'whop')).toBe(true);
      expect(isValidCheckoutUrl('https://whop.com/checkout/plan_test', undefined, 'whop')).toBe(false);

      // 2. VITE_BILLING_PUBLIC_MODE=production -> Live allowed, Sandbox rejected
      import.meta.env.VITE_BILLING_PUBLIC_MODE = 'production';
      expect(getApprovedPayPalOrigins()).toEqual(['https://www.paypal.com']);
      expect(isValidCheckoutUrl('https://www.paypal.com/checkoutnow?token=BA-PROD')).toBe(true);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/checkoutnow?token=BA-PROD')).toBe(false);
      expect(isValidCheckoutUrl('https://whop.com/checkout/plan_test', undefined, 'whop')).toBe(true);
      expect(isValidCheckoutUrl('https://sandbox.whop.com/checkout/plan_test', undefined, 'whop')).toBe(false);

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

      // 7. Canonical domain enforcement: wiseresume.app always enforces production PayPal origin
      const originalLocation = window.location;
      try {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: new URL('https://wiseresume.app/subscription'),
        });
        import.meta.env.VITE_BILLING_PUBLIC_MODE = 'sandbox';
        expect(getApprovedPayPalOrigins()).toEqual(['https://www.paypal.com']);
        expect(isValidCheckoutUrl('https://www.paypal.com/webapps/billing/subscriptions?ba_token=BA-PROD')).toBe(true);
        expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-SANDBOX')).toBe(false);
      } finally {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: originalLocation,
        });
      }
    } finally {
      if (originalPublicMode !== undefined) {
        import.meta.env.VITE_BILLING_PUBLIC_MODE = originalPublicMode;
      } else {
        delete import.meta.env.VITE_BILLING_PUBLIC_MODE;
      }
      if (originalBillingEnv !== undefined) {
        import.meta.env.VITE_BILLING_ENVIRONMENT = originalBillingEnv;
      } else {
        delete import.meta.env.VITE_BILLING_ENVIRONMENT;
      }
      if (originalCheckoutEnv !== undefined) {
        import.meta.env.VITE_CHECKOUT_ENVIRONMENT = originalCheckoutEnv;
      } else {
        delete import.meta.env.VITE_CHECKOUT_ENVIRONMENT;
      }
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

  it('supports getCouponQuote for 30-day access quotes', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        eligible: true,
        code: 'PROMO50',
        discount_type: 'percent',
        discount_value: 50,
        plan: 'pro',
        payment_mode: 'one_time',
        original_amount: 5,
        discount_amount: 2.5,
        final_amount: 2.5,
      },
      error: null,
    });
    const { getCouponQuote } = await import('./billingCheckout');
    const result = await getCouponQuote({
      plan: 'pro',
      paymentMode: 'one_time',
      couponCode: 'PROMO50',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.eligible).toBe(true);
      expect(result.quote.final_amount).toBe(2.5);
      expect(result.quote.discount_amount).toBe(2.5);
    }
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'quote', plan: 'pro', payment_mode: 'one_time', coupon_code: 'PROMO50' },
    });
  });

  it('supports captureBillingOrder for completing one-time checkout', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          order_id: 'ORD-12345',
          capture_id: 'CAP-67890',
          plan: 'pro',
          expires_at: '2026-10-07T12:00:00.000Z',
          payment_mode: 'one_time',
          state: 'entitled',
        },
      },
      error: null,
    });
    const { captureBillingOrder } = await import('./billingCheckout');
    const result = await captureBillingOrder('ORD-12345');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.order_id).toBe('ORD-12345');
      expect(result.data.state).toBe('entitled');
      expect(result.data.plan).toBe('pro');
    }
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: { action: 'capture-order', order_id: 'ORD-12345' },
    });
  });

  it('supports creating a one_time checkout session with a coupon code', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          session_reference: 'sess_onetime',
          plan: 'pro',
          state: 'created_or_reused',
          expires_at: '2026-09-08T10:00:00.000Z',
          checkout_reference: 'ORD-12345',
          checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=ORD-12345',
        },
      },
      error: null,
    });
    const { createBillingCheckoutSession } = await import('./billingCheckout');
    const result = await createBillingCheckoutSession('pro', {
      paymentMode: 'one_time',
      couponCode: 'SAVE50',
      idempotencyKey: 'test-idemp',
      environment: 'sandbox',
    });
    expect(result.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('billing-checkout', {
      body: {
        action: 'create-session',
        plan: 'pro',
        idempotency_key: 'test-idemp',
        payment_mode: 'one_time',
        coupon_code: 'SAVE50',
      },
    });
  });

  it('validates Whop Sandbox checkout URLs on wiseresume.app without explicit environment', async () => {
    const { isValidCheckoutUrl, getApprovedPayPalOrigins, billingCheckoutTestHelpers } = await import('./billingCheckout');
    const originalLocation = window.location;
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: new URL('https://wiseresume.app/subscription'),
      });

      // Whop defaults to Sandbox since Whop Production is not activated
      expect(isValidCheckoutUrl('https://sandbox.whop.com/checkout/plan_ECWULjIBMFBE5', undefined, 'whop')).toBe(true);
      expect(isValidCheckoutUrl('https://whop.com/checkout/plan_ECWULjIBMFBE5', undefined, 'whop')).toBe(false);
      expect(isValidCheckoutUrl('https://sandbox.whop.com.attacker.com/checkout', undefined, 'whop')).toBe(false);

      // PayPal remains strictly Production on wiseresume.app
      expect(getApprovedPayPalOrigins()).toEqual(['https://www.paypal.com']);
      expect(isValidCheckoutUrl('https://www.paypal.com/webapps/billing/subscriptions?ba_token=BA-PROD', undefined, 'paypal')).toBe(true);
      expect(isValidCheckoutUrl('https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-SANDBOX', undefined, 'paypal')).toBe(false);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('creates Whop Sandbox checkout session successfully on wiseresume.app', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          session_reference: 'sess_whop_123',
          plan: 'pro',
          provider: 'whop',
          state: 'created_or_reused',
          expires_at: '2026-09-09T12:00:00.000Z',
          checkout_reference: 'ch_whop_123',
          checkout_url: 'https://sandbox.whop.com/checkout/plan_ECWULjIBMFBE5?idempotency_key=web-123',
        },
      },
      error: null,
    });

    const { createBillingCheckoutSession, openServerCheckout } = await import('./billingCheckout');
    const originalLocation = window.location;
    const assignMock = vi.fn();
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          hostname: 'wiseresume.app',
          href: 'https://wiseresume.app/subscription',
          assign: assignMock,
        },
      });

      const result = await createBillingCheckoutSession('pro', {
        provider: 'whop',
        idempotencyKey: 'test-whop-idemp',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.checkout_url).toBe('https://sandbox.whop.com/checkout/plan_ECWULjIBMFBE5?idempotency_key=web-123');
        expect(result.session.provider).toBe('whop');
        expect(openServerCheckout(result.session)).toBe(true);
        expect(assignMock).toHaveBeenCalledWith('https://sandbox.whop.com/checkout/plan_ECWULjIBMFBE5?idempotency_key=web-123');
      }
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('shows checkout unavailable fallback only when session is malformed or URL is untrusted', async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          session_reference: 'sess_bad_url',
          plan: 'pro',
          provider: 'whop',
          state: 'created_or_reused',
          expires_at: '2026-09-09T12:00:00.000Z',
          checkout_url: 'https://evil-phishing-site.com/checkout',
        },
      },
      error: null,
    });

    const { createBillingCheckoutSession } = await import('./billingCheckout');
    const result = await createBillingCheckoutSession('pro', {
      provider: 'whop',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unknown');
      expect(result.message).toBe('Checkout is temporarily unavailable. Please try again later.');
    }
  });
});
