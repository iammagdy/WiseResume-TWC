import './GlassSurface.css';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  blur?: number;
  saturate?: number;
  distortion?: number;
  [key: string]: unknown;
}

export function GlassSurface({
  children,
  className,
  style,
  as: Tag = 'div',
  blur = 12,
  saturate = 160,
  distortion = 0,
  ...rest
}: GlassSurfaceProps) {
  const filterId = useId();
  const hasDistortion = distortion > 0;
  const hasChildren = children !== undefined && children !== null;

  const glassLayers = (
    <>
      {hasDistortion && (
        <svg
          className="glass-surface__svg"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter
              id={filterId}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                seed="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={distortion}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            filter={`url(#${filterId})`}
            opacity="0"
          />
        </svg>
      )}
      <div className="glass-surface__backdrop" />
      <div className="glass-surface__bg" />
      <div className="glass-surface__border" />
    </>
  );

  if (!hasChildren) {
    return (
      <Tag
        className={cn('glass-surface glass-surface--fallback', className)}
        style={
          {
            '--glass-blur': `${blur}px`,
            '--glass-saturate': `${saturate}%`,
            ...style,
          } as React.CSSProperties
        }
        {...rest}
      >
        {glassLayers}
      </Tag>
    );
  }

  return (
    <Tag
      className={cn('glass-surface glass-surface--fallback', className)}
      style={
        {
          '--glass-blur': `${blur}px`,
          '--glass-saturate': `${saturate}%`,
          ...style,
        } as React.CSSProperties
      }
      {...rest}
    >
      {glassLayers}
      <div className="glass-surface__content">{children}</div>
    </Tag>
  );
}
