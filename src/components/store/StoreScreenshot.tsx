import type { ReactNode } from 'react';

interface StoreScreenshotProps {
  headline: string;
  subtitle: string;
  gradient: string;
  children: ReactNode;
  id?: string;
}

/**
 * Wrapper that renders a single App Store screenshot card:
 * gradient background → headline/subtitle → iPhone device frame → inner screen.
 * Aspect ratio targets 1290×2796 (iPhone 6.7").
 */
export function StoreScreenshot({
  headline,
  subtitle,
  gradient,
  children,
  id,
}: StoreScreenshotProps) {
  return (
    <div
      id={id}
      className="relative flex flex-col items-center justify-start overflow-hidden"
      style={{
        width: 1290,
        height: 2796,
        background: gradient,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* ── Headline area ── */}
      <div className="flex flex-col items-center gap-4 pt-[140px] pb-[60px] px-16 text-center z-10">
        <h2
          className="font-bold leading-tight text-white"
          style={{ fontSize: 72 }}
        >
          {headline}
        </h2>
        <p
          className="text-white/70 font-medium leading-snug max-w-[900px]"
          style={{ fontSize: 38 }}
        >
          {subtitle}
        </p>
      </div>

      {/* ── Device frame ── */}
      <div className="relative mx-auto z-10" style={{ width: 820, height: 1720 }}>
        {/* Outer bezel */}
        <div
          className="absolute inset-0 rounded-[60px] border-[6px] border-white/20 shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
          }}
        >
          {/* Notch / Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div
              className="bg-black rounded-b-[22px]"
              style={{ width: 220, height: 50 }}
            />
          </div>

          {/* Inner screen area */}
          <div
            className="absolute rounded-[54px] overflow-hidden bg-background"
            style={{ top: 6, left: 6, right: 6, bottom: 6 }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Decorative glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-[200px] opacity-30"
        style={{
          width: 900,
          height: 900,
          background: 'radial-gradient(circle, hsl(355 90% 60%) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
