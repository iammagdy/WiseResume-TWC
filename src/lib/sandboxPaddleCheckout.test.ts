import { beforeEach, describe, expect, it, vi } from 'vitest';

const initializePaddleMock = vi.fn();
const checkoutOpenMock = vi.fn();
let latestPaddleOptions: Record<string, unknown> | undefined;

vi.mock('@paddle/paddle-js', () => ({
  initializePaddle: initializePaddleMock,
}));

describe('Sandbox Paddle transaction checkout', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
    latestPaddleOptions = undefined;
    initializePaddleMock.mockImplementation(async (options: Record<string, unknown>) => {
      latestPaddleOptions = options;
      return {
        Checkout: { open: checkoutOpenMock },
      };
    });
    window.history.replaceState({}, '', '/');
    document.documentElement.lang = 'en';
    document.documentElement.classList.remove('dark');
  });

  it('accepts only the prepared QA transaction ID', async () => {
    const { getSandboxTransactionId } = await import('./sandboxPaddleCheckout');
    window.history.replaceState({}, '', '/?_ptxn=not-allowed');
    expect(getSandboxTransactionId()).toBeNull();
    window.history.replaceState({}, '', '/?_ptxn=txn_01m0yynrv52wtsqcc7p7vgzxhj');
    expect(getSandboxTransactionId()).toBe('txn_01m0yynrv52wtsqcc7p7vgzxhj');
  });

  it('fails closed when the client token is absent', async () => {
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', '');
    const { initializeSandboxTransactionCheckout } = await import('./sandboxPaddleCheckout');
    const statuses: string[] = [];
    await initializeSandboxTransactionCheckout({
      transactionId: 'txn_01m0yynrv52wtsqcc7p7vgzxhj',
      onStatus: (status) => statuses.push(status),
    });
    expect(statuses).toEqual(['unavailable']);
    expect(initializePaddleMock).not.toHaveBeenCalled();
  });

  it('initializes Sandbox once and opens only the allowlisted transaction', async () => {
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'test_sandbox_client_token');
    const { initializeSandboxTransactionCheckout } = await import('./sandboxPaddleCheckout');
    const statuses: string[] = [];
    await initializeSandboxTransactionCheckout({
      transactionId: 'txn_01m0yynrv52wtsqcc7p7vgzxhj',
      onStatus: (status) => statuses.push(status),
    });
    await initializeSandboxTransactionCheckout({
      transactionId: 'txn_01m0yynrv52wtsqcc7p7vgzxhj',
      onStatus: (status) => statuses.push(status),
    });
    expect(initializePaddleMock).toHaveBeenCalledTimes(1);
    expect(latestPaddleOptions?.environment).toBe('sandbox');
    expect(checkoutOpenMock).toHaveBeenCalledTimes(1);
    expect(checkoutOpenMock).toHaveBeenCalledWith({ transactionId: 'txn_01m0yynrv52wtsqcc7p7vgzxhj' });
    expect(statuses).toContain('loading');
    expect(statuses).toContain('open');
  });

  it('marks completion as pending provider reconciliation without a local plan grant', async () => {
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'test_sandbox_client_token');
    const { initializeSandboxTransactionCheckout } = await import('./sandboxPaddleCheckout');
    const statuses: string[] = [];
    await initializeSandboxTransactionCheckout({
      transactionId: 'txn_01m0yynrv52wtsqcc7p7vgzxhj',
      onStatus: (status) => statuses.push(status),
    });
    const checkout = latestPaddleOptions?.checkout as { eventCallback?: (event: { name: string }) => void };
    checkout.eventCallback?.({ name: 'checkout.completed' });
    expect(statuses).toContain('completed');
    expect(window.location.pathname).toBe('/');
  });
});
