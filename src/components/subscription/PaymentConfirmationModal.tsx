import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Gem,
  Repeat,
  Calendar,
  Check,
  Tag,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
} from 'lucide-react';
import {
  createBillingCheckoutSession,
  openServerCheckout,
  getCouponQuote,
  getOrCreatePlanAttemptKey,
  clearPlanAttemptKey,
  type BillingCheckoutPlan,
  type BillingPaymentMode,
  type CouponQuote,
} from '@/lib/billingCheckout';

export interface PaymentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BillingCheckoutPlan;
  environment?: string;
  onSuccess?: () => void;
}

const BASE_PLAN_PRICES: Record<BillingCheckoutPlan, number> = {
  pro: 5.0,
  premium: 10.0,
};

export function PaymentConfirmationModal({
  open,
  onOpenChange,
  plan,
  environment,
  onSuccess,
}: PaymentConfirmationModalProps) {
  const [paymentMode, setPaymentMode] = useState<BillingPaymentMode>('subscription');
  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedQuote, setAppliedQuote] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const basePrice = BASE_PLAN_PRICES[plan] ?? 5.0;
  const isUltimate = plan === 'premium';
  const planDisplayName = isUltimate ? 'Ultimate' : 'Pro';

  // Reset transient modal state on open
  useEffect(() => {
    if (open) {
      setCheckoutError(null);
      setCouponError(null);
      setIsSubmitting(false);
    } else {
      // Clear coupon state when modal is closed
      setCouponInput('');
      setAppliedQuote(null);
      setCouponError(null);
      setCheckoutError(null);
    }
  }, [open]);

  // When switching modes, if switching to subscription, clear applied coupon
  const handleSelectMode = (mode: BillingPaymentMode) => {
    setPaymentMode(mode);
    setCheckoutError(null);
    if (mode === 'subscription') {
      setAppliedQuote(null);
      setCouponError(null);
    }
  };

  const handleApplyCoupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingCoupon(true);
    setCouponError(null);
    setCheckoutError(null);

    try {
      const res = await getCouponQuote({
        plan,
        paymentMode: 'one_time',
        couponCode: cleanCode,
      });

      if (!res.ok) {
        setCouponError(res.message || 'Unable to validate coupon.');
        setAppliedQuote(null);
        return;
      }

      if (!res.quote.eligible) {
        setCouponError(res.quote.message || 'This coupon code is not applicable.');
        setAppliedQuote(null);
        return;
      }

      setAppliedQuote(res.quote);
      setCouponError(null);
    } catch {
      setCouponError('Network error while validating coupon. Please try again.');
      setAppliedQuote(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedQuote(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      // Record intended plan so return lifecycle can verify
      try {
        sessionStorage.setItem('billing_pending_plan', plan);
      } catch {}

      const idempotencyKey = getOrCreatePlanAttemptKey(plan);
      const result = await createBillingCheckoutSession(plan, {
        idempotencyKey,
        paymentMode,
        couponCode: paymentMode === 'one_time' && appliedQuote?.eligible ? appliedQuote.code : null,
        environment,
      });

      if (!result.ok) {
        if (!result.retryable) {
          clearPlanAttemptKey(plan);
        }
        setCheckoutError(result.message || 'Failed to initialize checkout. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (result.session.checkout_url) {
        const redirected = openServerCheckout(result.session, environment);
        if (!redirected) {
          setCheckoutError('Security error: Checkout URL verification failed.');
          setIsSubmitting(false);
        } else {
          onSuccess?.();
        }
      } else {
        setCheckoutError('Checkout session did not return a valid payment URL.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Checkout encountered an unexpected error.';
      setCheckoutError(errMessage);
      setIsSubmitting(false);
    }
  };

  // Pricing calculations
  const originalAmount = basePrice;
  const discountAmount = paymentMode === 'one_time' && appliedQuote?.eligible ? appliedQuote.discount_amount : 0;
  const finalAmount = Math.max(0.5, originalAmount - discountAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header Banner */}
        <div className="shrink-0 bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b border-border p-5 sm:p-6 pb-4 sm:pb-5">
          <DialogHeader className="gap-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  isUltimate ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/15 text-primary'
                }`}>
                  {isUltimate ? <Gem className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    Upgrade to {planDisplayName}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Select your preferred billing frequency
                  </p>
                </div>
              </div>
              <Badge variant={isUltimate ? 'default' : 'secondary'} className="text-xs px-2.5 py-0.5 font-semibold">
                {isUltimate ? 'Full Access' : 'Popular'}
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Choose between a recurring monthly subscription or a one-time 30-day access payment.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
          {/* Payment Mode Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Billing Option
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Monthly Subscription */}
              <button
                type="button"
                onClick={() => handleSelectMode('subscription')}
                className={`relative flex flex-col p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 ${
                  paymentMode === 'subscription'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border hover:border-border/80 bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Repeat className={`w-4 h-4 ${paymentMode === 'subscription' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>Monthly</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    paymentMode === 'subscription' ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {paymentMode === 'subscription' && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                  </div>
                </div>
                <div className="text-xl font-bold">
                  ${basePrice.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Auto-renews monthly. Cancel anytime.
                </p>
              </button>

              {/* Option 2: 30-Day Access (One-Time) */}
              <button
                type="button"
                onClick={() => handleSelectMode('one_time')}
                className={`relative flex flex-col p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 ${
                  paymentMode === 'one_time'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border hover:border-border/80 bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Calendar className={`w-4 h-4 ${paymentMode === 'one_time' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>30-Day Access</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    paymentMode === 'one_time' ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {paymentMode === 'one_time' && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                  </div>
                </div>
                <div className="text-xl font-bold">
                  ${basePrice.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground"> once</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Fixed 30 days. No automatic renewal.
                </p>
              </button>
            </div>
          </div>

          {/* Coupon Code Section */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Coupon Code
            </label>

            {paymentMode === 'subscription' ? (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  Coupons currently apply to 30-day access purchases only.{' '}
                  <button
                    type="button"
                    onClick={() => handleSelectMode('one_time')}
                    className="text-primary font-medium hover:underline inline"
                  >
                    Switch to 30-Day Access
                  </button>{' '}
                  to apply your coupon code.
                </div>
              </div>
            ) : appliedQuote ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Coupon {appliedQuote.code} applied!</span>
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    -${appliedQuote.discount_amount.toFixed(2)} OFF
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Remove coupon</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleApplyCoupon();
                      }
                    }}
                    className="h-10 text-xs font-mono uppercase"
                    disabled={isValidatingCoupon || isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || isValidatingCoupon || isSubmitting}
                    className="h-10 px-4 text-xs font-semibold shrink-0"
                  >
                    {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Price Breakdown Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Original Price</span>
              <span>${originalAmount.toFixed(2)}</span>
            </div>

            {paymentMode === 'one_time' && appliedQuote && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Discount ({appliedQuote.code})</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-border pt-2.5 flex justify-between items-baseline">
              <div>
                <span className="font-semibold text-sm">Total Due Today</span>
                <p className="text-[10px] text-muted-foreground">
                  {paymentMode === 'subscription'
                    ? 'Billed monthly until canceled'
                    : 'One-time charge for 30 days'}
                </p>
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                ${finalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Security & Payment Notice */}
          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Pay with PayPal or debit/credit card (where available)
            </p>
            <p className="text-[10px] text-muted-foreground/80 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Secured with 256-bit encryption • Server-verified checkout
            </p>
          </div>

          {/* Checkout Error Alert */}
          {checkoutError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{checkoutError}</div>
            </div>
          )}
        </div>

        {/* Pinned Action Buttons Footer */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-5 sm:px-6 py-3.5 space-y-2">
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full h-11 font-semibold text-sm gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting to PayPal…
              </>
            ) : (
              'Continue to PayPal'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
