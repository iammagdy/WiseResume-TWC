import { appwriteFunctions } from '@/lib/appwrite-functions';

export type BillingCheckoutPlan = 'pro' | 'premium';
export type BillingCheckoutProvider = 'whop' | 'paypal';
export type BillingPaymentMode = 'subscription' | 'one_time';

export type BillingCheckoutErrorCode =
  | 'unauthorized'
  | 'already_entitled'
  | 'checkout_in_progress'
  | 'idempotency_conflict'
  | 'payments_disabled'
  | 'state_unavailable'
  | 'catalog_mismatch'
  | 'environment_mismatch'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'invalid_request'
  | 'plan_change_unavailable'
  | 'cancellation_failed'
  | 'not_found'
  | 'invalid_coupon'
  | 'coupon_already_redeemed'
  | 'coupon_not_supported_for_recurring'
  | 'qa_unauthorized'
  | 'active_paid_entitlement_exists'
  | 'active_recurring_subscription_exists'
  | 'active_higher_plan_exists'
  | 'unknown';

export type BillingCheckoutSession = {
  session_reference: string;
  plan: BillingCheckoutPlan;
  state: 'created_or_reused';
  expires_at: string;
  checkout_reference?: string;
  checkout_url?: string;
  provider?: BillingCheckoutProvider;
};

export type BillingCheckoutResult =
  | { ok: true; session: BillingCheckoutSession }
  | { ok: false; code: BillingCheckoutErrorCode; message: string; retryable: boolean };

export type CancelSubscriptionResult =
  | { ok: true; canceled: boolean }
  | { ok: false; code: BillingCheckoutErrorCode; message: string };

export type CouponQuote = {
  eligible: boolean;
  code?: string;
  reason?: string;
  message?: string;
  plan: BillingCheckoutPlan;
  payment_mode: BillingPaymentMode;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  discount_type?: string;
  discount_value?: number;
};

export type CouponQuoteResult =
  | { ok: true; quote: CouponQuote }
  | { ok: false; code: BillingCheckoutErrorCode; message: string };

export type CaptureOrderResult =
  | {
      ok: true;
      data: {
        order_id: string;
        capture_id: string;
        plan: BillingCheckoutPlan;
        expires_at: string;
        payment_mode: 'one_time';
        state: 'entitled';
      };
    }
  | { ok: false; code: BillingCheckoutErrorCode; message: string };

type CheckoutEnvelope = {
  status?: string;
  data?: BillingCheckoutSession;
  error?: string;
  message?: string;
};

const RETRYABLE_CODES = new Set<BillingCheckoutErrorCode>([
  'checkout_in_progress',
  'state_unavailable',
  'provider_unavailable',
  'rate_limited',
]);

export const PAYPAL_ENVIRONMENT_ORIGINS = Object.freeze({
  sandbox: 'https://www.sandbox.paypal.com',
  production: 'https://www.paypal.com',
} as const);

export const APPROVED_PAYPAL_ORIGINS = Object.freeze([
  'https://www.sandbox.paypal.com',
  'https://www.paypal.com',
]);

export const WHOP_ENVIRONMENT_ORIGINS = Object.freeze({
  sandbox: 'https://sandbox.whop.com',
  production: 'https://whop.com',
} as const);

export function getDefaultCheckoutProvider(): BillingCheckoutProvider {
  return String(import.meta.env.VITE_BILLING_CHECKOUT_PROVIDER || 'whop').trim().toLowerCase() === 'paypal' ? 'paypal' : 'whop';
}

export function isWhopProviderActive(): boolean {
  return getDefaultCheckoutProvider() === 'whop';
}

