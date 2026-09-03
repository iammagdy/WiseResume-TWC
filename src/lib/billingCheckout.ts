import { appwriteFunctions } from '@/lib/appwrite-functions';

export type BillingCheckoutPlan = 'pro' | 'premium';

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
  | 'cancellation_failed'
  | 'not_found'
  | 'unknown';

export type BillingCheckoutSession = {
  session_reference: string;
  plan: BillingCheckoutPlan;
  state: 'created_or_reused';
  expires_at: string;
  checkout_reference?: string;
  checkout_url?: string;
};

export type BillingCheckoutResult =
  | { ok: true; session: BillingCheckoutSession }
  | { ok: false; code: BillingCheckoutErrorCode; message: string; retryable: boolean };

export type CancelSubscriptionResult =
  | { ok: true; canceled: boolean; subscriptionId: string }
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

export const APPROVED_PAYPAL_ORIGINS = Object.freeze([
  'https://www.sandbox.paypal.com',
  'https://www.paypal.com',
]);

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
    'cancellation_failed',
    'not_found',
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
    case 'cancellation_failed': return 'Unable to cancel subscription. Please verify your subscription status or try again later.';
    case 'not_found': return 'Subscription not found.';
    default: return 'Checkout is temporarily unavailable. Please try again later.';
  }
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`;
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isSafeSession(value: unknown): value is BillingCheckoutSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<BillingCheckoutSession>;
  if (!session.session_reference || !session.expires_at || !session.plan || session.state !== 'created_or_reused') return false;
  if (session.plan !== 'pro' && session.plan !== 'premium') return false;
  if (session.checkout_url !== undefined) {
    try {
      const url = new URL(session.checkout_url);
      if (url.protocol !== 'https:' || !APPROVED_PAYPAL_ORIGINS.includes(url.origin)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function createBillingCheckoutSession(
  plan: BillingCheckoutPlan,
  options: { idempotencyKey?: string } = {},
): Promise<BillingCheckoutResult> {
  const idempotencyKey = options.idempotencyKey ?? makeIdempotencyKey();
  const result = await appwriteFunctions.invoke<CheckoutEnvelope>('billing-checkout', {
    body: {
      action: 'create-session',
      plan,
      idempotency_key: idempotencyKey,
    },
  });

  if (result.error) {
    const code = normalizeErrorCode(result.error.code);
    return {
      ok: false,
      code,
      message: result.error.message || fallbackMessage(code),
      retryable: RETRYABLE_CODES.has(code),
    };
  }

  const envelope = result.data;
  if (!envelope || envelope.status !== 'success' || !isSafeSession(envelope.data)) {
    return {
      ok: false,
      code: 'unknown',
      message: fallbackMessage('unknown'),
      retryable: true,
    };
  }

  return { ok: true, session: envelope.data };
}

export async function cancelBillingSubscription(options: {
  reason?: string;
  subscriptionId?: string;
} = {}): Promise<CancelSubscriptionResult> {
  const result = await appwriteFunctions.invoke<{
    status?: string;
    canceled?: boolean;
    subscription_id?: string;
    error?: string;
    message?: string;
  }>('billing-checkout', {
    body: {
      action: 'cancel-subscription',
      subscription_id: options.subscriptionId,
      reason: options.reason,
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
    subscriptionId: envelope.subscription_id || options.subscriptionId || '',
  };
}

export function openServerCheckout(session: BillingCheckoutSession): boolean {
  if (!session.checkout_url) return false;
  try {
    const url = new URL(session.checkout_url);
    if (url.protocol !== 'https:' || !APPROVED_PAYPAL_ORIGINS.includes(url.origin)) return false;
    window.location.assign(url.toString());
    return true;
  } catch {
    return false;
  }
}

export const billingCheckoutTestHelpers = {
  fallbackMessage,
  isSafeSession,
  makeIdempotencyKey,
  normalizeErrorCode,
  APPROVED_PAYPAL_ORIGINS,
};
