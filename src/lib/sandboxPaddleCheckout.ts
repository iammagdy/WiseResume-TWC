import type { PaddleEventData } from '@paddle/paddle-js';

export type SandboxCheckoutStatus =
  | 'idle'
  | 'loading'
  | 'open'
  | 'completed'
  | 'cancelled'
  | 'error'
  | 'unavailable';

const SANDBOX_TOKEN_PREFIX = 'test_';
const QA_TRANSACTION_ID = 'txn_01m0yynrv52wtsqcc7p7vgzxhj';
const LIVE_SANDBOX_HOSTNAMES = new Set(['wiseresume.app', 'www.wiseresume.app']);

let initializationPromise: Promise<void> | null = null;
let checkoutOpened = false;

function readClientToken(): string {
  return String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? '').trim();
}

function getSuccessUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('_ptxn');
  url.searchParams.set('billing', 'pending');
  url.hash = '';
  return url.toString();
}

function isCheckoutFailure(event: PaddleEventData): boolean {
  const name = typeof event?.name === 'string' ? event.name : '';
  return name === 'checkout.error' || name === 'checkout.payment.failed';
}

export function getSandboxTransactionId(): string | null {
  if (typeof window === 'undefined') return null;
  const transactionId = new URLSearchParams(window.location.search).get('_ptxn');
  return transactionId === QA_TRANSACTION_ID ? transactionId : null;
}

export async function initializeSandboxTransactionCheckout({
  transactionId,
  onStatus,
}: {
  transactionId: string;
  onStatus?: (status: SandboxCheckoutStatus) => void;
}): Promise<void> {
  if (transactionId !== QA_TRANSACTION_ID) {
    onStatus?.('unavailable');
    return;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const liveEnabled = import.meta.env.VITE_PADDLE_SANDBOX_CHECKOUT_ENABLED === 'true';
  const runtimeAllowed = import.meta.env.DEV || (liveEnabled && LIVE_SANDBOX_HOSTNAMES.has(hostname));
  if (!runtimeAllowed) {
    onStatus?.('unavailable');
    return;
  }

  const token = readClientToken();
  if (!token.startsWith(SANDBOX_TOKEN_PREFIX)) {
    onStatus?.('unavailable');
    return;
  }

  if (checkoutOpened) {
    onStatus?.('open');
    return;
  }

  if (initializationPromise) {
    onStatus?.('loading');
    return initializationPromise;
  }

  onStatus?.('loading');
  initializationPromise = (async () => {
    try {
      const { initializePaddle } = await import('@paddle/paddle-js');
      const paddle = await initializePaddle({
        environment: 'sandbox',
        token,
        checkout: {
          settings: {
            displayMode: 'overlay',
            locale: document.documentElement.lang === 'ar' ? 'ar' : 'en',
            successUrl: getSuccessUrl(),
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          },
          eventCallback: (event) => {
            if (isCheckoutFailure(event)) {
              onStatus?.('error');
              return;
            }
            if (event?.name === 'checkout.completed') {
              onStatus?.('completed');
              return;
            }
            if (event?.name === 'checkout.closed' || event?.name === 'checkout.cancelled') {
              onStatus?.('cancelled');
            }
          },
        },
      });

      if (!paddle) {
        throw new Error('Paddle.js did not initialize.');
      }

      paddle.Checkout.open({ transactionId });
      checkoutOpened = true;
      onStatus?.('open');
    } catch (error) {
      initializationPromise = null;
      onStatus?.('error');
      console.warn('[SandboxCheckout] Paddle checkout failed; no local plan grant.', error);
    }
  })();

  return initializationPromise;
}

export function resetSandboxCheckoutForTests(): void {
  initializationPromise = null;
  checkoutOpened = false;
}

export const sandboxCheckoutConstants = {
  qaTransactionId: QA_TRANSACTION_ID,
  liveSandboxHostnames: [...LIVE_SANDBOX_HOSTNAMES],
} as const;
