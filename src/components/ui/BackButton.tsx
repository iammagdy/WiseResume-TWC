import { ArrowLeft } from 'lucide-react';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface BackButtonProps {
  /** Return true to block navigation (e.g. unsaved changes guard) */
  onBeforeBack?: () => boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Standardized back button using BACK_ROUTES for deterministic navigation.
 * 44x44px minimum touch target, consistent styling across all pages.
 */
export function BackButton({ onBeforeBack, className, 'aria-label': ariaLabel = 'Go back' }: BackButtonProps) {
  const goBack = useBackNavigation();

  const handleClick = () => {
    haptics.light();
    if (onBeforeBack && onBeforeBack()) return;
    goBack();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'p-2 -ml-2 rounded-xl hover:bg-muted/50 active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center',
        className
      )}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
