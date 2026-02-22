import { useState } from 'react';
import wiseAiLogo from '@/assets/wise-ai-logo.webp';

interface AppIconProps {
  size?: number | string;
  showSparkle?: boolean;
  className?: string;
}

export function AppIcon({ size = 64, showSparkle = true, className = '' }: AppIconProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={wiseAiLogo}
      alt="Wise AI"
      width={size}
      height={size}
      className={`object-contain ${className}`}
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
