import { Crown, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { haptics } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  requiredPlan: 'pro' | 'premium';
  featureName: string;
  description?: string;
  features?: string[];
}

function planLabel(plan: 'pro' | 'premium') {
  return plan === 'pro' ? 'Pro' : 'Premium';
}

export function UpgradeDialog({
  open,
  onClose,
  requiredPlan,
  featureName,
  description,
  features,
}: UpgradeDialogProps) {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    haptics.light();
    onClose();
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="items-center text-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-base font-bold leading-snug">
            {featureName} is a {planLabel(requiredPlan)} feature
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {description ??
              `Upgrade to ${planLabel(requiredPlan)} to unlock ${featureName} and all other advanced tools.`}
          </DialogDescription>
        </DialogHeader>

        {features && features.length > 0 && (
          <ul className="space-y-1.5 px-1">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            className="w-full gap-2"
            disabled
          >
            <Clock className="w-4 h-4" />
            Coming Soon
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Online payment is not available yet.
          </p>

          <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={handleViewPlans}>
            View all plans
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
