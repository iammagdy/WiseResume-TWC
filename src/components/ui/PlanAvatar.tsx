import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { PlanName } from '@/hooks/usePlan';

interface PlanAvatarProps {
  plan: PlanName;
  avatarUrl?: string | null;
  initials: React.ReactNode;
  size?: string;
  imageAlt?: string;
  showLabel?: boolean;
}

function planRingClass(plan: PlanName): string {
  if (plan === 'premium') return 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background';
  if (plan === 'pro') return 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background';
  return 'border-2 border-muted-foreground/20';
}

function planLabelText(plan: PlanName): string {
  if (plan === 'premium') return 'Premium';
  if (plan === 'pro') return 'Pro';
  return 'Free';
}

function planLabelClass(plan: PlanName): string {
  if (plan === 'premium') return 'text-amber-500';
  if (plan === 'pro') return 'text-blue-500';
  return 'text-muted-foreground';
}

export function PlanAvatar({ plan, avatarUrl, initials, size = 'w-9 h-9', imageAlt, showLabel = false }: PlanAvatarProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Avatar className={cn(size, planRingClass(plan))}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={imageAlt || 'Profile'} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showLabel && (
        <span className={cn('text-xs font-semibold', planLabelClass(plan))}>
          {planLabelText(plan)}
        </span>
      )}
    </div>
  );
}
