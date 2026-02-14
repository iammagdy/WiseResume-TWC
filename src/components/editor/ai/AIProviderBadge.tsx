import { memo, useState } from 'react';
import { Sparkles, Diamond, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIProviderInfo } from '@/hooks/useAIProviderInfo';
import { haptics } from '@/lib/haptics';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';

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

export const AIProviderBadge = memo(function AIProviderBadge({
  size = 'sm',
  showSettingsLink = false,
  className,
}: AIProviderBadgeProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const providerInfo = useAIProviderInfo();

  const handleClick = () => {
    if (showSettingsLink) {
      haptics.light();
      setSheetOpen(true);
    }
  };

  // Determine colors based on provider
  const isGemini = providerInfo.provider === 'gemini';
  const isPaid = providerInfo.tier === 'paid';

  const bgClass = isGemini
    ? 'bg-blue-500/10'
    : 'bg-primary/10';

  const borderClass = isGemini
    ? isPaid
      ? 'border-green-500/30'
      : 'border-blue-500/20'
    : 'border-primary/20';

  const textClass = isGemini
    ? 'text-blue-400'
    : 'text-primary';

  const IconComponent = isGemini ? Diamond : Sparkles;

  const badge = (
    <button
      onClick={handleClick}
      disabled={!showSettingsLink}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-all',
        'border backdrop-blur-sm',
        bgClass,
        borderClass,
        textClass,
        sizeClasses[size],
        showSettingsLink && 'cursor-pointer hover:bg-primary/15 active:scale-95',
        !showSettingsLink && 'cursor-default',
        className
      )}
    >
      <IconComponent className={iconSizes[size]} />
      <span className="truncate">{providerInfo.name}</span>
      {showSettingsLink && (
        <Settings className={cn(iconSizes[size], 'opacity-60')} />
      )}
    </button>
  );

  if (!showSettingsLink) {
    return badge;
  }

  return (
    <>
      {badge}
      <AISettingsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
});

// Compact version for dropdown footers
export const AIProviderFooter = memo(function AIProviderFooter({
  className,
}: {
  className?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const providerInfo = useAIProviderInfo();

  const handleClick = () => {
    haptics.light();
    setSheetOpen(true);
  };

  const isGemini = providerInfo.provider === 'gemini';
  const IconComponent = isGemini ? Diamond : Sparkles;
  const iconClass = isGemini ? 'text-blue-400' : 'text-primary';

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground',
          'hover:text-foreground transition-colors',
          className
        )}
      >
        <IconComponent className={cn('w-3 h-3', iconClass)} />
        <span>Powered by {providerInfo.name}</span>
        <span className="text-muted-foreground/60">• Change</span>
      </button>
      <AISettingsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
});

// Inline "via" text for dialogs
export function AIProviderVia({ className }: { className?: string }) {
  const providerInfo = useAIProviderInfo();
  const isGemini = providerInfo.provider === 'gemini';
  const textClass = isGemini ? 'text-blue-400' : 'text-primary';

  return (
    <span className={cn('text-xs', textClass, className)}>
      via {providerInfo.name}
    </span>
  );
}
