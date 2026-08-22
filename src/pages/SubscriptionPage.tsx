import { type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Check, Crown, Share2, Sparkles, Gem, CalendarClock, FileText, Wand2, Target,
  MessageSquare, Mail, LayoutList, BarChart2,
  Package, Infinity as InfinityIcon, Bot, Star, Clock,
} from 'lucide-react';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import { useResumes } from '@/hooks/useResumes';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, PlanName } from '@/hooks/usePlan';
import { useLocale } from '@/i18n/LocaleProvider';
import { useMe } from '@/hooks/useMe';
import { Skeleton } from '@/components/ui/skeleton';
import { TrialCountdownBadge } from '@/components/ui/TrialCountdownBadge';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';
import { billingState } from '@/lib/billing';

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();
  const { data: credits, isLoading: creditsLoading } = useAICredits();
  const { plan, isPro, isPremium, isLoading: planLoading } = usePlan();
  const { t } = useLocale();
  const planLabel = (value: string) => value === 'premium'
    ? t('app.premium', 'Ultimate')
    : value === 'pro'
      ? t('app.pro', 'Pro')
      : t('app.free', 'Free');
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

  const isLoading = planLoading || resumesLoading || creditsLoading;
  const upgradeTargets: string[] = isPremium ? [] : isPro ? ['premium'] : ['pro', 'premium'];
  const isPaid = isPro || isPremium;

  const paymentsComingSoon = !billingState.paymentsEnabled;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">{t('app.aiStudio.subscriptionPage.title', 'Subscription')}</h1>
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
                  <p className={`text-xl font-bold ${isPremium ? 'text-amber-400' : 'text-blue-400'}`}>
                    {planLabel(plan)}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      isPremium
                        ? 'border-amber-400/60 text-amber-500'
                        : 'border-blue-400/60 text-blue-500'
                    }
                  >
                    {isActiveTrial ? t('app.aiStudio.subscriptionPage.trial', 'Trial') : t('app.aiStudio.subscriptionPage.active', 'Active')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isPremium
                    ? t('app.aiStudio.subscriptionPage.heroUltimate', "You're on Ultimate — here's everything unlocked for you")
                    : t('app.aiStudio.subscriptionPage.heroPro', "You're on Pro — here's everything unlocked for you")}
                </p>
                {isActiveTrial && trialExpiresAt && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <CalendarClock
                      className={`w-3.5 h-3.5 shrink-0 ${isPremium ? 'text-amber-500' : 'text-blue-500'}`}
                    />
                    <span className={`text-xs font-medium ${isPremium ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {t('app.aiStudio.subscriptionPage.trialEnds', 'Trial ends {{date}}', { date: formatDate(trialExpiresAt) })}
                    </span>
                  </div>
                )}
                {isActiveTrial && (
                  <div className="mt-2">
                    <TrialCountdownBadge />
                  </div>
                )}
                <Badge variant="outline" className="mt-3 inline-flex w-fit max-w-full h-auto items-start justify-center gap-1.5 whitespace-normal py-1 text-center text-xs leading-tight">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="min-w-0 break-words">{t('app.aiStudio.subscriptionPage.paymentsComingSoon', 'Online payments coming soon')}</span>
                </Badge>
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
                <p className="text-sm font-medium text-muted-foreground">{t('app.aiStudio.subscriptionPage.currentPlan', 'Current Plan')}</p>
                <p className="text-lg font-bold">{planLabel(plan)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('app.aiStudio.subscriptionPage.upgradeDescription', 'Upgrade to unlock AI tools, unlimited resumes, and more')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('app.aiStudio.subscriptionPage.usageTitle', 'Usage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Resumes */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{t('app.aiStudio.subscriptionPage.resumes', 'Resumes')}</span>
                {resumesLoading || planLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : isUnlimitedResumes ? (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <InfinityIcon className="w-3.5 h-3.5" />
                    {t('app.aiStudio.subscriptionPage.unlimited', 'Unlimited')}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {resumeCount} / {resumeLimit}
                  </span>
                )}
              </div>
              {isUnlimitedResumes ? (
                <div className={`h-2 rounded-full overflow-hidden ${isPremium ? 'bg-amber-400/20' : isPro ? 'bg-blue-400/20' : 'bg-primary/20'}`}>
                  <div className={`h-full w-full rounded-full ${isPremium ? 'bg-gradient-to-r from-amber-400 to-amber-300' : isPro ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-primary/30'}`} />
                </div>
              ) : (
                <Progress value={Math.min((resumeCount / (resumeLimit ?? 1)) * 100, 100)} className="h-2" />
              )}
              {!isUnlimitedResumes && resumeCount >= (resumeLimit ?? 1) && (
                <p className="text-xs text-destructive mt-1.5">{t('app.aiStudio.subscriptionPage.resumeLimitReached', 'Resume limit reached — upgrade to add more')}</p>
              )}
            </div>

            {/* AI Credits */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{t('app.aiStudio.subscriptionPage.aiCreditsToday', 'AI Credits (today)')}</span>
                {creditsLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : isUnlimitedCredits ? (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <InfinityIcon className="w-3.5 h-3.5" />
                    {t('app.aiStudio.subscriptionPage.unlimited', 'Unlimited')}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {dailyUsage} / {dailyLimit}
                  </span>
                )}
              </div>
              {isUnlimitedCredits ? (
                <div className={`h-2 rounded-full overflow-hidden ${isPremium ? 'bg-amber-400/20' : isPro ? 'bg-blue-400/20' : 'bg-primary/20'}`}>
                  <div className={`h-full w-full rounded-full ${isPremium ? 'bg-gradient-to-r from-amber-400 to-amber-300' : isPro ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-primary/30'}`} />
                </div>
              ) : (
                <>
                  <Progress value={dailyLimit > 0 ? Math.min((dailyUsage / dailyLimit) * 100, 100) : 0} className="h-2" />
                  {!isUnlimitedCredits && (
                    <p className="text-xs text-muted-foreground mt-1.5">{t('app.aiStudio.subscriptionPage.resetsDaily', 'Resets daily at midnight UTC')}</p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current plan features */}
        <Card className={isPremium ? 'border-amber-400/30 bg-amber-50/20 dark:bg-amber-950/10' : isPro ? 'border-blue-400/30 bg-blue-50/20 dark:bg-blue-950/10' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PlanIcon plan={plan} />
              <CardTitle className={`text-sm font-semibold ${isPremium ? 'text-amber-600 dark:text-amber-400' : isPro ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {t('app.aiStudio.subscriptionPage.planIncludes', 'Your {{plan}} Plan includes', { plan: planLabel(plan) })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Credit limit row */}
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isPremium ? 'bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-800/50' : isPro ? 'bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800/50' : 'bg-muted/60 border border-border'}`}>
              {isPremium ? (
                <InfinityIcon className="w-5 h-5 shrink-0 text-amber-500" />
              ) : isPro ? (
                <Bot className="w-5 h-5 shrink-0 text-blue-500" />
              ) : (
                <Bot className="w-5 h-5 shrink-0 text-muted-foreground" />
              )}
              <span className={`text-sm font-semibold ${isPremium ? 'text-amber-700 dark:text-amber-300' : isPro ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                {isPremium
                  ? t('app.aiStudio.subscriptionPage.unlimitedAiCreditsPerDay', 'Unlimited AI credits/day')
                  : t('app.aiStudio.subscriptionPage.aiCreditsPerDay', '{{count}} AI credits/day', { count: isPro ? PLAN_CREDIT_LIMITS.pro : PLAN_CREDIT_LIMITS.free })}
              </span>
              {isPremium && (
                                  <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500 text-white border-0">{t('app.aiStudio.subscriptionPage.unlimited', 'Unlimited')}</Badge>

              )}
            </div>

            {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map((feature, index) => {
              const Icon = feature.icon;
              const label = t(`app.aiStudio.planFeatures.${plan}.${index}`, feature.label);
              return (
                <div key={`${plan}-${index}-${label}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isPremium ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/40 dark:hover:bg-amber-900/20' : isPro ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/40 dark:hover:bg-blue-900/20' : 'bg-muted/30 hover:bg-muted/50'} transition-colors`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPremium ? 'bg-amber-100 dark:bg-amber-900/40' : isPro ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${isPremium ? 'text-amber-500' : isPro ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                  <Check className={`w-4 h-4 ml-auto shrink-0 ${isPremium ? 'text-amber-500' : isPro ? 'text-blue-500' : 'text-muted-foreground'}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upgrade cards */}
        {upgradeTargets.map((target) => {
          const displayPrice = PLAN_PRICES[target];

          return (
            <Card key={target} className={target === 'premium' ? 'border-amber-400/40 relative overflow-hidden' : 'border-blue-400/30 relative overflow-hidden'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${target === 'premium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                    {target === 'premium'
                      ? t('app.aiStudio.subscriptionPage.powerUsers', 'POWER USERS')
                      : t('app.aiStudio.subscriptionPage.popular', 'POPULAR')}
                  </span>
                  <PlanIcon plan={target} className={`w-5 h-5 ${target === 'premium' ? 'text-amber-500' : 'text-blue-500'}`} />
                  <p className="text-sm font-semibold">{planLabel(target)}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">{t('app.aiStudio.subscriptionPage.perMonth', '/month')}</span>
                </div>
                <div className="space-y-1.5">
                  {PLAN_FEATURES[target as keyof typeof PLAN_FEATURES].map((feature, index) => {
                    const Icon = feature.icon;
                    const label = t(`app.aiStudio.planFeatures.${target}.${index}`, feature.label);
                    return (
                      <div key={`${target}-${index}-${label}`} className="flex items-center gap-2 text-sm">
                        <Icon className={`w-4 h-4 shrink-0 ${target === 'premium' ? 'text-amber-500' : 'text-blue-500'}`} />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <Button
                  className={`w-full mt-1 gap-2 ${target === 'premium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}
                  disabled={paymentsComingSoon}
                  data-track={`subscription-upgrade-cta-${target}`}
                >
                  <Clock className="w-4 h-4" />
                  {t('app.aiStudio.subscriptionPage.comingSoon', 'Coming Soon')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t('app.aiStudio.subscriptionPage.onlinePaymentUnavailable', 'Online payment is not available yet.')}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {/* Share */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Share2 className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t('app.aiStudio.subscriptionPage.shareTitle', 'Share WiseResume')}</p>
              <p className="text-xs text-muted-foreground">{t('app.aiStudio.subscriptionPage.shareDescription', 'Send the app link to a friend')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/referral')}>
              {t('app.aiStudio.subscriptionPage.share', 'Share')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
