import { useNavigate, Link } from 'react-router-dom';
import { Check, ChevronDown, Sparkles, Shield, Zap, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { useLocale } from '@/i18n/LocaleProvider';
import triggerHaptic from '@/lib/haptics';
import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { PLAN_FEATURE_LABELS } from '@/lib/planConfig';
import { Footer } from '@/components/landing/Footer';

const pricingFeatures = PLAN_FEATURE_LABELS;

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { plan } = usePlan();
  const { t } = useLocale();
  const [showComparison, setShowComparison] = useState(false);

  const featureLabels = (planKey: keyof typeof pricingFeatures) =>
    pricingFeatures[planKey].map((feature, index) =>
      t(`app.aiStudio.planFeatures.${planKey}.${index}`, feature),
    );
  const planLabel = (planKey: 'free' | 'pro' | 'premium') => t(`app.${planKey}`, planKey);

  const faqItems = [
    {
      q: t('app.aiStudio.pricingPage.faq1Question', 'Can I try WiseResume for free?'),
      a: t('app.aiStudio.pricingPage.faq1Answer', 'Yes! The Free plan is free forever.'),
    },
    {
      q: t('app.aiStudio.pricingPage.faq2Question', 'How do I upgrade my plan?'),
      a: t('app.aiStudio.pricingPage.faq2Answer', 'You can upgrade from your Subscription page inside the app.'),
    },
    {
      q: t('app.aiStudio.pricingPage.faq3Question', 'Can I cancel at any time?'),
      a: t('app.aiStudio.pricingPage.faq3Answer', 'Yes. You can cancel your subscription at any time directly from your Subscription settings. Your access will remain active until the end of your billing period with no further charges.'),
    },
    {
      q: t('app.aiStudio.pricingPage.faq4Question', 'What payment methods do you support?'),
      a: t('app.aiStudio.pricingPage.faq4Answer', 'We accept all major credit and debit cards through our secure payment providers.'),
    },
  ];

  const handlePerPlanCTA = (targetPlan: string) => {
    triggerHaptic.medium();
    if (isAuthenticated) navigate('/subscription');
    else navigate(`/auth?mode=signup&plan=${targetPlan}`);
  };

  const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  const planRank = (p: string) => PLAN_RANK[p] ?? 0;

  const ctaLabel = (targetPlan: string) => {
    if (!isAuthenticated) return t('app.aiStudio.pricingPage.getStarted', 'Get Started');
    if (plan === targetPlan) return t('app.aiStudio.pricingPage.currentPlan', 'Current Plan');
    return planRank(targetPlan) < planRank(plan)
      ? t('app.aiStudio.pricingPage.included', 'Included')
      : t('app.aiStudio.pricingPage.upgrade', 'Upgrade');
  };

  const isCtaDisabled = (targetPlan: string) =>
    isAuthenticated && planRank(targetPlan) <= planRank(plan);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
            <span>WiseResume</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <PricingButton onClick={() => navigate('/dashboard')} variant="outline" className="text-xs sm:text-sm">
                {t('app.aiStudio.pricingPage.dashboard', 'Dashboard')}
              </PricingButton>
            ) : (
              <PricingButton onClick={() => navigate('/auth?mode=signup')} className="text-xs sm:text-sm shadow-sm">
                {t('app.aiStudio.pricingPage.getStartedFree', 'Get Started Free')}
              </PricingButton>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        {/* Concise Persuasive Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('app.aiStudio.pricingPage.badge', 'Transparent & Predictable')}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            {t('app.aiStudio.pricingPage.title', 'Simple, transparent pricing')}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t('app.aiStudio.pricingPage.subtitle', "Start free. Upgrade when you're ready.")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" /> {t('app.aiStudio.pricingPage.trustMonthly', 'Monthly subscription')}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" /> {t('app.aiStudio.pricingPage.trustCancel', 'Cancel renewal anytime')}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> {t('app.aiStudio.pricingPage.trustActivation', 'Automated account activation')}
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid: Free / Pro / Ultimate (Ultimate Visibly Recommended) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-16">

          {/* 1. Free Tier */}
          <div className="flex flex-col rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-1">{planLabel('free')}</h2>
              <p className="text-xs text-muted-foreground">Best for getting started and exploring.</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">$0</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {t('app.aiStudio.pricingPage.perMonth', '/mo')}
                </span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-5 flex-1 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Included</p>
              <ul className="space-y-3">
                {featureLabels('free').map((f) => (
                  <li key={f} className="text-sm flex items-start gap-2.5 text-foreground/90">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <PricingButton
              onClick={() => handlePerPlanCTA('free')}
              variant="outline"
              disabled={isCtaDisabled('free')}
              className="w-full h-11 rounded-xl text-sm"
            >
              {ctaLabel('free')}
            </PricingButton>
          </div>

          {/* 2. Pro Tier (Lower-Cost Alternative) */}
          <div className="flex flex-col rounded-3xl border border-border/90 bg-card p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow relative">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground">{planLabel('pro')}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Career Starter
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Full AI toolset for active job search.</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">$5</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {t('app.aiStudio.pricingPage.perMonth', '/mo')}
                </span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-5 flex-1 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Everything in Free, plus</p>
              <ul className="space-y-3">
                {featureLabels('pro').map((f) => (
                  <li key={f} className="text-sm flex items-start gap-2.5 text-foreground/90">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <PricingButton
              onClick={() => handlePerPlanCTA('pro')}
              variant="outline"
              disabled={isCtaDisabled('pro')}
              className="w-full h-11 rounded-xl text-sm border-primary/40 hover:bg-primary/5 text-foreground font-semibold"
            >
              {ctaLabel('pro')}
            </PricingButton>
          </div>

          {/* 3. Ultimate Tier — VISIBLY RECOMMENDED */}
          <div className="flex flex-col rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/[0.04] via-card to-card p-6 sm:p-8 shadow-xl ring-2 ring-primary/20 dark:ring-primary/40 relative scale-[1.01] sm:scale-[1.03]">
            {/* Prominent Recommended Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-4 py-1 rounded-full shadow-md">
              <Star className="w-3 h-3 fill-current" />
              <span>{t('app.aiStudio.pricingPage.recommended', 'Recommended')}</span>
            </div>

            <div className="mb-6 pt-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  {planLabel('premium')}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Best Value
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Highest AI limits, analytics &amp; unbranded exports.</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">$10</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {t('app.aiStudio.pricingPage.perMonth', '/mo')}
                </span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-5 flex-1 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary font-bold mb-4">Everything in Pro, plus</p>
              <ul className="space-y-3">
                {featureLabels('premium').map((f) => (
                  <li key={f} className="text-sm flex items-start gap-2.5 text-foreground/90 font-medium">
                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePerPlanCTA('premium')}
              disabled={isCtaDisabled('premium')}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-sm shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {ctaLabel('premium')}
            </button>
          </div>

        </div>

        {/* Expandable Feature Comparison Table */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowComparison((v) => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card hover:bg-muted/50 text-sm font-medium text-foreground transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>{showComparison ? 'Hide detailed comparison' : 'Compare all plan features'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showComparison ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showComparison && (
            <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-4 px-6">Feature</th>
                      <th className="py-4 px-4 text-center">Free ($0)</th>
                      <th className="py-4 px-4 text-center">Pro ($5)</th>
                      <th className="py-4 px-4 text-center text-primary font-bold">Ultimate ($10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Daily AI Actions Allowance</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">5 / day</td>
                      <td className="py-3.5 px-4 text-center font-semibold">50 / day</td>
                      <td className="py-3.5 px-4 text-center font-bold text-primary">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Active Resumes Allowed</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">1 Resume</td>
                      <td className="py-3.5 px-4 text-center font-semibold">Unlimited</td>
                      <td className="py-3.5 px-4 text-center font-bold text-primary">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Smart Tailoring &amp; Tailoring Hub</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">AI Studio Tools (LinkedIn Optimizer, Enhance)</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Targeted Cover Letter Generation</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Interview Coaching Prep</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Application Tracker &amp; Saved Remote Jobs</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Remove WiseResume Export Branding</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-medium">Portfolio Analytics &amp; CSV Export</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">—</td>
                      <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <section className="max-w-2xl mx-auto" aria-labelledby="pricing-faq-heading">
          <div className="text-center mb-8">
            <h2 id="pricing-faq-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('app.aiStudio.pricingPage.faqTitle', 'Frequently asked questions')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Have questions? We are here to help.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 sm:px-6 shadow-sm">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PricingButton({
  children,
  onClick,
  variant = 'default',
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  variant?: 'default' | 'outline';
  className?: string;
  disabled?: boolean;
}) {
  const base = "px-4 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const variants: Record<'default' | 'outline', string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    outline: "border border-border/80 hover:bg-muted/60 text-foreground",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className ?? ''}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
