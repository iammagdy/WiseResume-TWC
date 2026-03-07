import { useRef, useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// ─── Helpers ────────────────────────────────────────────────────────────────

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Star { id: number; x: number; y: number; size: number; opacity: number; delay: number; duration: number; }
function generateStars(n: number): Star[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.2 + 0.6,
    opacity: Math.random() * 0.5 + 0.45,
    delay: Math.random() * 5,
    duration: 2.5 + Math.random() * 2.5,
  }));
}

// ─── Cloud primitives ────────────────────────────────────────────────────────

/** One soft feathered ellipse — the building block of every cloud */
function Puff({
  left, top, w, h, alpha = 0.92, color = '255,255,255',
}: {
  left: string | number; top: string | number; w: string | number; h: string | number;
  alpha?: number; color?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: typeof left === 'number' ? `${left}px` : left,
        top: typeof top === 'number' ? `${top}px` : top,
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 55%,
          rgba(${color},${alpha}) 0%,
          rgba(${color},${alpha * 0.45}) 45%,
          rgba(${color},0) 72%)`,
        willChange: 'transform',
      }}
    />
  );
}

// ─── LIGHT MODE: Large fluffy white cloud ────────────────────────────────────

function LightMegaCloud({
  style,
  parallaxX,
  parallaxY,
  animDelay,
  animDuration,
  scale = 1,
}: {
  style?: React.CSSProperties;
  parallaxX: number;
  parallaxY: number;
  animDelay: number;
  animDuration: number;
  scale?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '68vw',
        height: '36vh',
        minWidth: 280,
        minHeight: 120,
        transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${scale})`,
        animation: prefersReducedMotion ? 'none' : `sky-breathe ${animDuration}s ease-in-out ${animDelay}s infinite`,
        willChange: 'transform',
        ...style,
      }}
    >
      {/* Base wide layer */}
      <Puff left="0%" top="55%" w="100%" h="45%" alpha={0.82} />
      {/* Central dome — tallest */}
      <Puff left="22%" top="5%" w="46%" h="80%" alpha={0.94} />
      {/* Left dome */}
      <Puff left="6%" top="22%" w="34%" h="65%" alpha={0.87} />
      {/* Right dome */}
      <Puff left="48%" top="18%" w="38%" h="68%" alpha={0.89} />
      {/* Far right puff */}
      <Puff left="68%" top="35%" w="28%" h="52%" alpha={0.80} />
      {/* Far left puff */}
      <Puff left="-2%" top="38%" w="22%" h="42%" alpha={0.78} />
      {/* Top peak */}
      <Puff left="32%" top="0%" w="24%" h="40%" alpha={0.86} />
      {/* Extra inner volume */}
      <Puff left="28%" top="14%" w="20%" h="38%" alpha={0.72} />
      {/* Shadow base */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: '5%', width: '90%', height: '14%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(120,165,210,0.20) 0%, rgba(120,165,210,0) 70%)',
      }} />
    </div>
  );
}

function LightSmallCloud({
  style,
  parallaxX,
  parallaxY,
  animDelay,
  animDuration,
}: {
  style?: React.CSSProperties;
  parallaxX: number;
  parallaxY: number;
  animDelay: number;
  animDuration: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '32vw',
        height: '18vh',
        minWidth: 140,
        minHeight: 70,
        transform: `translate(${parallaxX}px, ${parallaxY}px)`,
        animation: prefersReducedMotion ? 'none' : `sky-breathe ${animDuration}s ease-in-out ${animDelay}s infinite`,
        willChange: 'transform',
        ...style,
      }}
    >
      <Puff left="0%" top="50%" w="100%" h="50%" alpha={0.80} />
      <Puff left="20%" top="10%" w="45%" h="72%" alpha={0.91} />
      <Puff left="5%" top="28%" w="30%" h="58%" alpha={0.83} />
      <Puff left="52%" top="22%" w="34%" h="60%" alpha={0.82} />
      <Puff left="70%" top="42%" w="22%" h="40%" alpha={0.72} />
      <div style={{
        position: 'absolute',
        bottom: 0, left: '5%', width: '90%', height: '12%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(120,165,210,0.15) 0%, rgba(120,165,210,0) 70%)',
      }} />
    </div>
  );
}

// ─── DARK MODE: Atmospheric nebula cloud (grey-white, volumetric) ────────────

