import { useNavigate, Link } from 'react-router-dom';
import { Check, Crown, Gem, Sparkles, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import triggerHaptic from '@/lib/haptics';
import { useState } from 'react';
import { PLAN_FEATURE_LABELS } from '@/lib/planConfig';

const pricingFeatures = PLAN_FEATURE_LABELS;

const faqItems = [
  {
    q: 'Can I try WiseResume for free?',
    a: 'Yes! The Free plan is free forever. You get 1 resume, basic AI suggestions, ATS scoring, PDF export, and a portfolio site — no credit card required.',
  },
  {
    q: 'How do I upgrade my plan?',
    a: 'You can upgrade from your Subscription page inside the app. We support early-access coupon codes — reach out if you have one.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Absolutely. You can cancel your subscription at any time from your account settings. Your access continues until the end of the billing period.',
  },
  {
    q: 'What counts as an "AI credit"?',
    a: 'Each AI action (resume enhancement, tailoring, cover letter generation, etc.) uses one credit. Free users get 5/day, Pro users get 30/day, and Premium users get unlimited credits.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. We never share your personal information or resume content with third parties.',
  },
  {
    q: 'Do you offer student or non-profit discounts?',
    a: 'We occasionally run discount campaigns. Keep an eye on our What\'s New page or contact us for more information.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { plan } = usePlan();
  const { register: kindeRegister } = useKindeAuth();

  const handlePerPlanCTA = (targetPlan: string) => {
    triggerHaptic.medium();
    if (isAuthenticated) {
      navigate('/subscription');
    } else {
      navigate(`/auth?mode=signup&plan=${targetPlan}`);
    }
  };

  const handleBottomCTA = () => {
    triggerHaptic.medium();
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      kindeRegister();
    }
  };

  const ctaLabel = (targetPlan: string) => {
    if (!isAuthenticated) return 'Get Started';
    if (plan === targetPlan) return 'Current Plan';
    if (
      (targetPlan === 'free') ||
      (targetPlan === 'pro' && plan === 'premium')
    ) return 'Downgrade';
    return 'Upgrade';
  };

  const isCurrentPlan = (p: string) => isAuthenticated && plan === p;

  return (
    <div className="min-h-screen bg-background text-foreground aurora-page-root">
      {/* Simple nav header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <Link to="/" className="text-base font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
            WiseResume
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/whats-new"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              What's New
            </Link>
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => kindeRegister()}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Start free. Upgrade when you're ready. No hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
          {/* Free */}
          <div
            className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
              isCurrentPlan('free')
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-muted-foreground/30'
            } bg-card`}
          >
            {isCurrentPlan('free') && (
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                Current Plan
              </span>
            )}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-base font-bold">Free</h2>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Perfect to get started</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.free.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 shrink-0 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePerPlanCTA('free')}
              disabled={isCurrentPlan('free')}
              className="w-full h-11 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-default"
            >
              {ctaLabel('free')}
            </button>
          </div>

          {/* Pro */}
          <div
            className={`relative flex flex-col rounded-2xl p-7 transition-all ${
              isCurrentPlan('pro')
                ? 'ring-2 ring-primary/60'
                : ''
            } bg-primary text-primary-foreground`}
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {isCurrentPlan('pro') ? (
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold bg-white text-primary">
                Current Plan
              </span>
            ) : (
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold bg-white text-primary">
                Most Popular
              </span>
            )}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-primary-foreground/80" />
                <h2 className="text-base font-bold">Pro</h2>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$9</span>
                <span className="text-primary-foreground/60 text-sm">/mo</span>
              </div>
              <p className="text-sm text-primary-foreground/65 mt-1">For serious job seekers</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.pro.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-primary-foreground/90">
                  <Check className="w-4 h-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePerPlanCTA('pro')}
              disabled={isCurrentPlan('pro')}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-white text-primary hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-default"
            >
              {ctaLabel('pro')}
            </button>
          </div>

          {/* Premium */}
          <div
            className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
              isCurrentPlan('premium')
                ? 'border-amber-400 ring-2 ring-amber-400/20'
                : 'border-amber-400/30 hover:border-amber-400/50'
            } bg-card`}
          >
            {isCurrentPlan('premium') ? (
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                Current Plan
              </span>
            ) : (
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                Power Users
              </span>
            )}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold">Premium</h2>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$19</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">For career professionals</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.premium.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 shrink-0 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePerPlanCTA('premium')}
              disabled={isCurrentPlan('premium')}
              className="w-full h-11 rounded-xl text-sm font-semibold border border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors disabled:opacity-60 disabled:cursor-default"
            >
              {ctaLabel('premium')}
            </button>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap justify-center gap-6 mb-20 text-sm text-muted-foreground">
          {['Free to start', 'No credit card required', 'Cancel anytime', 'AI-powered'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              {item}
            </span>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="rounded-2xl border border-border bg-card px-6">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold mb-3">Ready to land your next role?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of job seekers already using WiseResume.</p>
          <button
            onClick={handleBottomCTA}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/whats-new" className="hover:text-foreground transition-colors">What's New</Link>
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
