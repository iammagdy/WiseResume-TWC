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
  if (plan === 'premium') return 'bg-amber-900 text-amber-100 border border-amber-700';
  if (plan === 'pro') return 'bg-blue-900 text-blue-100 border border-blue-700';
  return 'bg-background text-muted-foreground border border-muted-foreground/30';
}

const SIZE_BADGE_CLASS: Record<string, string> = {
  'w-8 h-8':   'mt-0.5 px-1 py-px text-[7px]',
  'w-9 h-9':   'mt-0.5 px-1.5 py-px text-[8px]',
  'w-10 h-10': 'mt-1 px-1.5 py-px text-[8px]',
  'h-14 w-14': 'mt-1 px-2 py-0.5 text-[10px]',
  'h-24 w-24': 'mt-1.5 px-2.5 py-0.5 text-xs',
};

const DEFAULT_BADGE_CLASS = 'mt-1 px-1.5 py-px text-[9px]';

export function PlanAvatar({ plan, avatarUrl, initials, size = 'w-9 h-9', imageAlt, showLabel = false }: PlanAvatarProps) {
  const hasBadge = showLabel || plan !== 'free';
  const badgeSizeClass = SIZE_BADGE_CLASS[size] ?? DEFAULT_BADGE_CLASS;

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
      {hasBadge && (
        <span
          className={cn(
            'rounded-full font-bold leading-tight whitespace-nowrap shadow-sm',
            badgeSizeClass,
            planBadgeClass(plan)
          )}
        >
          {planLabelText(plan)}
        </span>
      )}
    </div>
  );
}
