import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { PlanName } from '@/hooks/usePlan';

interface PlanAvatarProps {
  plan: PlanName;
  avatarUrl?: string | null;
  initials: React.ReactNode;
  size?: string;
  imageAlt?: string;
}

function planRingClass(plan: PlanName): string {
  if (plan === 'premium') return 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background';
  if (plan === 'pro') return 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background';
  return 'border-2 border-primary/20';
}

export function PlanAvatar({ plan, avatarUrl, initials, size = 'w-9 h-9', imageAlt }: PlanAvatarProps) {
  return (
    <Avatar className={cn(size, planRingClass(plan))}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={imageAlt || 'Profile'} />
      )}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
