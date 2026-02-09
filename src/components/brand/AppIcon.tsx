import { SVGProps } from 'react';

interface AppIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  showSparkle?: boolean;
}

export function AppIcon({ size = 64, showSparkle = true, ...props }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Main gradient - Electric Purple to Hot Pink */}
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        
        {/* Inner glow gradient */}
        <radialGradient id="innerGlow" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        
        {/* Sparkle gradient */}
        <radialGradient id="sparkleGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Background rounded square */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill="url(#iconGradient)"
      />
      
      {/* Subtle inner glow */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill="url(#innerGlow)"
      />
      
      {/* Bold "W" lettermark - centered and prominent */}
      <path
        d="M16 18L22 42L32 28L42 42L48 18"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* AI Sparkle - refined and subtle */}
      {showSparkle && (
        <g transform="translate(46, 6)">
          {/* Sparkle glow */}
          <circle cx="5" cy="5" r="6" fill="url(#sparkleGradient)" opacity="0.5" />
          
          {/* 4-point star - smaller and golden */}
          <path
            d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4L5 0Z"
            fill="#FFD700"
          />
        </g>
      )}
    </svg>
  );
}

// Export a static SVG string for favicon use
export const appIconSvgString = `<svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="50%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#iconGradient)"/>
  <path d="M16 18L22 42L32 28L42 42L48 18" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <g transform="translate(46, 6)">
    <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4L5 0Z" fill="#FFD700"/>
  </g>
</svg>`;
