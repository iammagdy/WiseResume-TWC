import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Check, Crown, Gift, Sparkles, Gem, Tag, Loader2 } from 'lucide-react';
import { useResumes } from '@/hooks/useResumes';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, PlanName } from '@/hooks/usePlan';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { Skeleton } from '@/components/ui/skeleton';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

const PLAN_FEATURES = {
  free: [
    '1 resume',
    'Basic AI suggestions',
    'ATS score check',
    'PDF export',
    'Portfolio site',
  ],
  pro: [
    'Unlimited resumes',
    'Advanced AI tools',
    'Smart tailoring',
    'Interview coaching',
    'Cover letter generator',
    'Application tracker',
    'Priority support',
  ],
  premium: [
    'Everything in Pro',
    'Custom branding',
    'Analytics dashboard',
    'White-label exports',
    'Early access features',
    'Dedicated support',
  ],
};

const RESUME_LIMIT: Record<PlanName, number | null> = {
  free: 1,
  pro: null,
  premium: null,
};

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function PlanIcon({ plan }: { plan: string }) {
  if (plan === 'premium') return <Gem className="w-5 h-5 text-amber-500" />;
  if (plan === 'pro') return <Crown className="w-5 h-5 text-primary" />;
  return <Sparkles className="w-5 h-5 text-primary" />;
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();
  const { data: credits, isLoading: creditsLoading } = useAICredits();
  const { plan, isPro, isPremium, isLoading: planLoading, refetch: refetchPlan } = usePlan();

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
  const upgradeTarget = isPremium ? null : isPro ? 'premium' : 'pro';

  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    haptics.light();
    setRedeeming(true);
    setCouponSuccess(null);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('redeem-coupon', {
        body: { code: couponCode.trim().toUpperCase() },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; message?: string; new_plan?: string; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Invalid or expired code');
      const msg = result.message ?? 'Coupon applied!';
      setCouponSuccess(msg);
      toast.success(msg);
      setCouponCode('');
      refetchPlan?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to redeem coupon');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Subscription</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24 lg:max-w-none mx-auto w-full">
        {/* Current Plan */}
        <Card className={isPremium ? 'border-amber-400/30 bg-amber-50/30 dark:bg-amber-950/20' : 'border-primary/20 bg-primary/5'}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'}`}>
              <PlanIcon plan={plan} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
              {isLoading ? (
                <Skeleton className="h-6 w-24 mt-0.5" />
              ) : (
                <p className="text-lg font-bold">{planLabel(plan)}</p>
              )}
            </div>
            <Badge variant="secondary">Active</Badge>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumes */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>Resumes</span>
                {resumesLoading || planLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {resumeCount} / {isUnlimitedResumes ? 'unlimited' : resumeLimit}
                  </span>
                )}
              </div>
              {isUnlimitedResumes ? (
                <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
                  <div className="h-full w-full bg-primary/30 rounded-full" />
                </div>
              ) : (
                <Progress
                  value={Math.min((resumeCount / (resumeLimit ?? 1)) * 100, 100)}
                  className="h-2"
                />
              )}
              {!isUnlimitedResumes && resumeCount >= (resumeLimit ?? 1) && (
                <p className="text-xs text-destructive mt-1">Resume limit reached — upgrade to add more</p>
              )}
            </div>

            {/* AI Credits */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>AI Credits (today)</span>
                {creditsLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {isUnlimitedCredits ? `${dailyUsage} / unlimited` : `${dailyUsage} / ${dailyLimit}`}
                  </span>
                )}
              </div>
              {isUnlimitedCredits ? (
                <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
                  <div className="h-full w-full bg-primary/30 rounded-full" />
                </div>
              ) : (
                <Progress
                  value={dailyLimit > 0 ? Math.min((dailyUsage / dailyLimit) * 100, 100) : 0}
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current plan features */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Your {planLabel(plan)} Plan includes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm">
                <Check className={`w-4 h-4 shrink-0 ${isPremium ? 'text-amber-500' : 'text-primary'}`} />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upgrade card — only if not already on the top plan */}
        {upgradeTarget && (
          <Card className={upgradeTarget === 'premium' ? 'border-amber-400/40 relative overflow-hidden' : 'border-primary/30 relative overflow-hidden'}>
            <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl ${upgradeTarget === 'premium' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}`}>
              {upgradeTarget === 'premium' ? 'POWER USERS' : 'POPULAR'}
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold">{upgradeTarget === 'premium' ? '$19' : '$9'}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm font-semibold">{planLabel(upgradeTarget)}</p>
              <div className="space-y-1.5">
                {PLAN_FEATURES[upgradeTarget as keyof typeof PLAN_FEATURES].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className={`w-4 h-4 shrink-0 ${upgradeTarget === 'premium' ? 'text-amber-500' : 'text-primary'}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button
                className={`w-full mt-1 ${upgradeTarget === 'premium' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gradient-to-r from-primary to-primary/80'}`}
                onClick={() => handleUpgrade(upgradeTarget)}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to {planLabel(upgradeTarget)} — coming soon
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Coupon Redemption */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Redeem a Coupon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Got a promo code? Enter it below to unlock a free plan upgrade or discount.
            </p>
            {couponSuccess ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4 shrink-0" />
                {couponSuccess}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="COUPONCODE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                  className="font-mono uppercase tracking-widest"
                  disabled={redeeming}
                />
                <Button onClick={handleRedeemCoupon} disabled={redeeming || !couponCode.trim()} className="shrink-0">
                  {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
