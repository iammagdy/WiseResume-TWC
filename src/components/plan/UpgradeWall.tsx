import { Crown, Lock, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

export function UpgradeWall({ requiredPlan, featureName, description, features, compact = false }: UpgradeWallProps) {
  const navigate = useNavigate();

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
          <Button size="sm" disabled className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Coming Soon
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
        <Button size="lg" className="w-full gap-2" disabled>
          <Clock className="w-4 h-4" />
          Coming Soon
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Online payment is not available yet.
        </p>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/subscription')}>
          View all plans
        </Button>
      </div>
    </div>
  );
}
