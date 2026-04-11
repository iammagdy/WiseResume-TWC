import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import type { AdminUser } from './AdminUsersPanel';

type Plan = 'free' | 'pro' | 'premium';

const PLANS: { value: Plan; label: string; description: string }[] = [
  { value: 'free', label: 'Free', description: '1 resume · 5 AI credits/day' },
  { value: 'pro', label: 'Pro', description: 'Unlimited resumes · 100 AI credits/day' },
  { value: 'premium', label: 'Premium', description: 'Everything in Pro + unlimited AI credits' },
];

interface SetPlanModalProps {
  user: AdminUser;
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SetPlanModal({ user, password, open, onOpenChange, onSuccess }: SetPlanModalProps) {
  const [selected, setSelected] = useState<Plan>(user.plan_name);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (selected === user.plan_name) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('admin-set-plan', {
        body: { password, target_user_id: user.user_id, plan: selected },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success(`Plan updated to ${selected} for ${user.email}`, {
        description: "The user's app will reflect this within 30 seconds on next interaction.",
        duration: 5000,
      });
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Plan</DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-1">
          <p className="text-xs text-muted-foreground mb-3 truncate font-mono">{user.email}</p>

          {PLANS.map((plan) => (
            <button
              key={plan.value}
              type="button"
              onClick={() => setSelected(plan.value)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                selected === plan.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/40 hover:bg-muted'
              }`}
            >
              <span
                className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected === plan.value ? 'border-primary' : 'border-muted-foreground/40'
                }`}
              >
                {selected === plan.value && (
                  <span className="w-2 h-2 rounded-full bg-primary block" />
                )}
              </span>
              <div>
                <p className="font-medium text-sm">{plan.label}</p>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving} className="gradient-primary">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
