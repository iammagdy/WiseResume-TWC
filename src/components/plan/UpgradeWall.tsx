import { Crown, Lock, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useRevenueCat, isPurchaseCancelled } from '@/hooks/useRevenueCat';
import { useQueryClient } from '@tanstack/react-query';

interface UpgradeWallProps {
  requiredPlan: 'pro' | 'premium';
  featureName: string;
  description?: string;
  features?: string[];
  compact?: boolean;
}

function planLabel(plan: 'pro' | 'premium') {
  return plan === 'pro' ? 'Pro' : 'Premium';
}

function useUpgradePurchase(requiredPlan: 'pro' | 'premium') {
  const queryClient = useQueryClient();
  const { packages, loadingOfferings, purchasing, purchase } = useRevenueCat();

  const handlePurchase = async () => {
    haptics.medium();
    if (packages.length === 0) {
      toast.error('Packages not loaded. Please try again.');
      return;
    }
    const targetIndex = requiredPlan === 'pro' ? 0 : packages.length - 1;
    const pkg = packages[targetIndex];
    try {
      await purchase(pkg);
      toast.success(`Welcome to ${planLabel(requiredPlan)}!`);
      await queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
    } catch (e) {
      if (!isPurchaseCancelled(e)) {
        toast.error(e instanceof Error ? e.message : 'Purchase failed. Please try again.');
      }
    }
  };

  const targetIndex = requiredPlan === 'pro' ? 0 : packages.length - 1;
  const pkg = packages[targetIndex];
  const price = pkg?.webBillingProduct?.currentPrice?.formattedPrice;
  const label = (() => {
    if (purchasing) return 'Processing…';
    if (loadingOfferings) return 'Loading…';
    return price
      ? `Upgrade to ${planLabel(requiredPlan)} — ${price}/mo`
      : `Upgrade to ${planLabel(requiredPlan)}`;
  })();

  return { handlePurchase, purchasing, loadingOfferings, label };
}

export function UpgradeWall({ requiredPlan, featureName, description, features, compact = false }: UpgradeWallProps) {
  const navigate = useNavigate();
  const { handlePurchase, purchasing, loadingOfferings, label } = useUpgradePurchase(requiredPlan);
  const busy = purchasing || loadingOfferings;

  if (compact) {
    return (
      <div className="flex flex-col items-center text-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{featureName} requires {planLabel(requiredPlan)}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {features && features.length > 0 && (
          <ul className="w-full text-left space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handlePurchase} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
            {label}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/subscription')} className="text-muted-foreground">
            View plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 py-12 px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h2 className="text-lg font-bold text-foreground">
          {featureName} is a {planLabel(requiredPlan)} feature
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description ?? `Upgrade to ${planLabel(requiredPlan)} to unlock ${featureName} and all other advanced tools.`}
        </p>
      </div>
      {features && features.length > 0 && (
        <ul className="w-full max-w-xs space-y-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full gap-2" onClick={handlePurchase} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {label}
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/subscription')}>
          View all plans
        </Button>
      </div>
    </div>
  );
}