function getCheckoutEnvironment(environment?: string): string {
  let env = environment;

  if (typeof env === 'undefined' || env === '') {
    if (typeof window !== 'undefined' && /^(?:www\.)?wiseresume\.app$/i.test(window.location.hostname)) {
      env = 'production';
    } else if (typeof import.meta.env.VITE_BILLING_PUBLIC_MODE !== 'undefined') {
      env = import.meta.env.VITE_BILLING_PUBLIC_MODE as string;
    } else if (typeof import.meta.env.VITE_BILLING_ENVIRONMENT !== 'undefined') {
      env = import.meta.env.VITE_BILLING_ENVIRONMENT as string;
    } else if (typeof import.meta.env.VITE_CHECKOUT_ENVIRONMENT !== 'undefined') {
      env = import.meta.env.VITE_CHECKOUT_ENVIRONMENT as string;
    } else if (import.meta.env.DEV) {
      env = 'sandbox';
    }
  }

  return (env || '').trim().toLowerCase();
}

export function getApprovedPayPalOrigins(environment?: string): readonly string[] {
  const normalized = getCheckoutEnvironment(environment);

  if (normalized === 'sandbox') return Object.freeze([PAYPAL_ENVIRONMENT_ORIGINS.sandbox]);
  if (normalized === 'production') return Object.freeze([PAYPAL_ENVIRONMENT_ORIGINS.production]);
  return Object.freeze([]);
}

export function isValidCheckoutUrl(urlString: string, environment?: string, provider: BillingCheckoutProvider = getDefaultCheckoutProvider()): boolean {
  try {
    const url = new URL(urlString);
    const inferredProvider: BillingCheckoutProvider = provider === getDefaultCheckoutProvider() && !url.origin.includes('whop.com') ? 'paypal' : provider;
    const approved = inferredProvider === 'whop'
      ? (getCheckoutEnvironment(environment) === 'sandbox' ? [WHOP_ENVIRONMENT_ORIGINS.sandbox] : getCheckoutEnvironment(environment) === 'production' ? [WHOP_ENVIRONMENT_ORIGINS.production] : [])
      : getApprovedPayPalOrigins(environment);
    return url.protocol === 'https:' && approved.includes(url.origin);
  } catch {
    return false;
  }
}

export const BILLING_ATTEMPT_STORAGE_PREFIX = 'wr_billing_attempt_';

export function getPlanAttemptStorageKey(plan: BillingCheckoutPlan): string {
  return `${BILLING_ATTEMPT_STORAGE_PREFIX}${plan}`;
}

export function getOrCreatePlanAttemptKey(plan: BillingCheckoutPlan): string {
  const storageKey = getPlanAttemptStorageKey(plan);
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing && /^[A-Za-z0-9._:-]{1,128}$/.test(existing)) return existing;
    const newKey = makeIdempotencyKey();
    sessionStorage.setItem(storageKey, newKey);
    return newKey;
  } catch {
    return makeIdempotencyKey();
  }
}

export function clearPlanAttemptKey(plan?: BillingCheckoutPlan): void {
  try {
    if (plan) {
      sessionStorage.removeItem(getPlanAttemptStorageKey(plan));
    } else {
      sessionStorage.removeItem(getPlanAttemptStorageKey('pro'));
      sessionStorage.removeItem(getPlanAttemptStorageKey('premium'));
    }
  } catch {}
}

function normalizeErrorCode(value: unknown): BillingCheckoutErrorCode {
  const code = typeof value === 'string' ? value : '';
  return [
    'unauthorized',
    'already_entitled',
    'checkout_in_progress',
    'idempotency_conflict',
    'payments_disabled',
    'state_unavailable',
    'catalog_mismatch',
    'environment_mismatch',
    'provider_unavailable',
    'rate_limited',
    'invalid_request',
    'plan_change_unavailable',
    'cancellation_failed',
    'not_found',
    'invalid_coupon',
    'coupon_already_redeemed',
    'coupon_not_supported_for_recurring',
    'qa_unauthorized',
    'active_paid_entitlement_exists',
    'active_recurring_subscription_exists',
    'active_higher_plan_exists',
  ].includes(code) ? code as BillingCheckoutErrorCode : 'unknown';
}

