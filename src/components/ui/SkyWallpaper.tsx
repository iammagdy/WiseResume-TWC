import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsDark } from '@/hooks/useIsDark';
import { useIsMobile } from '@/hooks/use-mobile';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NOISE_OVERLAY: React.CSSProperties = {
  backgroundBlendMode: 'soft-light',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'repeat',
  backgroundSize: '100px',
};

// Lazy-load the heavy 3D canvas only on desktop
const DesktopCanvas = lazy(() => import('./SkyWallpaperCanvas'));

export function SkyWallpaper() {
  const isDark = useIsDark();
  const isMobile = useIsMobile();
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isPublicStandalone =
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/share/') ||
    location.pathname.startsWith('/l/') ||
    location.pathname.startsWith('/preview');

  // Animate background color on theme change
  useGSAP(() => {
    if (!wrapperRef.current) return;
    gsap.to(wrapperRef.current, {
      backgroundColor: isDark ? '#111' : '#0690d4',
      duration: 1,
      ease: 'power2.inOut',
    });
  }, { dependencies: [isDark], scope: wrapperRef });

  if (isPublicStandalone) return null;

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: isDark ? '#111' : '#0690d4',
        ...NOISE_OVERLAY,
      }}
    >
      <Suspense fallback={null}>
        <DesktopCanvas isDark={isDark} isMobile={isMobile} />
      </Suspense>
    </div>
  );
}
