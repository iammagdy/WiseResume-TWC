import { useMemo, useState, useEffect } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

interface CloudData {
  id: number;
  top: number;
  scale: number;
  duration: number;
  delay: number;
  opacity: number;
  type: 'large' | 'medium' | 'small';
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.8,
    opacity: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
  }));
}

function generateClouds(count: number): CloudData[] {
  const types: Array<'large' | 'medium' | 'small'> = ['large', 'medium', 'small', 'large', 'medium', 'small', 'large', 'medium', 'small', 'small'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: [6, 18, 10, 32, 44, 22, 52, 14, 38, 28][i % 10],
    scale: 0.7 + Math.random() * 0.65,
    duration: 50 + Math.random() * 40,
    delay: -(Math.random() * 80),
    opacity: 0.75 + Math.random() * 0.2,
    type: types[i % 10],
  }));
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

/** Soft gradient cloud puff — one elliptical blob */
function CloudPuff({
  left, bottom, width, height, opacityInner = 0.92, opacityOuter = 0,
}: {
  left: number; bottom: number; width: number; height: number;
  opacityInner?: number; opacityOuter?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        bottom: `${bottom}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 60%, rgba(255,255,255,${opacityInner}) 0%, rgba(255,255,255,${opacityInner * 0.55}) 45%, rgba(255,255,255,${opacityOuter}) 72%)`,
      }}
    />
  );
}

function CloudLarge({ cloud }: { cloud: CloudData }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${cloud.top}%`,
        left: 0,
        width: '440px',
        height: '140px',
        opacity: cloud.opacity,
        transform: `scale(${cloud.scale})`,
        transformOrigin: 'left center',
        animation: prefersReducedMotion ? 'none' : `cloud-drift ${cloud.duration}s linear ${cloud.delay}s infinite`,
        willChange: 'transform',
      }}
    >
      {/* Wide flat base */}
      <CloudPuff left={10}  bottom={0}   width={400} height={55}  opacityInner={0.88} />
      {/* Large center dome */}
      <CloudPuff left={80}  bottom={28}  width={160} height={110} opacityInner={0.95} />
      {/* Left dome */}
      <CloudPuff left={20}  bottom={22}  width={110} height={80}  opacityInner={0.85} />
      {/* Right dome */}
      <CloudPuff left={230} bottom={20}  width={130} height={90}  opacityInner={0.87} />
      {/* Far-right puff */}
      <CloudPuff left={320} bottom={12}  width={90}  height={65}  opacityInner={0.78} />
      {/* Top accent puff */}
      <CloudPuff left={130} bottom={72}  width={80}  height={62}  opacityInner={0.80} />
      {/* Subtle base shadow */}
      <div style={{
        position: 'absolute', bottom: 0, left: '5%', width: '90%', height: '18px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(140,180,220,0.18) 0%, rgba(140,180,220,0) 70%)',
      }} />
    </div>
  );
}

function CloudMedium({ cloud }: { cloud: CloudData }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${cloud.top}%`,
        left: 0,
        width: '300px',
        height: '100px',
        opacity: cloud.opacity,
        transform: `scale(${cloud.scale})`,
        transformOrigin: 'left center',
        animation: prefersReducedMotion ? 'none' : `cloud-drift ${cloud.duration}s linear ${cloud.delay}s infinite`,
        willChange: 'transform',
      }}
    >
      <CloudPuff left={8}   bottom={0}  width={275} height={42}  opacityInner={0.86} />
      <CloudPuff left={55}  bottom={22} width={120} height={85}  opacityInner={0.93} />
      <CloudPuff left={10}  bottom={18} width={85}  height={65}  opacityInner={0.82} />
      <CloudPuff left={168} bottom={14} width={95}  height={68}  opacityInner={0.84} />
      <CloudPuff left={100} bottom={55} width={65}  height={50}  opacityInner={0.75} />
      <div style={{
        position: 'absolute', bottom: 0, left: '5%', width: '90%', height: '14px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(140,180,220,0.15) 0%, rgba(140,180,220,0) 70%)',
      }} />
    </div>
  );
}

