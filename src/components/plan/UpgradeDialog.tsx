import { useState } from 'react';
import { Crown, Check, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/LoadingButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { usePlan } from '@/hooks/usePlan';

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
  const { refetch } = usePlan();
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleViewPlans = () => {
    haptics.light();
    onClose();
    navigate('/subscription');
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    haptics.light();
    setRedeeming(true);
    try {
      const { data, error } = await appwriteFunctions.invoke('redeem-coupon', {
        body: { code: couponCode.trim().toUpperCase() },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; message?: string; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Invalid or expired code');
      const msg = result.message ?? 'Coupon applied!';
      setCouponSuccess(msg);
      toast.success(msg);
      setCouponCode('');
      refetch?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to redeem coupon');
    } finally {
      setRedeeming(false);
    }
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
          <Button className="w-full gap-2" onClick={handleViewPlans}>
            <Crown className="w-4 h-4" />
            View plans
          </Button>

          {/* Inline coupon */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ticket className="w-3.5 h-3.5" />
              <span>Have an early access code?</span>
            </div>
            {couponSuccess ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                {couponSuccess}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="EARLYACCESS"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                  className="font-mono uppercase tracking-widest text-xs h-9"
                  disabled={redeeming}
                />
                <LoadingButton
                  size="sm"
                  onClick={handleRedeemCoupon}
                  isLoading={redeeming}
                  loadingText="…"
                  disabled={!couponCode.trim()}
                  className="shrink-0 h-9"
                >
                  Apply
                </LoadingButton>
              </div>
            )}
          </div>

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
