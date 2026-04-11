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

function planBadgeClass(plan: PlanName): string {
  if (plan === 'premium') return 'bg-amber-400 text-amber-950';
  if (plan === 'pro') return 'bg-blue-500 text-white';
  return 'bg-muted text-muted-foreground';
}

export function PlanAvatar({ plan, avatarUrl, initials, size = 'w-9 h-9', imageAlt, showLabel = false }: PlanAvatarProps) {
  return (
    <div className="relative inline-flex flex-col items-center">
      <Avatar className={cn(size, planRingClass(plan))}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={imageAlt || 'Profile'} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'absolute -bottom-1.5 left-1/2 -translate-x-1/2',
          'px-1.5 py-px rounded-full text-[9px] font-bold leading-tight whitespace-nowrap',
          planBadgeClass(plan)
        )}
      >
        {planLabelText(plan)}
      </span>
    </div>
  );
}