function DarkMegaCloud({
  style,
  parallaxX,
  parallaxY,
  animDelay,
  animDuration,
  scale = 1,
}: {
  style?: React.CSSProperties;
  parallaxX: number;
  parallaxY: number;
  animDelay: number;
  animDuration: number;
  scale?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '65vw',
        height: '38vh',
        minWidth: 260,
        minHeight: 130,
        transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${scale})`,
        animation: prefersReducedMotion ? 'none' : `sky-breathe ${animDuration}s ease-in-out ${animDelay}s infinite`,
        willChange: 'transform',
        ...style,
      }}
    >
      {/* Dark clouds: subtle blue-grey tones */}
      <Puff left="0%" top="55%" w="100%" h="45%" alpha={0.18} color="190,210,240" />
      <Puff left="18%" top="8%" w="50%" h="78%" alpha={0.28} color="200,215,240" />
      <Puff left="5%" top="24%" w="36%" h="65%" alpha={0.22} color="195,212,240" />
      <Puff left="50%" top="16%" w="40%" h="70%" alpha={0.24} color="200,215,240" />
      <Puff left="68%" top="36%" w="28%" h="50%" alpha={0.18} color="185,205,235" />
      <Puff left="-4%" top="40%" w="22%" h="42%" alpha={0.15} color="185,205,235" />
      <Puff left="30%" top="0%" w="28%" h="42%" alpha={0.20} color="210,225,245" />
      {/* Bright highlight ridge at top */}
      <Puff left="25%" top="2%" w="32%" h="28%" alpha={0.35} color="220,232,252" />
    </div>
  );
}

function DarkSmallCloud({
  style,
  parallaxX,
  parallaxY,
  animDelay,
  animDuration,
}: {
  style?: React.CSSProperties;
  parallaxX: number;
  parallaxY: number;
  animDelay: number;
  animDuration: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '30vw',
        height: '20vh',
        minWidth: 120,
        minHeight: 80,
        transform: `translate(${parallaxX}px, ${parallaxY}px)`,
        animation: prefersReducedMotion ? 'none' : `sky-breathe ${animDuration}s ease-in-out ${animDelay}s infinite`,
        willChange: 'transform',
        ...style,
      }}
    >
      <Puff left="0%" top="50%" w="100%" h="50%" alpha={0.14} color="190,210,240" />
      <Puff left="18%" top="10%" w="50%" h="72%" alpha={0.22} color="200,218,245" />
      <Puff left="5%" top="28%" w="34%" h="58%" alpha={0.17} color="195,213,242" />
      <Puff left="54%" top="20%" w="36%" h="60%" alpha={0.18} color="200,218,245" />
      <Puff left="28%" top="0%" w="26%" h="38%" alpha={0.28} color="218,230,250" />
    </div>
  );
}

// ─── Main SkyWallpaper ────────────────────────────────────────────────────────

export function SkyWallpaper() {
  const isDark = useIsDark();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax state
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Stars generated once
  const stars = useMemo(() => generateStars(38), []);

  // Skip on public standalone routes and lightweight auth/preview pages
  const isPublicStandalone =
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/share/') ||
    location.pathname.startsWith('/l/') ||
    location.pathname.startsWith('/preview') ||
    location.pathname.startsWith('/auth');

  useEffect(() => {
    if (isPublicStandalone || prefersReducedMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1 to 1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;  // -1 to 1
      setMouse({ x: nx, y: ny });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPublicStandalone]);

  if (isPublicStandalone) return null;

  // Parallax offsets per depth layer
  const p0 = { x: mouse.x * 14, y: mouse.y * 8 };   // foreground
  const p1 = { x: mouse.x * 7,  y: mouse.y * 4 };   // midground
  const p2 = { x: mouse.x * 3,  y: mouse.y * 2 };   // background

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes sky-breathe {
          0%   { transform: scale(1)    rotate(0deg)    translate(0px, 0px); }
          20%  { transform: scale(1.02) rotate(0.25deg) translate(6px, -3px); }
          45%  { transform: scale(1.04) rotate(-0.18deg) translate(-4px, 4px); }
          70%  { transform: scale(1.02) rotate(0.30deg)  translate(8px, -2px); }
          100% { transform: scale(1)    rotate(0deg)    translate(0px, 0px); }
        }
        @keyframes sky-twinkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.55); }
        }
        @keyframes sky-orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-22px) scale(1.04); }
        }
        @keyframes sky-shoot {
          0%   { opacity: 0; transform: translateX(-60px) rotate(-28deg); }
          5%   { opacity: 1; }
          18%  { opacity: 0; transform: translateX(130px) rotate(-28deg); }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          transition: 'background 0.6s ease',
          // Sky base color
          background: isDark
            ? 'linear-gradient(165deg, hsl(240 35% 4%) 0%, hsl(255 38% 6%) 40%, hsl(270 35% 5%) 70%, hsl(240 30% 3%) 100%)'
            : 'linear-gradient(180deg, hsl(210 74% 36%) 0%, hsl(207 68% 50%) 22%, hsl(204 62% 62%) 52%, hsl(200 52% 74%) 76%, hsl(196 44% 83%) 100%)',
        }}
      >
        {isDark ? (
          <>
            {/* Nebula layer */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse at 12% 22%, hsl(270 70% 28% / 0.50) 0%, transparent 45%),
                radial-gradient(ellipse at 88% 58%, hsl(185 70% 26% / 0.42) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 88%, hsl(330 70% 26% / 0.42) 0%, transparent 50%),
                radial-gradient(ellipse at 72% 12%, hsl(355 85% 32% / 0.38) 0%, transparent 35%)
              `,
              opacity: 0.7,
            }} />

            {/* Floating orbs */}
            <div style={{ position: 'absolute', top: '7%', left: '14%', width: '360px', height: '360px', borderRadius: '50%', opacity: 0.15, background: 'radial-gradient(circle, hsl(270 65% 55%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'sky-orb-float 11s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: '42%', right: '7%', width: '280px', height: '280px', borderRadius: '50%', opacity: 0.12, background: 'radial-gradient(circle, hsl(185 65% 48%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'sky-orb-float 14s ease-in-out 3s infinite reverse' }} />
            <div style={{ position: 'absolute', bottom: '8%', left: '52%', width: '320px', height: '320px', borderRadius: '50%', opacity: 0.12, background: 'radial-gradient(circle, hsl(355 80% 50%) 0%, transparent 70%)', animation: prefersReducedMotion ? 'none' : 'sky-orb-float 12s ease-in-out 1.5s infinite' }} />

            {/* Stars */}
            {stars.map((s) => (
              <div
                key={s.id}
                style={{
                  position: 'absolute',
                  left: `${s.x}%`, top: `${s.y}%`,
                  width: s.size, height: s.size,
                  borderRadius: '50%',
                  background: 'white',
                  opacity: s.opacity,
                  animation: prefersReducedMotion ? 'none' : `sky-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}

            {/* Shooting stars */}
            {!prefersReducedMotion && <>
              <div style={{ position: 'absolute', top: '16%', left: '58%', width: '120px', height: '1.5px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)', opacity: 0, animation: 'sky-shoot 9s ease-in-out 2s infinite', transform: 'rotate(-28deg)' }} />
              <div style={{ position: 'absolute', top: '38%', left: '24%', width: '90px', height: '1px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', opacity: 0, animation: 'sky-shoot 9s ease-in-out 6.5s infinite', transform: 'rotate(-22deg)' }} />
            </>}

            {/* Dark Mega Cloud A — center-left foreground */}
            <DarkMegaCloud
              parallaxX={p0.x} parallaxY={p0.y}
              animDelay={0} animDuration={28}
              scale={1.05}
              style={{ top: '12%', left: '8%', opacity: 0.95 }}
            />

            {/* Dark Mega Cloud B — right midground */}
            <DarkMegaCloud
              parallaxX={p1.x} parallaxY={p1.y}
              animDelay={-12} animDuration={34}
              scale={0.90}
              style={{ top: '38%', right: '4%', left: 'auto', opacity: 0.80 }}
            />

            {/* Dark small cloud — upper right background */}
            <DarkSmallCloud
              parallaxX={p2.x} parallaxY={p2.y}
              animDelay={-6} animDuration={22}
              style={{ top: '6%', right: '18%', left: 'auto', opacity: 0.65 }}
            />
          </>
        ) : (
          <>
            {/* Sun corona */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse 68% 52% at 84% -6%, hsl(45 100% 92% / 0.70) 0%, hsl(38 95% 80% / 0.28) 36%, transparent 60%),
                radial-gradient(ellipse 38% 28% at 84% -6%, hsl(50 100% 97% / 0.55) 0%, transparent 38%)
              `,
            }} />

            {/* Horizon haze */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%',
              background: 'linear-gradient(to top, hsl(200 40% 88% / 0.52) 0%, hsl(200 40% 88% / 0.12) 55%, transparent 100%)',
            }} />

            {/* Aerial perspective — wide soft highlight at horizon bottom */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 100% 55% at 50% 100%, hsl(200 50% 92% / 0.22) 0%, transparent 65%)',
            }} />

            {/* Light Mega Cloud A — center, primary foreground cloud */}
            <LightMegaCloud
              parallaxX={p0.x} parallaxY={p0.y}
              animDelay={0} animDuration={26}
              scale={1.0}
              style={{ top: '10%', left: '12%', opacity: 0.92 }}
            />

            {/* Light Mega Cloud B — upper right, slightly behind */}
            <LightMegaCloud
              parallaxX={p1.x} parallaxY={p1.y}
              animDelay={-10} animDuration={32}
              scale={0.82}
              style={{ top: '4%', right: '6%', left: 'auto', opacity: 0.82 }}
            />

            {/* Light small cloud — lower left, midground */}
            <LightSmallCloud
              parallaxX={p1.x * 0.8} parallaxY={p1.y * 0.8}
              animDelay={-18} animDuration={20}
              style={{ top: '50%', left: '5%', opacity: 0.72 }}
            />

            {/* Light small cloud — upper center, background */}
            <LightSmallCloud
              parallaxX={p2.x} parallaxY={p2.y}
              animDelay={-7} animDuration={24}
              style={{ top: '2%', left: '38%', opacity: 0.60 }}
            />
          </>
        )}
      </div>
    </>
  );
}
