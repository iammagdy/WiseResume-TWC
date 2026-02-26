import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Crown, Gift, Sparkles } from 'lucide-react';
import { useResumes } from '@/hooks/useResumes';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    current: true,
    features: [
      { label: '3 resumes', included: true },
      { label: 'Basic templates', included: true },
      { label: 'PDF export', included: true },
      { label: 'ATS scoring', included: true },
      { label: 'AI tailor (5/day)', included: true },
      { label: 'Cover letters', included: false },
      { label: 'Priority support', included: false },
      { label: 'Custom branding', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    popular: true,
    features: [
      { label: 'Unlimited resumes', included: true },
      { label: 'All templates', included: true },
      { label: 'PDF export', included: true },
      { label: 'ATS scoring', included: true },
      { label: 'AI tailor (unlimited)', included: true },
      { label: 'Cover letters', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom branding', included: false },
    ],
  },
  {
    name: 'Premium',
    price: '$19.99',
    period: '/month',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Team collaboration', included: true },
      { label: 'API access', included: true },
      { label: 'Dedicated support', included: true },
      { label: 'Analytics dashboard', included: true },
      { label: 'White-label exports', included: true },
      { label: 'Early access features', included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { data: resumes = [] } = useResumes();

  const handleUpgrade = (plan: string) => {
    haptics.light();
    toast(`${plan} upgrade coming soon!`, { icon: '🚀' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 glass-header backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Subscription</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Current Plan */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-lg font-bold">Free</p>
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
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Resumes</span>
                <span className="text-muted-foreground">{resumes.length} / 3</span>
              </div>
              <Progress value={Math.min((resumes.length / 3) * 100, 100)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>AI Credits</span>
                <span className="text-muted-foreground">3 / 5 today</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plans</h2>
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-primary/30 relative overflow-hidden' : ''}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm font-semibold">{plan.name}</p>
                <div className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={f.included ? '' : 'text-muted-foreground/60'}>{f.label}</span>
                    </div>
                  ))}
                </div>
                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>

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
