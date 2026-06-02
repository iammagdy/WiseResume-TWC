import WiseLogoLoader, { type WiseLoaderVariant } from '@/components/loader/WiseLogoLoader';

interface MiniSpinnerProps {
  /** rendered size in px. Default 16. Small sizes render the compact brand ring. */
  size?: number;
  className?: string;
  /** brand styling. Omit to auto-detect from the current route. */
  variant?: WiseLoaderVariant;
}

/**
 * Inline loading indicator. Thin wrapper over {@link WiseLogoLoader} so every
 * button/icon spinner shares the single brand-aware loading visual. At these
 * small sizes the loader renders its compact ring (brand-coloured), which keeps
 * buttons clean and avoids pulling the heavy logo PNGs into tiny slots.
 */
export function MiniSpinner({ size = 16, className, variant }: MiniSpinnerProps) {
  return <WiseLogoLoader size={size} variant={variant} className={className} />;
}
