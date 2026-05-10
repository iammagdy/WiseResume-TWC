import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Check, Crown, Gift, Sparkles, Gem, Ticket, CalendarClock, FileText, Wand2, Target, MessageSquare, Mail, LayoutList, HeadphonesIcon, Palette, BarChart2, Package, Zap, Infinity, Bot, Star } from 'lucide-react';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useResumes } from '@/hooks/useResumes';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, PlanName } from '@/hooks/usePlan';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { Skeleton } from '@/components/ui/skeleton';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { TrialCountdownBadge } from '@/components/ui/TrialCountdownBadge';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';

interface PlanFeature {
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  free: [
    { label: '1 resume', icon: FileText },
    { label: 'Basic AI suggestions', icon: Bot },
    { label: 'ATS score check', icon: Target },
    { label: 'PDF export', icon: Package },
    { label: 'Portfolio site', icon: Star },
  ],
  pro: [
    { label: 'Unlimited resumes', icon: FileText },
    { label: 'Advanced AI tools', icon: Wand2 },
    { label: 'Smart tailoring', icon: Target },
    { label: 'Interview coaching', icon: MessageSquare },
    { label: 'Cover letter generator', icon: Mail },
    { label: 'Application tracker', icon: LayoutList },
    { label: 'Priority support', icon: HeadphonesIcon },
  ],
  premium: [
    { label: 'Everything in Pro', icon: Crown },
    { label: 'Custom branding', icon: Palette },
    { label: 'Analytics dashboard', icon: BarChart2 },
    { label: 'White-label exports', icon: Package },
    { label: 'Early access features', icon: Zap },
    { label: 'Dedicated support', icon: HeadphonesIcon },
  ],
};

const PLAN_PRICES: Record<string, string> = {
  pro: '$9',
  premium: '$19',
};

const RESUME_LIMIT: Record<PlanName, number | null> = {
  free: 1,
  pro: null,
  premium: null,
};

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function PlanIcon({ plan, className }: { plan: string; className?: string }) {
  if (plan === 'premium') return <Gem className={className ?? 'w-5 h-5 text-amber-500'} />;
  if (plan === 'pro') return <Crown className={className ?? 'w-5 h-5 text-blue-500'} />;
  return <Sparkles className={className ?? 'w-5 h-5 text-muted-foreground'} />;
}

interface CouponDetails {
  code: string;
  discount_type: string;
  discount_value: number;
  plan_override: string | null;
  plan_days: number | null;
  expires_at: string | null;
  target_plan: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();
  const { data: credits, isLoading: creditsLoading } = useAICredits();
  const { plan, isPro, isPremium, isLoading: planLoading } = usePlan();
  const { data: meData } = useMe();
  usePlanUpgradeCelebration();

  const trialPlan = meData?.subscription?.trial_plan ?? null;
  const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
  const isActiveTrial =
    !!trialPlan &&
    !!trialExpiresAt &&
    new Date(trialExpiresAt) > new Date();

  const resumeLimit = RESUME_LIMIT[plan];
  const resumeCount = resumes.length;

  const dailyUsage = credits?.daily_usage ?? 0;
  const dailyLimit = credits?.daily_limit ?? 5;
  const isUnlimitedCredits = dailyLimit === Infinity || dailyLimit < 0;
  const isUnlimitedResumes = resumeLimit === null;

  const handleUpgrade = (targetPlan: string) => {
    haptics.light();
    toast(`Upgrade to ${planLabel(targetPlan)} — coming soon!`, { icon: '🚀' });
  };

  const isLoading = planLoading || resumesLoading || creditsLoading;

  const upgradeTargets: string[] = isPremium ? [] : isPro ? ['premium'] : ['pro', 'premium'];

