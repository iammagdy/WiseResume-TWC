import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentConfirmationModal } from '../PaymentConfirmationModal';
import * as billingModule from '@/lib/billingCheckout';

vi.mock('@/lib/billingCheckout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/billingCheckout')>();
  return {
    ...actual,
    createBillingCheckoutSession: vi.fn(),
    openServerCheckout: vi.fn(),
    getCouponQuote: vi.fn(),
  };
});

describe('PaymentConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for Pro plan in default subscription mode', () => {
    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    expect(screen.getByText(/Upgrade to Pro/i)).toBeDefined();
    expect(screen.getByText('Monthly')).toBeDefined();
    expect(screen.getByText('30-Day Access')).toBeDefined();
    expect(screen.getByText('Total Due Today')).toBeDefined();
    expect(screen.getAllByText('$5.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Billed monthly until canceled')).toBeDefined();
    expect(screen.getByRole('button', { name: /continue to paypal/i })).toBeDefined();
  });

  it('renders correctly for Ultimate (premium) plan in default subscription mode', () => {
    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="premium"
      />
    );

    expect(screen.getByText(/Upgrade to Ultimate/i)).toBeDefined();
    expect(screen.getAllByText('$10.00').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to 30-Day Access mode and shows coupon input', () => {
    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    const oneTimeButton = screen.getByText('30-Day Access');
    fireEvent.click(oneTimeButton);

    expect(screen.getByPlaceholderText(/enter coupon code/i)).toBeDefined();
    expect(screen.getByText('One-time charge for 30 days')).toBeDefined();
  });

  it('validates coupon and updates price breakdown on success', async () => {
    vi.mocked(billingModule.getCouponQuote).mockResolvedValueOnce({
      ok: true,
      quote: {
        eligible: true,
        code: 'QA_PRO_50CENTS',
        plan: 'pro',
        payment_mode: 'one_time',
        original_amount: 5.00,
        discount_amount: 4.50,
        final_amount: 0.50,
        discount_type: 'percent',
        discount_value: 90,
      },
    });

    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    fireEvent.click(screen.getByText('30-Day Access'));

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    fireEvent.change(input, { target: { value: 'QA_PRO_50CENTS' } });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('-$4.50')).toBeDefined();
      expect(screen.getByText('$0.50')).toBeDefined();
    });
  });

  it('displays coupon error message if coupon is invalid', async () => {
    vi.mocked(billingModule.getCouponQuote).mockResolvedValueOnce({
      ok: true,
      quote: {
        eligible: false,
        reason: 'invalid_or_expired',
        message: 'The coupon code is invalid or has expired.',
        plan: 'pro',
        payment_mode: 'one_time',
        original_amount: 5.00,
        discount_amount: 0,
        final_amount: 5.00,
      },
    });

    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    fireEvent.click(screen.getByText('30-Day Access'));

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    fireEvent.change(input, { target: { value: 'EXPIRED123' } });

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByText('The coupon code is invalid or has expired.')).toBeDefined();
    });
  });

  it('submits checkout session with coupon code in one-time mode and invokes openServerCheckout', async () => {
    vi.mocked(billingModule.getCouponQuote).mockResolvedValueOnce({
      ok: true,
      quote: {
        eligible: true,
        code: 'QA_PRO_50CENTS',
        plan: 'pro',
        payment_mode: 'one_time',
        original_amount: 5.00,
        discount_amount: 4.50,
        final_amount: 0.50,
        discount_type: 'percent',
        discount_value: 90,
      },
    });

    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({
      ok: true,
      session: {
        session_id: 'sess_123',
        checkout_url: 'https://www.paypal.com/checkoutnow?token=EC-123',
        plan: 'pro',
        environment: 'production',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    vi.mocked(billingModule.openServerCheckout).mockReturnValueOnce(true);

    const onSuccess = vi.fn();
    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByText('30-Day Access'));

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    fireEvent.change(input, { target: { value: 'QA_PRO_50CENTS' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByText('$0.50')).toBeDefined();
    });

    const continueButton = screen.getByRole('button', { name: /continue to paypal/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(billingModule.createBillingCheckoutSession).toHaveBeenCalledWith('pro', {
        idempotencyKey: expect.stringMatching(/^web-/),
        paymentMode: 'one_time',
        couponCode: 'QA_PRO_50CENTS',
        environment: undefined,
      });
      expect(billingModule.openServerCheckout).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows explanation in recurring mode that coupons apply to 30-day access only', () => {
    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    expect(screen.getByText(/Coupons currently apply to 30-day access purchases only/i)).toBeDefined();
    const switchButton = screen.getByRole('button', { name: /switch to 30-day access/i });
    expect(switchButton).toBeDefined();

    // Clicking switch to 30-day access switches mode
    fireEvent.click(switchButton);
    expect(screen.getByPlaceholderText(/enter coupon code/i)).toBeDefined();
  });

  it('displays error message when checkout creation fails', async () => {
    vi.mocked(billingModule.createBillingCheckoutSession).mockResolvedValueOnce({
      ok: false,
      code: 'server_error',
      message: 'Failed to create checkout session.',
    });

    render(
      <PaymentConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        plan="pro"
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue to paypal/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create checkout session.')).toBeDefined();
    });
  });
});

