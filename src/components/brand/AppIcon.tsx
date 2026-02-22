import wiseAiLogo from '@/assets/wise-ai-logo.webp';

interface AppIconProps {
  size?: number | string;
  showSparkle?: boolean;
  className?: string;
}

export function AppIcon({ size = 64, showSparkle = true, className = '' }: AppIconProps) {
  return (
    <img
      src={wiseAiLogo}
      alt="Wise AI"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }}
    />
  );
}