  const [couponCode, setCouponCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [couponDetails, setCouponDetails] = useState<CouponDetails | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleCheckCode = async () => {
    if (!couponCode.trim()) return;
    haptics.light();
    setChecking(true);
    try {
      const { data, error } = await appwriteFunctions.invoke('validate-coupon', {
        body: { code: couponCode.trim().toUpperCase() },
      });
      if (error) throw new Error(error.message);
      const result = data as { valid?: boolean; error?: string; already_on_plan?: boolean; coupon?: CouponDetails; trial_ends_at?: string | null };
      if (!result?.valid) {
        if (result?.already_on_plan) {
          toast.info(result.error ?? 'You already have access to this plan');
        } else {
          toast.error(result?.error ?? 'Invalid or expired code');
        }
        return;
      }
      setCouponDetails(result.coupon ?? null);
      setTrialEndsAt(result.trial_ends_at ?? null);
      setConfirmOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to check coupon');
    } finally {
      setChecking(false);
    }
  };

  const handleActivateNow = async () => {
    if (!couponCode.trim()) return;
    haptics.medium();
    setActivating(true);
    try {
      const { data, error } = await appwriteFunctions.invoke('redeem-coupon', {
        body: { code: couponCode.trim().toUpperCase() },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; message?: string; error?: string; already_on_plan?: boolean };
      if (result?.success === false) {
        if (result?.already_on_plan) {
          toast.info(result.error ?? 'You already have access to this plan');
          setConfirmOpen(false);
          return;
        }
        throw new Error(result.error ?? 'Invalid or expired code');
      }
      const msg = result.message ?? 'Coupon applied!';
      setCouponSuccess(msg);
      toast.success(msg);
      setCouponCode('');
      setConfirmOpen(false);
      setCouponDetails(null);
      await queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to activate coupon');
    } finally {
      setActivating(false);
    }
  };

  const isPaid = isPro || isPremium;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Subscription</h1>
          <div className="flex-1" />
          <TrialCountdownBadge />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24 lg:max-w-none mx-auto w-full">

        {/* Hero Plan Banner */}
        {isLoading ? (
          <Skeleton className="h-36 w-full rounded-2xl" />
        ) : isPaid ? (
          <div
            className={`relative rounded-2xl overflow-hidden p-5 ${
              isPremium
                ? 'bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-background border border-amber-400/40'
                : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-background border border-blue-400/40'
            }`}
          >
            <div
              className={`absolute inset-0 pointer-events-none ${
                isPremium
                  ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.18),transparent_60%)]'
                  : 'bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.18),transparent_60%)]'
              }`}
            />
            <div className="relative flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                  isPremium
                    ? 'bg-amber-400/20 border border-amber-400/40'
                    : 'bg-blue-400/20 border border-blue-400/40'
                }`}
              >
                <PlanIcon
                  plan={plan}
                  className={`w-7 h-7 ${isPremium ? 'text-amber-400' : 'text-blue-400'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-xl font-bold ${
                      isPremium ? 'text-amber-400' : 'text-blue-400'
                    }`}
                  >
                    {planLabel(plan)}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      isActiveTrial
                        ? isPremium
                          ? 'border-amber-400/60 text-amber-500'
                          : 'border-blue-400/60 text-blue-500'
                        : isPremium
                        ? 'border-amber-400/60 text-amber-500'
                        : 'border-blue-400/60 text-blue-500'
                    }
                  >
                    {isActiveTrial ? 'Trial' : 'Active'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isPremium
                    ? "You're on Premium — here's everything unlocked for you"
                    : "You're on Pro — here's everything unlocked for you"}
                </p>
                {isActiveTrial && trialExpiresAt && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <CalendarClock
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isPremium ? 'text-amber-500' : 'text-blue-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        isPremium
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      Trial ends {formatDate(trialExpiresAt)}
                    </span>
                  </div>
                )}
                {isActiveTrial && (
                  <div className="mt-2">
                    <TrialCountdownBadge />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                <PlanIcon plan={plan} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <p className="text-lg font-bold">{planLabel(plan)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to unlock AI tools, unlimited resumes, and more
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Resumes */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Resumes</span>
                {resumesLoading || planLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : isUnlimitedResumes ? (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Infinity className="w-3.5 h-3.5" />
                    Unlimited
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {resumeCount} / {resumeLimit}
                  </span>
                )}
              </div>
              {isUnlimitedResumes ? (
                <div
                  className={`h-2 rounded-full overflow-hidden ${
                    isPremium
                      ? 'bg-amber-400/20'
                      : isPro
                      ? 'bg-blue-400/20'
                      : 'bg-primary/20'
                  }`}
                >
                  <div
                    className={`h-full w-full rounded-full ${
                      isPremium
                        ? 'bg-gradient-to-r from-amber-400 to-amber-300'
                        : isPro
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                        : 'bg-primary/30'
                    }`}
                  />
                </div>
              ) : (
                <Progress
                  value={Math.min((resumeCount / (resumeLimit ?? 1)) * 100, 100)}
                  className="h-2"
                />
              )}
              {!isUnlimitedResumes && resumeCount >= (resumeLimit ?? 1) && (
                <p className="text-xs text-destructive mt-1.5">Resume limit reached — upgrade to add more</p>
              )}
            </div>

            {/* AI Credits */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">AI Credits (today)</span>
                {creditsLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : isUnlimitedCredits ? (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Infinity className="w-3.5 h-3.5" />
                    Unlimited
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {dailyUsage} / {dailyLimit}
                  </span>
                )}
              </div>
              {isUnlimitedCredits ? (
                <div
                  className={`h-2 rounded-full overflow-hidden ${
                    isPremium
                      ? 'bg-amber-400/20'
                      : isPro
                      ? 'bg-blue-400/20'
                      : 'bg-primary/20'
                  }`}
                >
                  <div
                    className={`h-full w-full rounded-full ${
                      isPremium
                        ? 'bg-gradient-to-r from-amber-400 to-amber-300'
                        : isPro
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                        : 'bg-primary/30'
                    }`}
                  />
                </div>
              ) : (
                <>
                  <Progress
                    value={dailyLimit > 0 ? Math.min((dailyUsage / dailyLimit) * 100, 100) : 0}
                    className="h-2"
                  />
                  {!isUnlimitedCredits && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Resets daily at midnight UTC
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current plan features */}
        <Card
          className={
            isPremium
              ? 'border-amber-400/30 bg-amber-50/20 dark:bg-amber-950/10'
              : isPro
              ? 'border-blue-400/30 bg-blue-50/20 dark:bg-blue-950/10'
              : ''
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PlanIcon plan={plan} />
              <CardTitle
                className={`text-sm font-semibold ${
                  isPremium
                    ? 'text-amber-600 dark:text-amber-400'
                    : isPro
                    ? 'text-blue-600 dark:text-blue-400'
                    : ''
                }`}
              >
                Your {planLabel(plan)} Plan includes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Credit limit row — highlighted at top */}
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                isPremium
                  ? 'bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-800/50'
                  : isPro
                  ? 'bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800/50'
                  : 'bg-muted/60 border border-border'
              }`}
            >
              {isPremium ? (
                <Infinity className="w-5 h-5 shrink-0 text-amber-500" />
              ) : isPro ? (
                <Bot className="w-5 h-5 shrink-0 text-blue-500" />
              ) : (
                <Bot className="w-5 h-5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={`text-sm font-semibold ${
                  isPremium
                    ? 'text-amber-700 dark:text-amber-300'
                    : isPro
                    ? 'text-blue-700 dark:text-blue-300'
                    : ''
                }`}
              >
                {isPremium
                  ? 'Unlimited AI credits/day'
                  : isPro
                  ? `${PLAN_CREDIT_LIMITS.pro} AI credits/day`
                  : `${PLAN_CREDIT_LIMITS.free} AI credits/day`}
              </span>
              {isPremium && (
                <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500 text-white border-0">
                  Unlimited
                </Badge>
              )}
            </div>

            {/* Feature rows */}
            {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                    isPremium
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/40 dark:hover:bg-amber-900/20'
                      : isPro
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/40 dark:hover:bg-blue-900/20'
                      : 'bg-muted/30 hover:bg-muted/50'
                  } transition-colors`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isPremium
                        ? 'bg-amber-100 dark:bg-amber-900/40'
                        : isPro
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isPremium
                          ? 'text-amber-500'
                          : isPro
                          ? 'text-blue-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium">{feature.label}</span>
                  <Check
                    className={`w-4 h-4 ml-auto shrink-0 ${
                      isPremium
                        ? 'text-amber-500'
                        : isPro
                        ? 'text-blue-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upgrade cards */}
        {upgradeTargets.map((target) => (
          <Card
            key={target}
            className={
              target === 'premium'
                ? 'border-amber-400/40 relative overflow-hidden'
                : 'border-blue-400/30 relative overflow-hidden'
            }
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  target === 'premium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}>
                  {target === 'premium' ? 'POWER USERS' : 'POPULAR'}
                </span>
                <PlanIcon
                  plan={target}
                  className={`w-5 h-5 ${target === 'premium' ? 'text-amber-500' : 'text-blue-500'}`}
                />
                <p className="text-sm font-semibold">{planLabel(target)}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{PLAN_PRICES[target]}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <div className="space-y-1.5">
                {PLAN_FEATURES[target as keyof typeof PLAN_FEATURES].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.label} className="flex items-center gap-2 text-sm">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          target === 'premium' ? 'text-amber-500' : 'text-blue-500'
                        }`}
                      />
                      <span>{feature.label}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                className={`w-full mt-1 ${
                  target === 'premium'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                onClick={() => handleUpgrade(target)}
                data-track={`dashboard-upgrade-cta-${target}`}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to {planLabel(target)} — coming soon
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Referral Link */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Gift className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Invite Friends, Earn Rewards</p>
              <p className="text-xs text-muted-foreground">Get free Pro time for each referral</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/referral')}>
              Invite
            </Button>
          </CardContent>
        </Card>

        {/* Early Access — Coupon Redemption */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl bg-primary text-primary-foreground">
            EARLY ACCESS
          </div>
          <CardContent className="p-4 space-y-3 pt-6">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Have a coupon code?</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redeem your early access code to instantly unlock a Pro or Premium plan — no payment needed.
            </p>
            {couponSuccess ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4 shrink-0" />
                {couponSuccess}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="EARLYACCESS"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                  className="font-mono uppercase tracking-widest"
                  disabled={checking || activating}
                />
                <LoadingButton
                  onClick={handleCheckCode}
                  isLoading={checking}
                  loadingText="Checking…"
                  disabled={!couponCode.trim()}
                  className="shrink-0"
                >
                  Check Code
                </LoadingButton>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coupon confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!activating) setConfirmOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Early Access Invitation
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review your coupon details before activating
            </DialogDescription>
          </DialogHeader>

          {couponDetails && (
            <div className="space-y-4">
              {couponDetails.plan_override && (
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    couponDetails.plan_override === 'premium'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      couponDetails.plan_override === 'premium'
                        ? 'bg-amber-100 dark:bg-amber-900/40'
                        : 'bg-blue-100 dark:bg-blue-900/40'
                    }`}
                  >
                    <PlanIcon
                      plan={couponDetails.plan_override}
                      className={`w-5 h-5 ${
                        couponDetails.plan_override === 'premium'
                          ? 'text-amber-500'
                          : 'text-blue-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{planLabel(couponDetails.plan_override)} Plan</p>
                    <p
                      className={`text-xs ${
                        couponDetails.plan_override === 'premium'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      Early Access
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Normal price</span>
                  <span className="line-through text-muted-foreground">
                    {couponDetails.plan_override ? PLAN_PRICES[couponDetails.plan_override] : '—'}/mo
                  </span>
                </div>
                <div className="flex justify-between items-center font-semibold">
                  <span>Your price</span>
                  <span className="text-green-600 dark:text-green-400">Free (Early Access)</span>
                </div>
              </div>

              {couponDetails.plan_days && (
                <div className="space-y-1.5 text-sm border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Trial period</span>
                    <span className="font-medium">{couponDetails.plan_days} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Starts</span>
                    <span className="font-medium">Today ({formatDate(new Date().toISOString())})</span>
                  </div>
                  {trialEndsAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Access until</span>
                      <span className="font-medium">{formatDate(trialEndsAt)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <LoadingButton
                  onClick={handleActivateNow}
                  isLoading={activating}
                  loadingText="Activating…"
                  className={`w-full ${
                    couponDetails.plan_override === 'premium'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Activate Now
                </LoadingButton>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={activating}
                  className="w-full text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
