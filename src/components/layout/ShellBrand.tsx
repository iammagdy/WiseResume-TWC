import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemeLogo } from '@/hooks/useThemeLogo';
import { cn } from '@/lib/utils';

interface ShellBrandProps {
  /** Smaller logo for mobile top bar */
  compact?: boolean;
  className?: string;
}

/** WiseResume brand — Project Atlas production logo assets (theme-aware). */
export function ShellBrand({ compact = false, className }: ShellBrandProps) {
  const logo = useThemeLogo();
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      to="/dashboard"
      className={cn(
        'flex items-center shrink-0 rounded-lg hover:opacity-90 transition-opacity',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      aria-label="WiseResume — go to Dashboard"
    >
      <img
        src={logo}
        alt="WiseResume"
        width={compact ? 132 : 156}
        height={compact ? 40 : 48}
        className={cn(
          'object-contain object-left w-auto select-none',
          compact ? 'h-8 max-w-[8.25rem]' : 'h-9 max-w-[9.75rem] sm:h-10 sm:max-w-[10.75rem]',
        )}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </Link>
  );
}
