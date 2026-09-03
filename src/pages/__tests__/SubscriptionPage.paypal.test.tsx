import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import SubscriptionPage from '../SubscriptionPage';
import { useMe } from '@/hooks/useMe';
import { usePlan } from '@/hooks/usePlan';
import { createBillingCheckoutSession, cancelBillingSubscription, openServerCheckout } from '@/lib/billingCheckout';
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

vi.mock('@/lib/billingCheckout', () => ({
  createBillingCheckoutSession: vi.fn(),
  openServerCheckout: vi.fn(),
  cancelBillingSubscription: vi.fn(),
}));

describe('SubscriptionPage PayPal Lifecycle & Cancellation', () => {
  const mockRefetchMe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
    subscribeButtons.forEach(btn => {
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
    subscribeButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('initiates checkout with preparation state when Subscribe is clicked', async () => {
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

    expect(createBillingCheckoutSession).toHaveBeenCalledWith('pro');
    await waitFor(() => {
      expect(openServerCheckout).toHaveBeenCalled();
    });
  });

  it('displays cancel notice when returning with ?billing=canceled', () => {
    mockLocation.search = '?billing=canceled';
    renderWithProviders(<SubscriptionPage />, { initialPath: '/subscription?billing=canceled' });

    expect(screen.getByText(/subscription checkout was canceled\. no charges were made\./i)).toBeInTheDocument();
  });

  it('polls and displays payment approved state when returning with ?billing=success', async () => {
    mockLocation.search = '?billing=success';
    // Simulate refetch returning upgraded plan
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
  });

  it('shows cancellation section and handles confirmation dialog when can_cancel_subscription is true', async () => {
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
      subscriptionId: 'I-SUB999',
    });

    renderWithProviders(<SubscriptionPage />);

    // Cancel Subscription button is rendered in Subscription Management card
    const cancelBtn = screen.getByRole('button', { name: /cancel subscription/i });
    expect(cancelBtn).toBeInTheDocument();

    // Click to open confirmation dialog
    fireEvent.click(cancelBtn);

    // Dialog opens with title and details
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to cancel your subscription\?/i)).toBeInTheDocument();

    // Confirm Cancellation CTA inside dialog
    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(cancelBillingSubscription).toHaveBeenCalled();
      expect(screen.getByText(/your subscription has been canceled/i)).toBeInTheDocument();
    });
  });
});
