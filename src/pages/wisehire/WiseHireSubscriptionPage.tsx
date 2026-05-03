import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Sparkles, Tag, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/safeClient';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { useQueryClient } from '@tanstack/react-query';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

interface Tier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  features: string[];
  highlight?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'wisehire_starter',
    name: 'Starter',
    tagline: 'Perfect for small hiring teams',
    price: 'Early Access',
    features: [
      '5 active roles',
      '20 candidate briefs / month',
      'JD Writer',
      'Pipeline board',
      'Bring your own AI key',
    ],
  },
  {
    id: 'wisehire_professional',
    name: 'Professional',
    tagline: 'Everything a growing team needs',
    price: 'Early Access',
    highlight: true,
    features: [
      'Unlimited active roles',
      '100 candidate briefs / month',
      'JD Writer + AI suggestions',
      'Pipeline board',
      'AI key included',
      'Share links for briefs & scorecards',
      'Priority support',
    ],
  },
  {
    id: 'wisehire_business',
    name: 'Business',
    tagline: 'For high-volume hiring teams',
    price: 'Early Access',
    features: [
      'Unlimited everything',
      'Bulk candidate screening',
      'Advanced analytics',
      'Team seats',
      'Custom branding',
      'Dedicated account manager',
    ],
  },
  {
    id: 'wisehire_enterprise',
    name: 'Enterprise',
    tagline: 'Custom solutions for large organisations',
    price: 'Contact us',
    features: [
      'Volume pricing',
      'SSO / SAML',
      'Custom integrations',
      'SLA + uptime guarantee',
      'On-prem AI option',
    ],
  },
];

export default function WiseHireSubscriptionPage() {
  const { data: account, isLoading } = useWiseHireAccount();
  const queryClient = useQueryClient();
  const userId = getUserId();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  async function handleRedeemCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');

    try {
      // Task #48: route through the merged `coupons` edge function. The
      // sub-handler is selected by the `x-coupons-action` header so the
      // request body stays byte-for-byte identical to the original
      // redeem-coupon contract.
      const { data, error } = await supabase.functions.invoke('coupons', {
        body: { code: couponCode.trim() },
        headers: { 'x-coupons-action': 'redeem' },
      });

      if (error || !data?.success) {
        setCouponError(data?.error ?? error?.message ?? 'Invalid or expired coupon code.');
      } else {
        toast.success('Coupon applied! Your plan has been updated.');
        setCouponCode('');
        queryClient.invalidateQueries({ queryKey: ['wisehire-account', userId] });
      }
    } catch {
      setCouponError('Something went wrong. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <WiseHireShell>
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <Link
            to="/wisehire/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>

        <div className="text-center mb-10">
          <p className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
            WiseHire Plans
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Simple, transparent pricing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All plans include a 7-day Professional trial. Apply a coupon code if you have one.
          </p>
        </div>

        {/* Current plan status */}
        {!isLoading && account && (
          <CurrentPlanBanner account={account} />
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isCurrent={account?.currentPlan === tier.id}
            />
          ))}
        </div>

        {/* Coupon redemption */}
        <div className="max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
              Redeem a coupon code
            </h2>
          </div>
          <form onSubmit={handleRedeemCoupon} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="coupon" className="sr-only">Coupon code</Label>
              <Input
                id="coupon"
                placeholder="EARLYACCESS"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                disabled={couponLoading}
                className="uppercase font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </form>
          {couponError && (
            <div className="flex items-center gap-1.5 mt-2 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {couponError}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Need a plan?{' '}
          <a
            href="mailto:contact@thewise.cloud?subject=WiseHire%20Plan%20Enquiry"
            className="underline hover:text-slate-600"
          >
            Email us
          </a>{' '}
          and we'll get you set up.
        </p>
      </div>
    </div>
    </WiseHireShell>
  );
}

function CurrentPlanBanner({ account }: { account: ReturnType<typeof useWiseHireAccount>['data'] }) {
  if (!account) return null;
  const { isTrialActive, daysRemaining, currentPlan, isExpiredWithNoPlan, subscription } = account;

  if (isExpiredWithNoPlan) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-6 text-sm">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-red-700 dark:text-red-400">
          Your trial has expired. Apply a coupon code or{' '}
          <a href="mailto:contact@thewise.cloud" className="underline font-medium">contact us</a> to restore access.
        </span>
      </div>
    );
  }

  if (isTrialActive) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6 text-sm">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-700 dark:text-amber-400">
          You're on a <strong>7-day Professional trial</strong> —{' '}
          {daysRemaining === 0 ? 'expires today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}.
          Apply a coupon to continue after your trial.
        </span>
      </div>
    );
  }

  if (subscription?.coupon_code) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-6 text-sm">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-blue-700 dark:text-blue-400">
          Active plan: <strong className="capitalize">{currentPlan.replace('wisehire_', '')}</strong>{' '}
          (coupon: {subscription.coupon_code})
        </span>
      </div>
    );
  }

  return null;
}

function TierCard({ tier, isCurrent }: { tier: Tier; isCurrent: boolean }) {
  return (
    <div
      className={`relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm ${
        tier.highlight
          ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/30'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Early Access badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          <Sparkles className="h-2.5 w-2.5" />
          Early Access
        </span>
        {tier.highlight && (
          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            ⭐ Most Popular
          </span>
        )}
        {isCurrent && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Current
          </span>
        )}
      </div>

      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-0.5">{tier.name}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{tier.tagline}</p>

      <ul className="space-y-1.5 flex-1 mb-5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {tier.id === 'wisehire_enterprise' ? (
        <a href="mailto:contact@thewise.cloud?subject=WiseHire%20Enterprise">
          <Button variant="outline" size="sm" className="w-full text-xs">
            Contact us
          </Button>
        </a>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs opacity-60 cursor-not-allowed"
          disabled
        >
          Join Waitlist
        </Button>
      )}
    </div>
  );
}
