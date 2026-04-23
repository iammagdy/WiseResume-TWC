import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeSize = 'xs' | 'sm' | 'md';

interface AIProviderBadgeProps {
  size?: BadgeSize;
  showSettingsLink?: boolean;
  className?: string;
}

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'h-5 text-[10px] px-1.5 gap-1',
  sm: 'h-6 text-[11px] px-2 gap-1.5',
  md: 'h-7 text-xs px-2.5 gap-1.5',
};

const iconSizes: Record<BadgeSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
};

const PROVIDER_NAME = 'WiseResume AI';

/**
 * Static provider badge. With BYOK removed there is no per-user
 * configuration to surface, but the component is kept so existing
 * call sites compile and the brand pill renders.
 */
export const AIProviderBadge = memo(function AIProviderBadge({
  size = 'sm',
  className,
}: AIProviderBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        'border backdrop-blur-sm cursor-default',
        'bg-primary/10 border-primary/20 text-primary',
        sizeClasses[size],
        className,
      )}
    >
      <Sparkles className={iconSizes[size]} />
      <span className="truncate">{PROVIDER_NAME}</span>
    </div>
  );
});

export const AIProviderFooter = memo(function AIProviderFooter({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground',
        className,
      )}
    >
      <Sparkles className="w-3 h-3 text-primary" />
      <span>Powered by {PROVIDER_NAME}</span>
    </div>
  );
});

export function AIProviderVia({ className }: { className?: string }) {
  return (
    <span className={cn('text-xs text-primary', className)}>
      via {PROVIDER_NAME}
    </span>
  );
}
