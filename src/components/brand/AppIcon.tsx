import { useState } from 'react';
import wiseAiLogoLight from '@/assets/wise-ai-logo.webp';
import wiseAiLogoDark from '@/assets/wise-ai-logo-dark.webp';
import { useIsDark } from '@/hooks/useIsDark';

interface AppIconProps {
  size?: number | string;
  showSparkle?: boolean;
  className?: string;
}

export function AppIcon({ size = 64, showSparkle = true, className = '' }: AppIconProps) {
  const [loaded, setLoaded] = useState(false);
  const isDark = useIsDark();
  const logo = isDark ? wiseAiLogoDark : wiseAiLogoLight;

  return (
    <img
      src={logo}
      alt="Wise AI"
      width={size}
      height={size}
      className={`object-contain rounded-2xl ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.2s ease-in',
      }}
      onLoad={() => setLoaded(true)}
    />
  );
}
