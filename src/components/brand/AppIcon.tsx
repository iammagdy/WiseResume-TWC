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
          <stop offset="100%" stopColor="#FF4D8D" />
        </linearGradient>
        
        {/* Glow effect */}
        <filter id="iconGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Sparkle gradient */}
        <radialGradient id="sparkleGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Background rounded square */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="14"
        fill="url(#iconGradient)"
        filter="url(#iconGlow)"
      />
      
      {/* Document shape */}
      <g transform="translate(12, 10)">
        {/* Document body */}
        <path
          d="M4 6C4 3.79086 5.79086 2 8 2H26L36 12V38C36 40.2091 34.2091 42 32 42H8C5.79086 42 4 40.2091 4 38V6Z"
          fill="white"
          fillOpacity="0.95"
        />
        
        {/* Folded corner */}
        <path
          d="M26 2L36 12H30C27.7909 12 26 10.2091 26 8V2Z"
          fill="white"
          fillOpacity="0.7"
        />
        
        {/* "W" lettermark */}
        <path
          d="M11 18L14 28L17 22L20 28L23 18"
          stroke="#8B5CF6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Resume lines */}
        <rect x="10" y="32" width="20" height="2" rx="1" fill="#8B5CF6" fillOpacity="0.4" />
        <rect x="10" y="36" width="14" height="2" rx="1" fill="#8B5CF6" fillOpacity="0.3" />
      </g>
      
      {/* AI Sparkle */}
      {showSparkle && (
        <g transform="translate(44, 8)">
          {/* Sparkle glow */}
          <circle cx="6" cy="6" r="8" fill="url(#sparkleGradient)" opacity="0.6" />
          
          {/* 4-point star */}
          <path
            d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z"
            fill="#00E5FF"
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
      <stop offset="100%" stop-color="#FF4D8D"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#iconGradient)"/>
  <g transform="translate(12, 10)">
    <path d="M4 6C4 3.79086 5.79086 2 8 2H26L36 12V38C36 40.2091 34.2091 42 32 42H8C5.79086 42 4 40.2091 4 38V6Z" fill="white" fill-opacity="0.95"/>
    <path d="M26 2L36 12H30C27.7909 12 26 10.2091 26 8V2Z" fill="white" fill-opacity="0.7"/>
    <path d="M11 18L14 28L17 22L20 28L23 18" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="10" y="32" width="20" height="2" rx="1" fill="#8B5CF6" fill-opacity="0.4"/>
    <rect x="10" y="36" width="14" height="2" rx="1" fill="#8B5CF6" fill-opacity="0.3"/>
  </g>
  <g transform="translate(44, 8)">
    <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="#00E5FF"/>
  </g>
</svg>`;