function CloudSmall({ cloud }: { cloud: CloudData }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${cloud.top}%`,
        left: 0,
        width: '200px',
        height: '72px',
        opacity: cloud.opacity,
        transform: `scale(${cloud.scale})`,
        transformOrigin: 'left center',
        animation: prefersReducedMotion ? 'none' : `cloud-drift ${cloud.duration}s linear ${cloud.delay}s infinite`,
        willChange: 'transform',
      }}
    >
      <CloudPuff left={5}  bottom={0}  width={185} height={34} opacityInner={0.84} />
      <CloudPuff left={35} bottom={16} width={85}  height={60} opacityInner={0.91} />
      <CloudPuff left={5}  bottom={12} width={60}  height={48} opacityInner={0.78} />
      <CloudPuff left={105} bottom={10} width={68} height={50} opacityInner={0.80} />
    </div>
  );
}

function Cloud({ cloud }: { cloud: CloudData }) {
  if (cloud.type === 'large') return <CloudLarge cloud={cloud} />;
  if (cloud.type === 'small') return <CloudSmall cloud={cloud} />;
  return <CloudMedium cloud={cloud} />;
}

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  const stars = useMemo(() => generateStars(20), []);
  const clouds = useMemo(() => generateClouds(10), []);
  const isDark = useIsDark();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: isDark ? 'hsl(240 30% 3%)' : 'hsl(210 72% 52%)',
        transition: 'background-color 0.6s ease',
      }}
    >
      {isDark ? (
        <>
          {/* ── DARK: Space scene ── */}

          {/* Layer 0: Deep space gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 50% 0%, hsl(355 60% 12% / 0.6) 0%, transparent 50%),
                linear-gradient(180deg, hsl(240 30% 4%) 0%, hsl(270 35% 6%) 50%, hsl(240 30% 3%) 100%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Layer 1: Nebula overlay */}
          <div
            className="absolute inset-0 opacity-45"
            style={{
              background: `
                radial-gradient(ellipse at 15% 25%, hsl(270 70% 30% / 0.55) 0%, transparent 45%),
                radial-gradient(ellipse at 85% 55%, hsl(185 70% 28% / 0.45) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 85%, hsl(330 70% 28% / 0.45) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 15%, hsl(355 85% 35% / 0.4) 0%, transparent 35%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Layer 2: Floating orbs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute w-[380px] h-[380px] rounded-full" style={{ top: '8%', left: '15%', opacity: 0.16, background: 'radial-gradient(circle, hsl(270 65% 55%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'orb-float 10s ease-in-out infinite' }} />
            <div className="absolute w-[300px] h-[300px] rounded-full" style={{ top: '40%', right: '8%', opacity: 0.13, background: 'radial-gradient(circle, hsl(185 65% 48%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'orb-float 13s ease-in-out 3s infinite reverse' }} />
            <div className="absolute w-[340px] h-[340px] rounded-full" style={{ bottom: '10%', left: '50%', opacity: 0.14, background: 'radial-gradient(circle, hsl(355 80% 50%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'orb-float 11s ease-in-out 1.5s infinite' }} />
            <div className="absolute w-[220px] h-[220px] rounded-full" style={{ top: '60%', left: '5%', opacity: 0.10, background: 'radial-gradient(circle, hsl(330 60% 50%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'orb-float 8s ease-in-out 5s infinite reverse' }} />
          </div>

          {/* Layer 3: Twinkling stars */}
          <div className="absolute inset-0 pointer-events-none" style={{ contain: 'layout style paint' }} aria-hidden="true">
            {stars.map((star) => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                  animation: prefersReducedMotion ? 'none' : `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Layer 4: Shooting stars */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div style={{ position: 'absolute', top: '18%', left: '60%', width: '120px', height: '1.5px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.9), transparent)', opacity: 0, animation: 'shooting-star 8s ease-in-out 2s infinite', transform: 'rotate(-30deg)' }} />
              <div style={{ position: 'absolute', top: '40%', left: '25%', width: '90px', height: '1px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.7), transparent)', opacity: 0, animation: 'shooting-star 8s ease-in-out 6s infinite', transform: 'rotate(-25deg)' }} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── LIGHT: Photorealistic blue sky ── */}

          {/* Atmospheric gradient — zenith to horizon */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                hsl(210 72% 38%) 0%,
                hsl(207 68% 52%) 25%,
                hsl(204 62% 64%) 55%,
                hsl(200 52% 76%) 78%,
                hsl(196 45% 84%) 100%
              )`,
            }}
            aria-hidden="true"
          />

          {/* Sun corona — top right, wide soft glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 55% at 82% -5%, hsl(45 100% 92% / 0.68) 0%, hsl(38 95% 80% / 0.28) 35%, transparent 60%),
                radial-gradient(ellipse 40% 30% at 82% -5%, hsl(50 100% 96% / 0.55) 0%, transparent 40%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Atmospheric haze band near horizon */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: '35%',
              background: 'linear-gradient(to top, hsl(200 40% 88% / 0.5) 0%, hsl(200 40% 88% / 0.15) 50%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          {/* Subtle aerial perspective — mid-sky brightening */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 100% 60% at 50% 100%, hsl(200 50% 90% / 0.22) 0%, transparent 65%)',
            }}
            aria-hidden="true"
          />

          {/* Animated clouds */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {clouds.map((cloud) => (
              <Cloud key={cloud.id} cloud={cloud} />
            ))}
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-24px) scale(1.04); }
        }
        @keyframes shooting-star {
          0% { opacity: 0; transform: translateX(-60px) rotate(-30deg); }
          5% { opacity: 1; }
          15% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
          100% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
        }
        @keyframes cloud-drift {
          0%   { transform: translateX(110vw) scale(var(--cs, 1)); }
          100% { transform: translateX(-480px) scale(var(--cs, 1)); }
        }
      `}</style>
    </div>
  );
}


interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

interface Cloud {
  id: number;
  top: number;       // % from top
  scale: number;     // 0.6 – 1.4
  duration: number;  // seconds to cross screen
  delay: number;     // negative = already in motion
  opacity: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.8,
    opacity: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
  }));
}

function generateClouds(count: number): Cloud[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: [8, 18, 28, 38, 12, 44, 22, 5][i % 8],
    scale: 0.7 + Math.random() * 0.7,
    duration: 55 + Math.random() * 35,
    delay: -(Math.random() * 60),
    opacity: 0.65 + Math.random() * 0.25,
  }));
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

/** A single fluffy cloud made of overlapping rounded divs */
function Cloud({ cloud }: { cloud: Cloud }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${cloud.top}%`,
        left: 0,
        width: '260px',
        height: '80px',
        opacity: cloud.opacity,
        transform: `scale(${cloud.scale})`,
        transformOrigin: 'left center',
        animation: prefersReducedMotion
          ? 'none'
          : `cloud-drift ${cloud.duration}s linear ${cloud.delay}s infinite`,
        willChange: 'transform',
      }}
    >
      {/* Main pill body */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '20px',
          right: '20px',
          height: '38px',
          borderRadius: '999px',
          background: 'white',
        }}
      />
      {/* Large top bubble */}
      <div
        style={{
          position: 'absolute',
          bottom: '22px',
          left: '55px',
          width: '90px',
          height: '72px',
          borderRadius: '50%',
          background: 'white',
        }}
      />
      {/* Left bump */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '22px',
          width: '60px',
          height: '52px',
          borderRadius: '50%',
          background: 'white',
        }}
      />
      {/* Right bump */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '130px',
          width: '56px',
          height: '46px',
          borderRadius: '50%',
          background: 'white',
        }}
      />
    </div>
  );
}

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  const stars = useMemo(() => generateStars(20), []);
  const clouds = useMemo(() => generateClouds(8), []);
  const isDark = useIsDark();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: isDark ? 'hsl(240 30% 3%)' : 'hsl(205 80% 74%)',
        transition: 'background-color 0.6s ease',
      }}
    >
      {isDark ? (
        <>
          {/* ── DARK: Space scene ── */}

          {/* Layer 0: Deep space gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 50% 0%, hsl(355 60% 12% / 0.6) 0%, transparent 50%),
                linear-gradient(180deg, hsl(240 30% 4%) 0%, hsl(270 35% 6%) 50%, hsl(240 30% 3%) 100%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Layer 1: Nebula overlay */}
          <div
            className="absolute inset-0 opacity-45"
            style={{
              background: `
                radial-gradient(ellipse at 15% 25%, hsl(270 70% 30% / 0.55) 0%, transparent 45%),
                radial-gradient(ellipse at 85% 55%, hsl(185 70% 28% / 0.45) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 85%, hsl(330 70% 28% / 0.45) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 15%, hsl(355 85% 35% / 0.4) 0%, transparent 35%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Layer 2: Floating orbs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute w-[380px] h-[380px] rounded-full"
              style={{
                top: '8%', left: '15%', opacity: 0.16,
                background: 'radial-gradient(circle, hsl(270 65% 55%) 0%, transparent 70%)',
                animation: prefersReducedMotion ? 'none' : 'orb-float 10s ease-in-out infinite',
              }}
            />
            <div
              className="absolute w-[300px] h-[300px] rounded-full"
              style={{
                top: '40%', right: '8%', opacity: 0.13,
                background: 'radial-gradient(circle, hsl(185 65% 48%) 0%, transparent 70%)',
                animation: prefersReducedMotion ? 'none' : 'orb-float 13s ease-in-out 3s infinite reverse',
              }}
            />
            <div
              className="absolute w-[340px] h-[340px] rounded-full"
              style={{
                bottom: '10%', left: '50%', opacity: 0.14,
                background: 'radial-gradient(circle, hsl(355 80% 50%) 0%, transparent 70%)',
                animation: prefersReducedMotion ? 'none' : 'orb-float 11s ease-in-out 1.5s infinite',
              }}
            />
            <div
              className="absolute w-[220px] h-[220px] rounded-full"
              style={{
                top: '60%', left: '5%', opacity: 0.10,
                background: 'radial-gradient(circle, hsl(330 60% 50%) 0%, transparent 70%)',
                animation: prefersReducedMotion ? 'none' : 'orb-float 8s ease-in-out 5s infinite reverse',
              }}
            />
          </div>

          {/* Layer 3: Twinkling stars */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ contain: 'layout style paint' }}
            aria-hidden="true"
          >
            {stars.map((star) => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                  animation: prefersReducedMotion
                    ? 'none'
                    : `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Layer 4: Shooting stars */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div style={{ position: 'absolute', top: '18%', left: '60%', width: '120px', height: '1.5px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.9), transparent)', opacity: 0, animation: 'shooting-star 8s ease-in-out 2s infinite', transform: 'rotate(-30deg)' }} />
              <div style={{ position: 'absolute', top: '40%', left: '25%', width: '90px', height: '1px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.7), transparent)', opacity: 0, animation: 'shooting-star 8s ease-in-out 6s infinite', transform: 'rotate(-25deg)' }} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── LIGHT: Blue sky scene ── */}

          {/* Base sky gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                hsl(200 85% 60%) 0%,
                hsl(205 80% 68%) 35%,
                hsl(210 75% 76%) 65%,
                hsl(215 65% 82%) 100%
              )`,
            }}
            aria-hidden="true"
          />

          {/* Sun glow — top center */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 60% 40% at 72% 0%, hsl(45 100% 90% / 0.75) 0%, transparent 60%),
                radial-gradient(ellipse 40% 25% at 72% 0%, hsl(38 100% 80% / 0.45) 0%, transparent 40%)
              `,
            }}
            aria-hidden="true"
          />

          {/* Horizon haze */}
          <div
            className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(220 60% 88% / 0.5) 0%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          {/* Animated clouds */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {clouds.map((cloud) => (
              <Cloud key={cloud.id} cloud={cloud} />
            ))}
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-24px) scale(1.04); }
        }
        @keyframes shooting-star {
          0% { opacity: 0; transform: translateX(-60px) rotate(-30deg); }
          5% { opacity: 1; }
          15% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
          100% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
        }
        @keyframes cloud-drift {
          0%   { transform: translateX(110vw) scale(var(--cs, 1)); }
          100% { transform: translateX(-320px) scale(var(--cs, 1)); }
        }
      `}</style>
    </div>
  );
}
