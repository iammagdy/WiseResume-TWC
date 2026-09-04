import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import SubscriptionPage from '../SubscriptionPage';
import { useMe } from '@/hooks/useMe';
import { usePlan } from '@/hooks/usePlan';
import {
  createBillingCheckoutSession,
  cancelBillingSubscription,
  openServerCheckout,
} from '@/lib/billingCheckout';
import { mockLocation } from '@/test/mocks/router';

vi.mock('@/hooks/useMe', () => ({
  useMe: vi.fn(),
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: vi.fn(),
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useAICredits', () => ({
  useAICredits: vi.fn(() => ({ data: { daily_usage: 0, daily_limit: 5 }, isLoading: false })),
}));

vi.mock('@/hooks/usePlanUpgradeCelebration', () => ({
  usePlanUpgradeCelebration: vi.fn(),
}));

vi.mock('@/lib/billingCheckout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/billingCheckout')>();
  return {
    ...actual,
    createBillingCheckoutSession: vi.fn(),
    openServerCheckout: vi.fn(),
    cancelBillingSubscription: vi.fn(),
  };
});

describe('SubscriptionPage PayPal Lifecycle & Cancellation', () => {
  const mockRefetchMe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockLocation.search = '';
    mockRefetchMe.mockResolvedValue({
      data: {
        subscription: {
          plan: 'free',
          effective_plan: 'free',
          status: 'free',
          can_subscribe: true,
          can_cancel_subscription: false,
          provider_source: null,
          provider_status: null,
          provider_expires_at: null,
          expires_at: null,
          will_renew: null,
        },
      },
    });

    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'free',
          effective_plan: 'free',
          status: 'free',
          can_subscribe: true,
          can_cancel_subscription: false,
          provider_source: null,
          provider_status: null,
          provider_expires_at: null,
          expires_at: null,
          will_renew: null,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    vi.mocked(usePlan).mockReturnValue({
      plan: 'free',
      isPro: false,
      isPremium: false,
      isLoading: false,
    } as unknown as ReturnType<typeof usePlan>);
  });

  it('renders strictly "Subscribe" CTA buttons on available upgrade tiers', () => {
    renderWithProviders(<SubscriptionPage />);

    const subscribeButtons = screen.getAllByRole('button', { name: /^subscribe$/i });
    expect(subscribeButtons.length).toBe(2); // Pro and Ultimate
    subscribeButtons.forEach((btn) => {
      expect(btn).toBeEnabled();
      expect(btn).toHaveTextContent('Subscribe');
    });

    // Zero customer-facing sandbox or retired provider names
    const containerText = document.body.textContent || '';
    expect(containerText).not.toMatch(/sandbox/i);
    expect(containerText).not.toMatch(/paddle/i);
    expect(containerText).not.toMatch(/stripe/i);
    expect(containerText).not.toMatch(/revenuecat/i);
  });

  it('displays enrollment closed message and disables Subscribe CTA when can_subscribe is false', () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'free',
          effective_plan: 'free',
          status: 'free',
          can_subscribe: false,
          can_cancel_subscription: false,
          provider_source: null,
          provider_status: null,
          provider_expires_at: null,
          expires_at: null,
          will_renew: null,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    renderWithProviders(<SubscriptionPage />);

    const closedNotice = screen.getAllByText(/subscription enrollments are currently closed/i);
    expect(closedNotice.length).toBeGreaterThan(0);

    const subscribeButtons = screen.getAllByRole('button', { name: /^subscribe$/i });
    subscribeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('fails closed when can_subscribe is missing or undefined in user data', () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'free',
          effective_plan: 'free',
          status: 'free',
          can_subscribe: undefined as unknown as boolean,
          can_cancel_subscription: false,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    renderWithProviders(<SubscriptionPage />);

    const closedNotice = screen.getAllByText(/subscription enrollments are currently closed/i);
    expect(closedNotice.length).toBeGreaterThan(0);

    const subscribeButtons = screen.getAllByRole('button', { name: /^subscribe$/i });
    subscribeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('initiates checkout with attempt key and passes it to createBillingCheckoutSession', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      session: {
        session_reference: 'sess_123',
        plan: 'pro',
        state: 'created_or_reused',
        expires_at: '2026-09-04T12:00:00Z',
        checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
      },
    });
    vi.mocked(openServerCheckout).mockReturnValue(true);

    renderWithProviders(<SubscriptionPage />);

    const proSubscribeBtn = screen.getAllByRole('button', { name: /^subscribe$/i })[0];
    fireEvent.click(proSubscribeBtn);

    expect(createBillingCheckoutSession).toHaveBeenCalledWith('pro', {
      idempotencyKey: expect.stringMatching(/^web-/),
    });
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toMatch(/^web-/);
    await waitFor(() => {
      expect(openServerCheckout).toHaveBeenCalled();
    });
  });

  it('reuses identical attempt key on retryable error retry', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValueOnce({
      ok: false,
      code: 'provider_unavailable',
      message: 'Temporary provider failure',
      retryable: true,
    }).mockResolvedValueOnce({
      ok: true,
      session: {
        session_reference: 'sess_retry',
        plan: 'pro',
        state: 'created_or_reused',
        expires_at: '2026-09-04T12:00:00Z',
        checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
      },
    });
    vi.mocked(openServerCheckout).mockReturnValue(true);

    renderWithProviders(<SubscriptionPage />);

    const proSubscribeBtn = screen.getAllByRole('button', { name: /^subscribe$/i })[0];
    fireEvent.click(proSubscribeBtn);

    await waitFor(() => {
      expect(screen.getByText('Temporary provider failure')).toBeInTheDocument();
    });

    const firstCallKey = vi.mocked(createBillingCheckoutSession).mock.calls[0][1]?.idempotencyKey;
    expect(firstCallKey).toBeDefined();

    // Click Try again
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(createBillingCheckoutSession).toHaveBeenCalledTimes(2);
    });

    const secondCallKey = vi.mocked(createBillingCheckoutSession).mock.calls[1][1]?.idempotencyKey;
    expect(secondCallKey).toBe(firstCallKey);
  });

  it('clears attempt key on non-retryable error', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: false,
      code: 'payments_disabled',
      message: 'Enrollments closed',
      retryable: false,
    });

    renderWithProviders(<SubscriptionPage />);

    const proSubscribeBtn = screen.getAllByRole('button', { name: /^subscribe$/i })[0];
    fireEvent.click(proSubscribeBtn);

    await waitFor(() => {
      expect(screen.getByText(/subscription enrollments are currently closed/i)).toBeInTheDocument();
    });

    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();
  });

  it('switching plans clears old plan attempt key and generates new key for target plan', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      session: {
        session_reference: 'sess_switch',
        plan: 'pro',
        state: 'created_or_reused',
        expires_at: '2026-09-04T12:00:00Z',
        checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
      },
    });
    vi.mocked(openServerCheckout).mockReturnValue(true);

    renderWithProviders(<SubscriptionPage />);

    const subscribeButtons = screen.getAllByRole('button', { name: /^subscribe$/i });
    const proBtn = subscribeButtons[0];
    const premiumBtn = subscribeButtons[1];

    // Click Pro and wait for checkout to complete
    await act(async () => {
      fireEvent.click(proBtn);
    });

    await waitFor(() => {
      expect(createBillingCheckoutSession).toHaveBeenCalledWith('pro', expect.any(Object));
    });
    const proKey = vi.mocked(createBillingCheckoutSession).mock.calls[0][1]?.idempotencyKey;
    expect(proKey).toMatch(/^web-/);
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBe(proKey);

    // Switch to Premium
    await act(async () => {
      fireEvent.click(premiumBtn);
    });

    await waitFor(() => {
      expect(createBillingCheckoutSession).toHaveBeenCalledWith('premium', expect.any(Object));
    });

    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();
    const premKey = vi.mocked(createBillingCheckoutSession).mock.calls[1][1]?.idempotencyKey;
    expect(premKey).toMatch(/^web-/);
    expect(premKey).not.toBe(proKey);
    expect(sessionStorage.getItem('wr_billing_attempt_premium')).toBe(premKey);
  });

  it('displays cancel notice and clears attempt keys when returning with ?billing=canceled', () => {
    sessionStorage.setItem('wr_billing_attempt_pro', 'web-test-attempt');
    sessionStorage.setItem('billing_pending_plan', 'pro');
    mockLocation.search = '?billing=canceled';
    renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=canceled' });

    expect(screen.getByText(/subscription checkout was canceled. no charges were made./i)).toBeInTheDocument();
    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();
    expect(sessionStorage.getItem('billing_pending_plan')).toBeNull();
  });

  it('polls and displays payment approved state when returning with ?billing=success, clearing attempt keys', async () => {
    sessionStorage.setItem('wr_billing_attempt_pro', 'web-test-attempt');
    sessionStorage.setItem('billing_pending_plan', 'pro');
    mockLocation.search = '?billing=success';

    mockRefetchMe.mockResolvedValueOnce({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: '2026-10-04T00:00:00Z',
          expires_at: '2026-10-04T00:00:00Z',
          will_renew: true,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

    expect(screen.getByText(/confirming your subscription…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/payment approved/i)).toBeInTheDocument();
    });

    expect(sessionStorage.getItem('wr_billing_attempt_pro')).toBeNull();
    expect(sessionStorage.getItem('billing_pending_plan')).toBeNull();
  });

  it('handles two-stage cancellation flow with neutral copy when provider_expires_at is missing', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: null,
          expires_at: null,
          will_renew: true,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    vi.mocked(usePlan).mockReturnValue({
      plan: 'pro',
      isPro: true,
      isPremium: false,
      isLoading: false,
    } as unknown as ReturnType<typeof usePlan>);

    vi.mocked(cancelBillingSubscription).mockResolvedValue({
      ok: true,
      canceled: true,
    });

    // Initial check after cancel returns settled will_renew: false
    mockRefetchMe.mockResolvedValueOnce({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: false,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: null,
          expires_at: null,
          will_renew: false,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />);

    const cancelBtn = screen.getByRole('button', { name: /cancel subscription/i });
    fireEvent.click(cancelBtn);

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(cancelBillingSubscription).toHaveBeenCalled();
      // Verifies neutral copy without claiming "end of billing period"
      expect(screen.getByText(/your cancellation will stop future renewals. your account will update once the cancellation is confirmed./i)).toBeInTheDocument();
    });

    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toMatch(/until the end of your billing period/i);
  });

  it('handles cancellation flow with authoritative expiration date when provider_expires_at is present', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: '2026-10-04T00:00:00Z',
          expires_at: '2026-10-04T00:00:00Z',
          will_renew: true,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    vi.mocked(usePlan).mockReturnValue({
      plan: 'pro',
      isPro: true,
      isPremium: false,
      isLoading: false,
    } as unknown as ReturnType<typeof usePlan>);

    vi.mocked(cancelBillingSubscription).mockResolvedValue({
      ok: true,
      canceled: true,
    });

    mockRefetchMe.mockResolvedValueOnce({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: false,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: '2026-10-04T00:00:00Z',
          expires_at: '2026-10-04T00:00:00Z',
          will_renew: false,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />);

    const cancelBtn = screen.getByRole('button', { name: /cancel subscription/i });
    fireEvent.click(cancelBtn);

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(cancelBillingSubscription).toHaveBeenCalled();
      expect(screen.getByText(/your subscription has been canceled. you retain full access until/i)).toBeInTheDocument();
    });
  });

  it('displays neutral copy on checkout polling timeout without false claim of payment received', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('billing_pending_plan', 'pro');
    mockLocation.search = '?billing=success';

    // refetch never changes plan to simulate timeout
    mockRefetchMe.mockResolvedValue({
      data: {
        subscription: {
          plan: 'free',
          effective_plan: 'free',
          status: 'free',
          can_subscribe: true,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

    expect(screen.getByText(/confirming your subscription…/i)).toBeInTheDocument();

    // Advance 95 seconds to exceed 90s timeout
    await act(async () => {
      vi.advanceTimersByTime(95_000);
    });

    expect(screen.getByText('Taking Longer Than Usual')).toBeInTheDocument();
    expect(screen.getByText(/this is taking longer than usual\. your subscription will update automatically once payment confirmation is complete/i)).toBeInTheDocument();

    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toMatch(/payment received/i);

    vi.useRealTimers();
  });

  it('cancellation 30s timeout transitions to delayed state (NOT confirmed) with neutral copy', async () => {
    vi.useFakeTimers();

    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: null,
          expires_at: null,
          will_renew: true,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    vi.mocked(usePlan).mockReturnValue({
      plan: 'pro',
      isPro: true,
      isPremium: false,
      isLoading: false,
    } as unknown as ReturnType<typeof usePlan>);

    vi.mocked(cancelBillingSubscription).mockResolvedValue({
      ok: true,
      canceled: true,
    });

    // Subscriptions refetch keeps will_renew: true (webhook or backend slow to update)
    mockRefetchMe.mockResolvedValue({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: null,
          expires_at: null,
          will_renew: true,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />);

    const cancelBtn = screen.getByRole('button', { name: /cancel subscription/i });
    fireEvent.click(cancelBtn);

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    // Advance 32 seconds with async timer advance to allow all promise ticks to resolve
    await vi.advanceTimersByTimeAsync(35_000);

    // Must transition to delayed, NOT confirmed!
    expect(screen.getByText('Cancellation Status Updating')).toBeInTheDocument();
    expect(
      screen.getByText(
        /your cancellation request was received. your subscription status is still updating. you can refresh this page in a moment./i
      )
    ).toBeInTheDocument();

    // Must NEVER show "Subscription Canceled" without authoritative confirmation!
    expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('cancellation transitions to confirmed when subsequent refetch proves will_renew=false', async () => {
    vi.useFakeTimers();

    vi.mocked(useMe).mockReturnValue({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          provider_source: 'paypal',
          provider_status: 'active',
          provider_expires_at: '2026-10-15T00:00:00Z',
          expires_at: '2026-10-15T00:00:00Z',
          will_renew: true,
        },
      },
      refetch: mockRefetchMe,
    } as unknown as ReturnType<typeof useMe>);

    vi.mocked(usePlan).mockReturnValue({
      plan: 'pro',
      isPro: true,
      isPremium: false,
      isLoading: false,
    } as unknown as ReturnType<typeof usePlan>);

    vi.mocked(cancelBillingSubscription).mockResolvedValue({
      ok: true,
      canceled: true,
    });

    // Initial refetch still shows will_renew: true
    mockRefetchMe.mockResolvedValueOnce({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: true,
          will_renew: true,
        },
      },
    });

    // Second refetch after 3s polling proves will_renew: false
    mockRefetchMe.mockResolvedValueOnce({
      data: {
        subscription: {
          plan: 'pro',
          effective_plan: 'pro',
          status: 'active',
          can_subscribe: true,
          can_cancel_subscription: false,
          provider_expires_at: '2026-10-15T00:00:00Z',
          expires_at: '2026-10-15T00:00:00Z',
          will_renew: false,
        },
      },
    });

    renderWithProviders(<SubscriptionPage />);

    const cancelBtn = screen.getByRole('button', { name: /cancel subscription/i });
    fireEvent.click(cancelBtn);

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    // Advance 4s with async timer advance to trigger poll
    await vi.advanceTimersByTimeAsync(4000);

    // Now confirmed state must appear with retain access date
    expect(screen.getByText('Subscription Canceled')).toBeInTheDocument();
    expect(screen.getByText(/your subscription has been canceled. you retain full access until/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  describe('Cancellation confirmation authority (Issue 2)', () => {
    const setupProSubscription = () => {
      vi.mocked(useMe).mockReturnValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
            provider_expires_at: '2026-10-15T00:00:00Z',
            expires_at: '2026-10-15T00:00:00Z',
            will_renew: true,
          },
        },
        refetch: mockRefetchMe,
      } as unknown as ReturnType<typeof useMe>);

      vi.mocked(usePlan).mockReturnValue({
        plan: 'pro',
        isPro: true,
        isPremium: false,
        isLoading: false,
      } as unknown as ReturnType<typeof usePlan>);

      vi.mocked(cancelBillingSubscription).mockResolvedValue({
        ok: true,
        canceled: true,
      });
    };

    it('confirms cancellation immediately when initial refetch returns will_renew === false (A)', async () => {
      setupProSubscription();
      mockRefetchMe.mockResolvedValueOnce({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: false,
            provider_source: 'paypal',
            provider_status: 'active',
            provider_expires_at: '2026-10-15T00:00:00Z',
            expires_at: '2026-10-15T00:00:00Z',
            will_renew: false,
          },
        },
      });

      renderWithProviders(<SubscriptionPage />);
      fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

      await waitFor(() => {
        expect(screen.getByText('Subscription Canceled')).toBeInTheDocument();
      });
    });

    it('does NOT confirm when can_cancel_subscription === false with will_renew === null, transitioning to delayed after 30s (B, F)', async () => {
      vi.useFakeTimers();
      setupProSubscription();
      mockRefetchMe.mockResolvedValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: false,
            provider_source: 'paypal',
            provider_status: 'active',
            provider_expires_at: '2026-10-15T00:00:00Z',
            expires_at: '2026-10-15T00:00:00Z',
            will_renew: null,
          },
        },
      });

      renderWithProviders(<SubscriptionPage />);
      fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

      // Immediately after click, must be in updating/canceling, NOT confirmed
      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

      // Advance past 30-second timeout
      await vi.advanceTimersByTimeAsync(35_000);

      expect(screen.getByText('Cancellation Status Updating')).toBeInTheDocument();
      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('does NOT confirm when can_cancel_subscription === false with will_renew === undefined (C)', async () => {
      vi.useFakeTimers();
      setupProSubscription();
      mockRefetchMe.mockResolvedValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: false,
            provider_source: 'paypal',
            provider_status: 'active',
            provider_expires_at: '2026-10-15T00:00:00Z',
            expires_at: '2026-10-15T00:00:00Z',
            will_renew: undefined,
          },
        },
      });

      renderWithProviders(<SubscriptionPage />);
      fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(35_000);
      expect(screen.getByText('Cancellation Status Updating')).toBeInTheDocument();
      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('does NOT confirm when subscription metadata is missing or null (D)', async () => {
      vi.useFakeTimers();
      setupProSubscription();
      mockRefetchMe.mockResolvedValue({
        data: {
          subscription: null,
        },
      });

      renderWithProviders(<SubscriptionPage />);
      fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(35_000);
      expect(screen.getByText('Cancellation Status Updating')).toBeInTheDocument();
      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('does NOT confirm on legacy fallback-shaped payload without explicit will_renew === false (E)', async () => {
      vi.useFakeTimers();
      setupProSubscription();
      mockRefetchMe.mockResolvedValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'canceled',
            can_subscribe: true,
            can_cancel_subscription: false,
            provider_source: 'paypal',
            provider_status: 'CANCELLED',
            provider_expires_at: null,
            expires_at: null,
            will_renew: null,
          },
        },
      });

      renderWithProviders(<SubscriptionPage />);
      fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(35_000);
      expect(screen.getByText('Cancellation Status Updating')).toBeInTheDocument();
      expect(screen.queryByText('Subscription Canceled')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Verified return approval contract (Issue 3)', () => {
    it('does NOT show Payment Approved when returning with ?billing=pending or ?billing=success if already Pro without active session pending plan (clears query params and stays neutral) (A)', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      vi.mocked(useMe).mockReturnValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
          },
        },
        refetch: mockRefetchMe,
      } as unknown as ReturnType<typeof useMe>);

      vi.mocked(usePlan).mockReturnValue({
        plan: 'pro',
        isPro: true,
        isPremium: false,
        isLoading: false,
      } as unknown as ReturnType<typeof usePlan>);

      mockLocation.search = '?billing=pending';

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=pending' });

      expect(screen.queryByText(/payment approved/i)).not.toBeInTheDocument();
      expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), expect.any(String));
      replaceStateSpy.mockRestore();
    });

    it('does NOT show Payment Approved when returning with ?billing=pending if already Ultimate without active session pending plan (B)', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      vi.mocked(useMe).mockReturnValue({
        data: {
          subscription: {
            plan: 'premium',
            effective_plan: 'premium',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
          },
        },
        refetch: mockRefetchMe,
      } as unknown as ReturnType<typeof useMe>);

      vi.mocked(usePlan).mockReturnValue({
        plan: 'premium',
        isPro: false,
        isPremium: true,
        isLoading: false,
      } as unknown as ReturnType<typeof usePlan>);

      mockLocation.search = '?billing=pending';

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=pending' });

      expect(screen.queryByText(/payment approved/i)).not.toBeInTheDocument();
      expect(replaceStateSpy).toHaveBeenCalled();
      replaceStateSpy.mockRestore();
    });

    it('shows Payment Approved when user attempts Pro and backend reports Pro (C)', async () => {
      sessionStorage.setItem('billing_pending_plan', 'pro');
      mockLocation.search = '?billing=success';

      mockRefetchMe.mockResolvedValueOnce({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
          },
        },
      });

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

      await waitFor(() => {
        expect(screen.getByText(/payment approved/i)).toBeInTheDocument();
      });
      expect(sessionStorage.getItem('billing_pending_plan')).toBeNull();
    });

    it('shows Payment Approved when user attempts Pro and backend reports Premium (D)', async () => {
      sessionStorage.setItem('billing_pending_plan', 'pro');
      mockLocation.search = '?billing=success';

      mockRefetchMe.mockResolvedValueOnce({
        data: {
          subscription: {
            plan: 'premium',
            effective_plan: 'premium',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
          },
        },
      });

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

      await waitFor(() => {
        expect(screen.getByText(/payment approved/i)).toBeInTheDocument();
      });
      expect(sessionStorage.getItem('billing_pending_plan')).toBeNull();
    });

    it('does NOT show Payment Approved when user attempts Premium but backend only reports Pro (E)', async () => {
      vi.useFakeTimers();
      sessionStorage.setItem('billing_pending_plan', 'premium');
      mockLocation.search = '?billing=success';

      mockRefetchMe.mockResolvedValue({
        data: {
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
          },
        },
      });

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

      expect(screen.getByText(/confirming your subscription…/i)).toBeInTheDocument();

      // Advance past polling timeout (95 seconds)
      await act(async () => {
        vi.advanceTimersByTime(95_000);
      });

      expect(screen.queryByText(/payment approved/i)).not.toBeInTheDocument();
      expect(screen.getByText('Taking Longer Than Usual')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows Payment Approved when user attempts Premium and backend reports Premium (F)', async () => {
      sessionStorage.setItem('billing_pending_plan', 'premium');
      mockLocation.search = '?billing=success';

      mockRefetchMe.mockResolvedValueOnce({
        data: {
          subscription: {
            plan: 'premium',
            effective_plan: 'premium',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
          },
        },
      });

      renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=success' });

      await waitFor(() => {
        expect(screen.getByText(/payment approved/i)).toBeInTheDocument();
      });
      expect(sessionStorage.getItem('billing_pending_plan')).toBeNull();
    });
  });

  describe('P0 Paid-to-Paid Upgrade Protection (Frontend)', () => {
    it('Frontend Pro subscriber: no enabled Ultimate Subscribe CTA and displays planChangesUnavailable (Test 6)', () => {
      vi.mocked(usePlan).mockReturnValue({
        plan: 'pro',
        isFree: false,
        isPro: true,
        isPremium: false,
        loading: false,
      } as any);

      vi.mocked(useMe).mockReturnValue({
        data: {
          $id: 'user_pro',
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
            will_renew: true,
          },
        },
        refetch: mockRefetchMe,
      } as any);

      renderWithProviders(<SubscriptionPage />);

      // Ultimate card is shown
      expect(screen.getByText(/power users/i)).toBeInTheDocument();

      // Subscribe button on Ultimate card is disabled
      const subscribeButtons = screen.getAllByRole('button', { name: /subscribe/i });
      expect(subscribeButtons.length).toBe(1);
      const ultimateBtn = subscribeButtons[0];
      expect(ultimateBtn).toBeDisabled();

      // Notice below button informs user without mentioning PayPal/Sandbox/QA
      expect(screen.getByText('Plan changes are temporarily unavailable.')).toBeInTheDocument();
    });

    it('Frontend Pro subscriber cannot trigger createBillingCheckoutSession(premium) even if clicked (Test 7)', async () => {
      vi.mocked(usePlan).mockReturnValue({
        plan: 'pro',
        isFree: false,
        isPro: true,
        isPremium: false,
        loading: false,
      } as any);

      vi.mocked(useMe).mockReturnValue({
        data: {
          $id: 'user_pro',
          subscription: {
            plan: 'pro',
            effective_plan: 'pro',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
            will_renew: true,
          },
        },
        refetch: mockRefetchMe,
      } as any);

      renderWithProviders(<SubscriptionPage />);

      const subscribeButtons = screen.getAllByRole('button', { name: /subscribe/i });
      const ultimateBtn = subscribeButtons[0];
      fireEvent.click(ultimateBtn);

      // Verify createBillingCheckoutSession was NOT called
      expect(createBillingCheckoutSession).not.toHaveBeenCalled();
    });

    it('Ultimate subscriber has no upgrade CTA (Test 8)', () => {
      vi.mocked(usePlan).mockReturnValue({
        plan: 'premium',
        isFree: false,
        isPro: false,
        isPremium: true,
        loading: false,
      } as any);

      vi.mocked(useMe).mockReturnValue({
        data: {
          $id: 'user_premium',
          subscription: {
            plan: 'premium',
            effective_plan: 'premium',
            status: 'active',
            can_subscribe: true,
            can_cancel_subscription: true,
            provider_source: 'paypal',
            provider_status: 'active',
            will_renew: true,
          },
        },
        refetch: mockRefetchMe,
      } as any);

      renderWithProviders(<SubscriptionPage />);

      // Zero subscribe buttons rendered
      expect(screen.queryByRole('button', { name: /subscribe/i })).not.toBeInTheDocument();
      // Zero upgrade targets
      expect(screen.queryByText(/power users/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/popular/i)).not.toBeInTheDocument();
    });
  });
});