function fallbackMessage(code: BillingCheckoutErrorCode): string {
  switch (code) {
    case 'unauthorized': return 'Please sign in before starting checkout.';
    case 'already_entitled': return 'Your account already has this access or a stronger plan.';
    case 'checkout_in_progress': return 'A checkout is already being prepared.';
    case 'payments_disabled': return 'Subscription enrollments are currently closed.';
    case 'state_unavailable': return 'Subscription status is temporarily unavailable. Please try again.';
    case 'rate_limited': return 'Too many checkout attempts. Please wait and try again.';
    case 'idempotency_conflict': return 'This checkout attempt cannot be replayed.';
    case 'plan_change_unavailable': return 'Plan changes are temporarily unavailable.';
    case 'cancellation_failed': return 'Unable to cancel subscription. Please verify your subscription status or try again later.';
    case 'not_found': return 'Subscription not found.';
    case 'invalid_coupon': return 'This coupon code is invalid or has expired.';
    case 'coupon_already_redeemed': return 'You have already redeemed this coupon code.';
    case 'coupon_not_supported_for_recurring': return 'Coupons cannot be applied to recurring subscriptions.';
    case 'qa_unauthorized': return 'This coupon code is restricted to authorized QA accounts.';
    case 'active_paid_entitlement_exists': return 'Your account already has an active paid entitlement for this period.';
    case 'active_recurring_subscription_exists': return 'You already have an active recurring subscription.';
    case 'active_higher_plan_exists': return 'Your account already has an active higher plan.';
    default: return 'Checkout is temporarily unavailable. Please try again later.';
  }
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`;
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isSafeSession(value: unknown, environment?: string): value is BillingCheckoutSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<BillingCheckoutSession>;
  if (!session.session_reference || !session.expires_at || !session.plan || session.state !== 'created_or_reused') return false;
  if (session.plan !== 'pro' && session.plan !== 'premium') return false;
  if (session.checkout_url !== undefined) {
    if (!isValidCheckoutUrl(session.checkout_url, environment, session.provider || getDefaultCheckoutProvider())) return false;
  }
  return true;
}

export async function createBillingCheckoutSession(
  plan: BillingCheckoutPlan,
  options: {
    idempotencyKey?: string;
    environment?: string;
    provider?: BillingCheckoutProvider;
    paymentMode?: BillingPaymentMode;
    couponCode?: string | null;
  } = {},
): Promise<BillingCheckoutResult> {
  const idempotencyKey = options.idempotencyKey ?? getOrCreatePlanAttemptKey(plan);
  const body: Record<string, unknown> = {
    action: 'create-session',
    plan,
    idempotency_key: idempotencyKey,
  };
  if (options.provider) body.provider = options.provider;
  if (options.paymentMode) body.payment_mode = options.paymentMode;
  if (options.couponCode) body.coupon_code = options.couponCode;

  const result = await appwriteFunctions.invoke<CheckoutEnvelope>('billing-checkout', {
    body,
  });

  if (result.error) {
    const code = normalizeErrorCode(result.error.code);
    const retryable = RETRYABLE_CODES.has(code);
    if (!retryable) {
      clearPlanAttemptKey(plan);
    }
    return {
      ok: false,
      code,
      message: result.error.message || fallbackMessage(code),
      retryable,
    };
  }

  const envelope = result.data;
  if (!envelope || envelope.status !== 'success' || !isSafeSession(envelope.data, options.environment)) {
    return {
      ok: false,
      code: 'unknown',
      message: fallbackMessage('unknown'),
      retryable: true,
    };
  }

  return { ok: true, session: envelope.data };
}

export async function getCouponQuote(params: {
  plan: BillingCheckoutPlan;
  paymentMode?: BillingPaymentMode;
  couponCode?: string | null;
}): Promise<CouponQuoteResult> {
  const result = await appwriteFunctions.invoke<{
    status?: string;
    eligible?: boolean;
    reason?: string;
    message?: string;
    plan?: BillingCheckoutPlan;
    payment_mode?: BillingPaymentMode;
    original_amount?: number;
    discount_amount?: number;
    final_amount?: number;
    code?: string;
    discount_type?: string;
    discount_value?: number;
    error?: string;
  }>('billing-checkout', {
    body: {
      action: 'quote',
      plan: params.plan,
      payment_mode: params.paymentMode ?? 'one_time',
      coupon_code: params.couponCode ?? undefined,
    },
  });

  if (result.error) {
    const code = normalizeErrorCode(result.error.code);
    return {
      ok: false,
      code,
      message: result.error.message || fallbackMessage(code),
    };
  }

  const envelope = result.data;
  if (!envelope || envelope.status !== 'success') {
    return {
      ok: false,
      code: 'unknown',
      message: fallbackMessage('unknown'),
    };
  }

  return {
    ok: true,
    quote: {
      eligible: envelope.eligible ?? false,
      code: envelope.code,
      reason: envelope.reason,
      message: envelope.message,
      plan: envelope.plan || params.plan,
      payment_mode: envelope.payment_mode || params.paymentMode || 'one_time',
      original_amount: envelope.original_amount ?? 0,
      discount_amount: envelope.discount_amount ?? 0,
      final_amount: envelope.final_amount ?? 0,
      discount_type: envelope.discount_type,
      discount_value: envelope.discount_value,
    },
  };
}

export async function captureBillingOrder(orderId: string): Promise<CaptureOrderResult> {
  if (!orderId || typeof orderId !== 'string') {
    return {
      ok: false,
      code: 'invalid_request',
      message: 'Order ID is required.',
    };
  }

  const result = await appwriteFunctions.invoke<{
    status?: string;
    data?: {
      order_id: string;
      capture_id: string;
      plan: BillingCheckoutPlan;
      expires_at: string;
      payment_mode: 'one_time';
      state: 'entitled';
    };
    error?: string;
    message?: string;
  }>('billing-checkout', {
    body: {
      action: 'capture-order',
      order_id: orderId.trim(),
    },
  });

  if (result.error) {
    const code = normalizeErrorCode(result.error.code);
    return {
      ok: false,
      code,
      message: result.error.message || fallbackMessage(code),
    };
  }

  const envelope = result.data;
  if (!envelope || envelope.status !== 'success' || !envelope.data) {
    return {
      ok: false,
      code: 'unknown',
      message: envelope?.message || fallbackMessage('unknown'),
    };
  }

  return {
    ok: true,
    data: envelope.data,
  };
}

export async function cancelBillingSubscription(options: {
  reason?: string;
  provider?: BillingCheckoutProvider;
} = {}): Promise<CancelSubscriptionResult> {
  const result = await appwriteFunctions.invoke<{
    status?: string;
    canceled?: boolean;
    error?: string;
    message?: string;
  }>('billing-checkout', {
    body: {
      action: 'cancel-subscription',
      reason: options.reason,
      provider: options.provider,
    },
  });

  if (result.error) {
    const code = normalizeErrorCode(result.error.code);
    return {
      ok: false,
      code,
      message: result.error.message || fallbackMessage(code),
    };
  }

  const envelope = result.data;
  if (!envelope || envelope.status !== 'success' || !envelope.canceled) {
    return {
      ok: false,
      code: 'cancellation_failed',
      message: envelope?.message || fallbackMessage('cancellation_failed'),
    };
  }

  return {
    ok: true,
    canceled: true,
  };
}

export function openServerCheckout(session: BillingCheckoutSession, environment?: string): boolean {
  if (!session.checkout_url) return false;
  if (!isValidCheckoutUrl(session.checkout_url, environment, session.provider || getDefaultCheckoutProvider())) return false;
  try {
    window.location.assign(session.checkout_url);
    return true;
  } catch {
    return false;
  }
}

export const billingCheckoutTestHelpers = {
  fallbackMessage,
  isSafeSession,
  isValidCheckoutUrl,
  getApprovedPayPalOrigins,
  makeIdempotencyKey,
  normalizeErrorCode,
  APPROVED_PAYPAL_ORIGINS,
  PAYPAL_ENVIRONMENT_ORIGINS,
  getOrCreatePlanAttemptKey,
  clearPlanAttemptKey,
  getPlanAttemptStorageKey,
};
