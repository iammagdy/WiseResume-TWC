import { type ComponentType, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Check,
  Crown,
  Share2,
  Sparkles,
  Gem,
  CalendarClock,
  FileText,
  Wand2,
  Target,
  MessageSquare,
  Mail,
  LayoutList,
  BarChart2,
  Package,
  Infinity as InfinityIcon,
  Bot,
  Star,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import { useResumes } from '@/hooks/useResumes';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, PlanName } from '@/hooks/usePlan';
import { useLocale } from '@/i18n/LocaleProvider';
import { useMe } from '@/hooks/useMe';
import { TrialCountdownBadge } from '@/components/ui/TrialCountdownBadge';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';
import {
  cancelBillingSubscription,
  clearPlanAttemptKey,
  captureBillingOrder,
  type BillingCheckoutPlan,
} from '@/lib/billingCheckout';
import { PaymentConfirmationModal } from '@/components/subscription/PaymentConfirmationModal';

interface PlanFeature {
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  free: [
    { label: '1 regular resume', icon: FileText },
    { label: '5 AI actions/day', icon: Bot },
    { label: 'Resume Editor', icon: Wand2 },
    { label: 'Standard templates', icon: Star },
    { label: 'Standard export formats', icon: Package },
    { label: 'WiseResume branding on applicable exports', icon: Package },
    { label: 'Portfolio core', icon: Star },
    { label: 'Current Free portfolio-AI allowance', icon: Bot },
    { label: 'Readiness/ATS-oriented scoring where supported', icon: Target },
  ],
  pro: [
    { label: 'Everything in Free', icon: Crown },
    { label: 'Unlimited resumes', icon: FileText },
    { label: '50 AI actions/day', icon: Bot },
    { label: 'Current Pro per-minute allowance', icon: Clock },
    { label: 'Smart Tailoring / Tailoring Hub', icon: Target },
    { label: 'AI Studio', icon: Wand2 },
    { label: 'Cover Letters', icon: Mail },
    { label: 'Interview Prep', icon: MessageSquare },
    { label: 'Application Tracker / saved jobs', icon: LayoutList },
    { label: 'Current Pro portfolio-AI allowance', icon: Bot },
    { label: 'WiseResume branding remains on exports', icon: Package },
  ],
  premium: [
    { label: 'Everything in Pro', icon: Crown },
    { label: 'Unlimited AI actions', icon: InfinityIcon },
    { label: 'Current Ultimate per-minute allowance', icon: Clock },
    { label: 'Analytics + CSV export', icon: BarChart2 },
    { label: 'Remove WiseResume branding', icon: Package },
    { label: 'Current Ultimate portfolio-AI allowance', icon: Bot },
  ],
};

const PLAN_PRICES: Record<string, string> = {
  pro: '$5',
  premium: '$10',
};

const RESUME_LIMIT: Record<PlanName, number | null> = {
  free: 1,
  pro: null,
  premium: null,
};

