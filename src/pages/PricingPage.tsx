import { useNavigate, Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import triggerHaptic from '@/lib/haptics';
import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { PLAN_FEATURE_LABELS } from '@/lib/planConfig';

const pricingFeatures = PLAN_FEATURE_LABELS;

const faqItems = [
  { q: 'Can I try WiseResume for free?', a: 'Yes! The Free plan is free forever.' },
  { q: 'How do I upgrade my plan?', a: 'You can upgrade from your Subscription page inside the app.' },
  { q: 'Can I cancel at any time?', a: 'Absolutely. You can cancel your subscription at any time from settings.' }
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { plan } = usePlan();

  const handlePerPlanCTA = (targetPlan: string) => {
    triggerHaptic.medium();
    if (isAuthenticated) navigate('/subscription');
    else navigate(`/auth?mode=signup&plan=${targetPlan}`);
  };

  const ctaLabel = (targetPlan: string) => {
    if (!isAuthenticated) return 'Get Started';
    if (plan === targetPlan) return 'Current Plan';
    return 'Upgrade';
  };

  const isCurrentPlan = (p: string) => isAuthenticated && plan === p;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto">
          <Link to="/" className="font-bold text-primary">WiseResume</Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <PricingButton onClick={() => navigate('/dashboard')}>Dashboard</PricingButton>
            ) : (
              <PricingButton onClick={() => navigate('/auth?mode=signup')}>Get Started Free</PricingButton>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border p-7 bg-card">
            <h2 className="text-base font-bold mb-4">Free</h2>
            <div className="text-4xl font-extrabold mb-6">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.free.map(f => <li key={f} className="text-sm flex items-center gap-2"><Check size={14}/> {f}</li>)}
            </ul>
            <PricingButton onClick={() => handlePerPlanCTA('free')} variant="outline" disabled={isCurrentPlan('free')}>{ctaLabel('free')}</PricingButton>
          </div>

          {/* Pro — recommended */}
          <div className="flex flex-col rounded-2xl p-7 bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-lg scale-[1.02] sm:scale-100 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-background text-primary px-3 py-1 rounded-full border border-primary/20">
              Recommended
            </span>
            <h2 className="text-base font-bold mb-4">Pro</h2>
            <div className="text-4xl font-extrabold mb-6">$9<span className="text-sm font-normal opacity-70">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.pro.map(f => <li key={f} className="text-sm flex items-center gap-2"><Check size={14}/> {f}</li>)}
            </ul>
            <button onClick={() => handlePerPlanCTA('pro')} className="w-full h-11 bg-white text-primary rounded-xl font-bold">{ctaLabel('pro')}</button>
          </div>

          {/* Premium */}
          <div className="flex flex-col rounded-2xl border p-7 bg-card border-amber-500/30">
            <h2 className="text-base font-bold mb-4">Premium</h2>
            <div className="text-4xl font-extrabold mb-6">$19<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              {pricingFeatures.premium.map(f => <li key={f} className="text-sm flex items-center gap-2"><Check size={14} className="text-amber-500"/> {f}</li>)}
            </ul>
            <PricingButton onClick={() => handlePerPlanCTA('premium')} variant="outline">{ctaLabel('premium')}</PricingButton>
          </div>
        </div>

        <section className="max-w-2xl mx-auto" aria-labelledby="pricing-faq-heading">
          <h2 id="pricing-faq-heading" className="text-2xl font-bold text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="rounded-2xl border border-border bg-card px-5">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>
      </main>
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
  const base = "px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50";
  const variants: Record<'default' | 'outline', string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border hover:bg-muted"
  };
  return <button onClick={onClick} className={`${base} ${variants[variant]} ${className ?? ''}`} disabled={disabled}>{children}</button>;
}