function PlanIcon({ plan, className }: { plan: string; className?: string }) {
  if (plan === 'premium') return <Gem className={className ?? 'w-5 h-5 text-amber-500'} />;
  if (plan === 'pro') return <Crown className={className ?? 'w-5 h-5 text-blue-500'} />;
  return <Sparkles className={className ?? 'w-5 h-5 text-muted-foreground'} />;
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();
  const { data: credits, isLoading: creditsLoading } = useAICredits();
  const { plan, isPro, isPremium, isLoading: planLoading } = usePlan();
  const { t } = useLocale();
  const planLabel = (value: string) => value === 'premium'
    ? t('app.premium', 'Ultimate')
    : value === 'pro'
      ? t('app.pro', 'Pro')
      : t('app.free', 'Free');
  const { data: meData, isLoading: meLoading, isFetching: meFetching, refetch: refetchMe } = useMe();
  usePlanUpgradeCelebration();


  useEffect(() => {
    return () => {
      if (cancelPollTimerRef.current !== null) {
        window.clearInterval(cancelPollTimerRef.current);
        cancelPollTimerRef.current = null;
      }
    };
  }, []);

  const [checkoutPlan, setCheckoutPlan] = useState<BillingCheckoutPlan | null>(() => {
    const pending = sessionStorage.getItem('billing_pending_plan');
    return pending === 'pro' || pending === 'premium' ? pending : null;
  });
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'preparing' | 'confirming' | 'approved' | 'timeout' | 'canceled' | 'error'>('idle');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [canceledNoticeDismissed, setCanceledNoticeDismissed] = useState(false);
  const [confirmModalPlan, setConfirmModalPlan] = useState<BillingCheckoutPlan | null>(null);

  // Cancellation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  const [cancelStage, setCancelStage] = useState<'idle' | 'updating' | 'delayed' | 'confirmed'>('idle');
  const cancelPollTimerRef = useRef<number | null>(null);

  const subscriptionData = meData?.subscription;
  const isSubscriptionResolving = (meLoading || meFetching) && subscriptionData === undefined;
  const canSubscribe = subscriptionData?.can_subscribe === true;
  const isPaid = isPro || isPremium;
  const canCancelSubscription = isPaid && (subscriptionData?.can_cancel_subscription ?? false);
  const renewalCancellationPending = isPaid && (subscriptionData?.renewal_cancellation_pending === true);
  const providerExpiresAt = subscriptionData?.provider_expires_at ?? null;
  const effectiveExpiresAt = subscriptionData?.expires_at ?? null;
  const willRenew = subscriptionData?.will_renew;
  const providerStatus = subscriptionData?.provider_status;

  // Lifecycle return detection & Polling
  useEffect(() => {
    const searchStr = location.search || (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(searchStr);
    const billingParam = params.get('billing');

    if (billingParam === 'canceled') {
      clearPlanAttemptKey();
      try {
        sessionStorage.removeItem('billing_pending_plan');
      } catch {}
      setCheckoutStatus('canceled');
      return;
    }

    if (billingParam === 'order_approved') {
      const orderId = params.get('token') || params.get('order_id');
      const rawPending = sessionStorage.getItem('billing_pending_plan');
      const pendingPlan = rawPending === 'pro' || rawPending === 'premium' ? rawPending : null;

      if (!orderId) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
        void refetchMe();
        setCheckoutStatus('idle');
        return;
      }

      if (pendingPlan) {
        setCheckoutPlan(pendingPlan);
      }
      setCheckoutStatus('confirming');
      setCheckoutMessage(t('app.aiStudio.subscriptionPage.checkoutConfirming', 'Confirming your subscription…'));

      let isMounted = true;
      (async () => {
        const captureRes = await captureBillingOrder(orderId);
        if (!isMounted) return;

        if (captureRes.ok) {
          clearPlanAttemptKey();
          try {
            sessionStorage.removeItem('billing_pending_plan');
          } catch {}
          await refetchMe();
          setCheckoutStatus('approved');
          setCheckoutMessage(t('app.aiStudio.subscriptionPage.paymentApproved', 'Payment Approved'));
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {}
        } else {
          // Check if webhook already fulfilled the order
          const result = await refetchMe();
          const resolved = String(result.data?.subscription?.effective_plan ?? '').toLowerCase();
          const targetReached = pendingPlan === 'premium'
            ? resolved === 'premium'
            : pendingPlan === 'pro'
              ? resolved === 'pro' || resolved === 'premium'
              : false;

          if (targetReached) {
            clearPlanAttemptKey();
            try {
              sessionStorage.removeItem('billing_pending_plan');
            } catch {}
            setCheckoutStatus('approved');
            setCheckoutMessage(t('app.aiStudio.subscriptionPage.paymentApproved', 'Payment Approved'));
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch {}
          } else {
            setCheckoutStatus('error');
            setCheckoutMessage(captureRes.message || t('app.aiStudio.subscriptionPage.checkoutError', 'We couldn’t start checkout. Please try again.'));
          }
        }
      })();

      return () => {
        isMounted = false;
      };
    }

    const hasApprovalParams = billingParam === 'success' ||
      billingParam === 'pending' ||
      params.has('subscription_id') ||
      params.has('token') ||
      params.has('ba_token');

    if (!hasApprovalParams) return;

    const rawPending = sessionStorage.getItem('billing_pending_plan');
    const pendingPlan = rawPending === 'pro' || rawPending === 'premium' ? rawPending : null;

    if (!pendingPlan) {
      // Stale or unverified return without an active checkout attempt in this session
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
      void refetchMe();
      setCheckoutStatus('idle');
      return;
    }

    setCheckoutPlan(pendingPlan);
    setCheckoutStatus('confirming');
    setCheckoutMessage(t('app.aiStudio.subscriptionPage.checkoutConfirming', 'Confirming your subscription…'));

    let isMounted = true;
    const checkStatus = async () => {
      const result = await refetchMe();
      if (!isMounted) return false;
      const resolved = String(result.data?.subscription?.effective_plan ?? '').toLowerCase();
      const targetReached = pendingPlan === 'premium'
        ? resolved === 'premium'
        : pendingPlan === 'pro'
          ? resolved === 'pro' || resolved === 'premium'
          : false;

      if (targetReached) {
        clearPlanAttemptKey();
        try {
          sessionStorage.removeItem('billing_pending_plan');
        } catch {}
        setCheckoutStatus('approved');
        setCheckoutMessage(t('app.aiStudio.subscriptionPage.paymentApproved', 'Payment Approved'));
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
        return true;
      }
      return false;
    };

    // Run first check immediately on return
    checkStatus();

    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      const done = await checkStatus();
      if (done || !isMounted) {
        window.clearInterval(timer);
      } else if (Date.now() - startedAt > 90_000) {
        window.clearInterval(timer);
        setCheckoutStatus('timeout');
      }
    }, 5_000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [location.search, refetchMe, t]);

  const beginCheckout = (target: BillingCheckoutPlan) => {
    if (!canSubscribe || isPro || target === plan) return;
    if (checkoutPlan && checkoutPlan !== target) {
      clearPlanAttemptKey(checkoutPlan);
    }
    setCheckoutPlan(target);
    setConfirmModalPlan(target);
  };

  const handleConfirmCancel = async () => {
    setIsCanceling(true);
    setCancelError(null);
    const result = await cancelBillingSubscription({
      reason: 'User requested cancellation in subscription settings',
      provider: subscriptionData?.provider_source === 'whop' || subscriptionData?.provider_source === 'paypal'
        ? subscriptionData.provider_source
        : undefined,
    });

    setIsCanceling(false);
    if (!result.ok) {
      setCancelError(result.message || t('app.aiStudio.subscriptionPage.cancelFailed', 'Unable to cancel subscription. Please try again.'));
      return;
    }

    setCancelDialogOpen(false);
    setCancelStage('updating');

    const initialRes = await refetchMe();
    const initialSub = initialRes?.data?.subscription;
    if (initialSub?.will_renew === false) {
      const expiry = initialSub?.provider_expires_at || initialSub?.expires_at || providerExpiresAt || effectiveExpiresAt;
      const expiryFormatted = formatDate(expiry);
      const successText = expiryFormatted
        ? t('app.aiStudio.subscriptionPage.cancelSuccessWithDate', 'Your subscription has been canceled. You retain full access until {{date}}.', { date: expiryFormatted })
        : t('app.aiStudio.subscriptionPage.cancelNeutralNotice', 'Your cancellation will stop future renewals. Your account will update once the cancellation is confirmed.');
      setCancelSuccessMessage(successText);
      setCancelStage('confirmed');
      return;
    }

    const pollStart = Date.now();
    cancelPollTimerRef.current = window.setInterval(async () => {
      const res = await refetchMe();
      const sub = res?.data?.subscription;
      const isSettled = sub?.will_renew === false;
      if (isSettled) {
        if (cancelPollTimerRef.current !== null) {
          window.clearInterval(cancelPollTimerRef.current);
          cancelPollTimerRef.current = null;
        }
        const expiry = sub?.provider_expires_at || sub?.expires_at || providerExpiresAt || effectiveExpiresAt;
        const expiryFormatted = formatDate(expiry);
        const successText = expiryFormatted
          ? t('app.aiStudio.subscriptionPage.cancelSuccessWithDate', 'Your subscription has been canceled. You retain full access until {{date}}.', { date: expiryFormatted })
          : t('app.aiStudio.subscriptionPage.cancelNeutralNotice', 'Your cancellation will stop future renewals. Your account will update once the cancellation is confirmed.');
        setCancelSuccessMessage(successText);
        setCancelStage('confirmed');
        return;
      }
      if (Date.now() - pollStart >= 30_000) {
        if (cancelPollTimerRef.current !== null) {
          window.clearInterval(cancelPollTimerRef.current);
          cancelPollTimerRef.current = null;
        }
        setCancelStage('delayed');
      }
    }, 3_000);
  };

  const trialPlan = subscriptionData?.trial_plan ?? null;
  const trialExpiresAt = subscriptionData?.trial_expires_at ?? null;
  const isActiveTrial = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt) > new Date();

  const resumeLimit = RESUME_LIMIT[plan];
  const resumeCount = resumes.length;

  const dailyUsage = credits?.daily_usage ?? 0;
  const dailyLimit = credits?.daily_limit ?? 5;
  const isUnlimitedCredits = dailyLimit === Infinity || dailyLimit < 0;
  const isUnlimitedResumes = resumeLimit === null;

  const isLoading = planLoading || resumesLoading || creditsLoading;
  const upgradeTargets: string[] = isPremium ? [] : isPro ? ['premium'] : ['pro', 'premium'];
  const formattedExpiration = formatDate(providerExpiresAt || effectiveExpiresAt);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <header className="shrink-0 pt-safe sticky top-0 z-10 border-b border-border/70 bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3">
          <BackButton />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">WiseResume</p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t('app.aiStudio.subscriptionPage.title', 'Subscription')}</h1>
          </div>
          <div className="ml-auto"><TrialCountdownBadge /></div>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-6 pb-28 sm:px-6 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
            <div>
              <Badge variant="outline" className="mb-4 rounded-full border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t('app.aiStudio.subscriptionPage.aiWorkspace', 'Your AI workspace')}
              </Badge>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                {isPaid
                  ? t('app.aiStudio.subscriptionPage.heroTitlePaid', 'Keep your career momentum moving.')
                  : t('app.aiStudio.subscriptionPage.heroTitleFree', 'Build a resume that gets noticed.')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isPaid
                  ? t('app.aiStudio.subscriptionPage.heroDescriptionPaid', 'Everything is ready for your next application. Manage your plan and keep creating with confidence.')
                  : t('app.aiStudio.subscriptionPage.heroDescriptionFree', 'Choose the tools that match your next career move. Upgrade when you are ready for more AI support.')}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isPremium ? 'bg-amber-500/15 text-amber-600' : isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <PlanIcon plan={plan} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t('app.aiStudio.subscriptionPage.currentPlan', 'Current plan')}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xl font-bold">{planLabel(plan)}</p>
                    <Badge variant={isPaid ? 'default' : 'secondary'}>{isPaid ? t('app.aiStudio.subscriptionPage.active', 'Active') : t('app.aiStudio.subscriptionPage.free', 'Free')}</Badge>
                  </div>
                  {formattedExpiration && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{willRenew === false ? t('app.aiStudio.subscriptionPage.accessEndsOn', 'Access ends on {{date}}', { date: formattedExpiration }) : t('app.aiStudio.subscriptionPage.renewsOn', 'Renews on {{date}}', { date: formattedExpiration })}</p>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {(checkoutStatus !== 'idle' || cancelStage !== 'idle') && (
          <div className="mt-5 space-y-3">
            {checkoutStatus === 'confirming' && <Card className="border-primary/30 bg-primary/5" role="status"><CardContent className="flex items-start gap-3 p-4"><Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary motion-reduce:animate-none" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.confirmingTitle', 'Confirming your subscription…')}</p><p className="mt-1 text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.confirmingDescription', 'Please wait while we verify your payment.')}</p></div></CardContent></Card>}
            {checkoutStatus === 'approved' && <Card className="border-emerald-500/30 bg-emerald-500/5" role="status"><CardContent className="flex items-start gap-3 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.paymentApproved', 'Payment Approved')}</p><p className="mt-1 text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.planActive', 'Your {{plan}} plan is now active.', { plan: planLabel(plan) })}</p></div></CardContent></Card>}
            {checkoutStatus === 'timeout' && <Card className="border-amber-500/30 bg-amber-500/5" role="status"><CardContent className="flex items-center gap-3 p-4"><Clock className="h-5 w-5 text-amber-600" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.timeoutTitle', 'Taking Longer Than Usual')}</p><p className="mt-1 text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.timeoutNotice', 'This is taking longer than usual. Your subscription will update automatically once payment confirmation is complete.')}</p></div></CardContent></Card>}
            {checkoutStatus === 'canceled' && !canceledNoticeDismissed && <Card className="border-border bg-muted/40" role="status"><CardContent className="flex items-center justify-between gap-3 p-4"><p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 shrink-0" />{t('app.aiStudio.subscriptionPage.checkoutCanceled', 'Subscription checkout was canceled. No charges were made.')}</p><Button variant="ghost" size="sm" onClick={() => setCanceledNoticeDismissed(true)}>{t('common.dismiss', 'Dismiss')}</Button></CardContent></Card>}
            {checkoutStatus === 'error' && <Card className="border-destructive/40" role="alert"><CardContent className="flex items-start gap-3 p-4"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div className="flex-1"><p className="text-sm text-destructive">{checkoutMessage}</p>{checkoutPlan && canSubscribe && <Button variant="outline" size="sm" className="mt-3" onClick={() => beginCheckout(checkoutPlan)}>{t('app.aiStudio.subscriptionPage.checkoutRetry', 'Try again')}</Button>}</div></CardContent></Card>}
            {cancelStage === 'updating' && <Card className="border-primary/30 bg-primary/5" role="status"><CardContent className="flex items-start gap-3 p-4"><Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary motion-reduce:animate-none" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.cancelRequestedTitle', 'Cancellation Requested')}</p><p className="mt-1 text-sm text-muted-foreground">{t('app.aiStudio.subscriptionPage.cancelUpdatingDescription', 'Cancellation requested. Updating your subscription…')}</p></div></CardContent></Card>}
            {cancelStage === 'delayed' && <Card className="border-amber-500/30 bg-amber-500/5" role="status"><CardContent className="flex items-start gap-3 p-4"><Clock className="mt-0.5 h-5 w-5 text-amber-600" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.cancelDelayedTitle', 'Cancellation Status Updating')}</p><p className="mt-1 text-sm text-muted-foreground">{t('app.aiStudio.subscriptionPage.cancelDelayedDescription', 'Your cancellation request was received. Your subscription status is still updating. You can refresh this page in a moment.')}</p></div></CardContent></Card>}
            {cancelStage === 'confirmed' && cancelSuccessMessage && <Card className="border-emerald-500/30 bg-emerald-500/5" role="status"><CardContent className="flex items-start gap-3 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.subscriptionCanceledTitle', 'Subscription Canceled')}</p><p className="mt-1 text-sm text-muted-foreground">{cancelSuccessMessage}</p></div></CardContent></Card>}
          </div>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BarChart2 className="h-4 w-4 text-primary" />{t('app.aiStudio.subscriptionPage.usageTitle', 'Usage')}</CardTitle></CardHeader><CardContent className="space-y-5">
            <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{t('app.aiStudio.subscriptionPage.resumes', 'Resumes')}</span><span className="font-semibold">{isUnlimitedResumes ? <InfinityIcon className="inline h-4 w-4" /> : `${resumeCount} / ${resumeLimit}`}</span></div><Progress value={isUnlimitedResumes ? 100 : Math.min((resumeCount / (resumeLimit ?? 1)) * 100, 100)} className="h-2" /><p className="mt-2 text-xs text-muted-foreground">{isUnlimitedResumes ? t('app.aiStudio.subscriptionPage.unlimited', 'Unlimited') : t('app.aiStudio.subscriptionPage.resumeLimitHint', 'Add another resume by upgrading when you need it.')}</p></div>
            <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{t('app.aiStudio.subscriptionPage.aiCreditsToday', 'AI Credits (today)')}</span><span className="font-semibold">{isUnlimitedCredits ? <InfinityIcon className="inline h-4 w-4" /> : `${dailyUsage} / ${dailyLimit}`}</span></div><Progress value={isUnlimitedCredits ? 100 : dailyLimit > 0 ? Math.min((dailyUsage / dailyLimit) * 100, 100) : 0} className="h-2" /><p className="mt-2 text-xs text-muted-foreground">{isUnlimitedCredits ? t('app.aiStudio.subscriptionPage.unlimitedAiCreditsPerDay', 'Unlimited AI credits/day') : t('app.aiStudio.subscriptionPage.resetsDaily', 'Resets daily at midnight UTC')}</p></div>
          </CardContent></Card>

          <Card className="rounded-2xl border-primary/20 bg-primary/[0.03]"><CardHeader className="pb-3"><CardTitle className="text-base">{t('app.aiStudio.subscriptionPage.planIncludes', 'Your {{plan}} plan includes', { plan: planLabel(plan) })}</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.slice(0, 6).map((feature, index) => { const Icon = feature.icon; return <div key={`${plan}-${index}`} className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm"><Icon className="h-4 w-4 shrink-0 text-primary" /><span>{t(`app.aiStudio.planFeatures.${plan}.${index}`, feature.label)}</span><Check className="ml-auto h-4 w-4 shrink-0 text-emerald-600" /></div>; })}</CardContent></Card>
        </section>

        {!isPremium && <section className="mt-6"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t('app.aiStudio.subscriptionPage.nextStep', 'Next step')}</p><h2 className="mt-1 text-xl font-bold">{t('app.aiStudio.subscriptionPage.choosePlan', 'Choose the support you need')}</h2></div><p className="hidden text-xs text-muted-foreground sm:block">{t('app.aiStudio.subscriptionPage.planOptionsNote', 'Monthly subscription · cancel anytime')}</p></div><div className="grid gap-4 md:grid-cols-2">{upgradeTargets.map((target) => { const targetPlan = target as BillingCheckoutPlan; const isTargetPremium = target === 'premium'; const isPreparing = checkoutStatus === 'preparing' && checkoutPlan === targetPlan; const blocked = isSubscriptionResolving || !canSubscribe || checkoutStatus === 'preparing' || target === plan || (isPro && isTargetPremium); return <Card key={target} className={`relative overflow-hidden rounded-2xl ${isTargetPremium ? 'border-amber-400/50' : 'border-primary/30'}`}><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isTargetPremium ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}><PlanIcon plan={target} className="h-5 w-5" /></div><Badge variant="outline" className={isTargetPremium ? 'border-amber-400/50 text-amber-600' : 'border-primary/30 text-primary'}>{isTargetPremium ? t('app.aiStudio.subscriptionPage.powerUsers', 'POWER USERS') : t('app.aiStudio.subscriptionPage.popular', 'POPULAR')}</Badge></div><div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold">{PLAN_PRICES[target]}</span><span className="text-sm text-muted-foreground">{t('app.aiStudio.subscriptionPage.perMonth', '/month')}</span></div><p className="mt-1 text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.planOptionsNote', 'Monthly subscription · cancel anytime')}</p><div className="mt-4 flex-1 space-y-2">{PLAN_FEATURES[target as keyof typeof PLAN_FEATURES].slice(0, 5).map((feature, index) => { const Icon = feature.icon; return <div key={`${target}-feature-${index}`} className="flex items-start gap-2 text-sm"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isTargetPremium ? 'text-amber-600' : 'text-primary'}`} /><span>{t(`app.aiStudio.planFeatures.${target}.${index}`, feature.label)}</span></div>; })}</div><Button className="mt-5 h-11 w-full gap-2" disabled={blocked} onClick={() => beginCheckout(targetPlan)} data-track={`subscription-subscribe-cta-${target}`}>{isPreparing && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{t('app.aiStudio.subscriptionPage.subscribe', 'Subscribe')}</Button>{isPro && isTargetPremium && <p className="mt-2 text-center text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.planChangesUnavailable', 'Plan changes are temporarily unavailable.')}</p>}{!isSubscriptionResolving && !canSubscribe && <p className="mt-2 text-center text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.enrollmentClosed', 'Subscription enrollments are currently closed.')}</p>}</CardContent></Card>; })}</div></section>}

        {(canCancelSubscription || renewalCancellationPending) && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t('app.aiStudio.subscriptionPage.manageTitle', 'Subscription Management')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {renewalCancellationPending
                    ? t('app.aiStudio.subscriptionPage.canceling', 'Canceled')
                    : t('app.aiStudio.subscriptionPage.activePlanNote', 'You have an active {{plan}} subscription.', { plan: planLabel(plan) })}
                </p>
              </div>
              {canCancelSubscription && !renewalCancellationPending && (
                <Button
                  variant="outline"
                  className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  {t('app.aiStudio.subscriptionPage.cancelSubscription', 'Cancel subscription')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Share2 className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.shareTitle', 'Share WiseResume')}</p><p className="mt-0.5 text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.shareDescription', 'Send the app link to a friend')}</p></div><Button variant="outline" size="sm" onClick={() => navigate('/referral')}>{t('app.aiStudio.subscriptionPage.share', 'Share')}</Button></div>
        </div>
<Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{t('app.aiStudio.subscriptionPage.cancelDialogTitle', 'Cancel Subscription')}</DialogTitle><DialogDescription>{formattedExpiration ? t('app.aiStudio.subscriptionPage.cancelDialogDescriptionWithDate', 'Are you sure you want to cancel your subscription? Your access will remain active until {{date}}.', { date: formattedExpiration }) : t('app.aiStudio.subscriptionPage.cancelDialogDescriptionNeutral', 'Are you sure you want to cancel your subscription? Your cancellation will stop future renewals.')}</DialogDescription></DialogHeader>{cancelError && <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{cancelError}</div>}<DialogFooter><Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={isCanceling}>{t('app.aiStudio.subscriptionPage.keepSubscription', 'Keep Subscription')}</Button><Button variant="destructive" onClick={handleConfirmCancel} disabled={isCanceling}>{isCanceling && <Loader2 className="h-4 w-4 animate-spin" />}{isCanceling ? t('app.aiStudio.subscriptionPage.canceling', 'Canceling…') : t('app.aiStudio.subscriptionPage.confirmCancel', 'Confirm Cancellation')}</Button></DialogFooter></DialogContent></Dialog>

        {confirmModalPlan && <PaymentConfirmationModal open={!!confirmModalPlan} onOpenChange={(open) => { if (!open) setConfirmModalPlan(null); }} plan={confirmModalPlan} onSuccess={() => { setConfirmModalPlan(null); setCheckoutPlan(confirmModalPlan); setCheckoutStatus('confirming'); setCheckoutMessage(t('app.aiStudio.subscriptionPage.checkoutConfirming', 'Confirming your subscription…')); }} />}
      </main>
    </div>
  );
}
