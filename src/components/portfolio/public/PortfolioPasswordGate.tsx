import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

// ── color helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [232, 69, 69];
}
function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function rotateHue([r, g, b]: [number, number, number], deg: number): [number, number, number] {
  // cheap HSL hue-rotate so the background has two related-but-distinct accents
  let [h, s, l] = (() => {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    let hue = 0; const light = (max + min) / 2;
    const d = max - min;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1));
    if (d !== 0) {
      if (max === rr) hue = ((gg - bb) / d) % 6;
      else if (max === gg) hue = (bb - rr) / d + 2;
      else hue = (rr - gg) / d + 4;
      hue *= 60; if (hue < 0) hue += 360;
    }
    return [hue, sat, light];
  })();
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let [rr, gg, bb] = [0, 0, 0];
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return [Math.round((rr + mm) * 255), Math.round((gg + mm) * 255), Math.round((bb + mm) * 255)];
}

// ── animated, accent-driven background ───────────────────────────────────────
function AnimatedBackdrop({ accent, reduced }: { accent: [number, number, number]; reduced: boolean }) {
  const a2 = rotateHue(accent, 40);
  const a3 = rotateHue(accent, -55);
  const blobs = [
    { c: accent, size: 620, x: '8%', y: '12%', dur: 17, delay: 0 },
    { c: a2, size: 520, x: '72%', y: '18%', dur: 21, delay: 1.5 },
    { c: a3, size: 560, x: '60%', y: '74%', dur: 19, delay: 0.8 },
    { c: accent, size: 460, x: '20%', y: '78%', dur: 23, delay: 2.2 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(140% 120% at 50% 0%, #0d0d18 0%, #07070d 60%, #050509 100%)' }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size, height: b.size, left: b.x, top: b.y,
            marginLeft: -b.size / 2, marginTop: -b.size / 2,
            background: `radial-gradient(circle at 50% 50%, ${rgba(b.c, 0.55)} 0%, ${rgba(b.c, 0.12)} 45%, transparent 70%)`,
            filter: 'blur(48px)',
            willChange: 'transform',
          }}
          animate={reduced ? undefined : {
            x: [0, 36, -22, 0],
            y: [0, -28, 24, 0],
            scale: [1, 1.12, 0.94, 1],
          }}
          transition={reduced ? undefined : { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* drifting sheen */}
      {!reduced && (
        <motion.div
          className="absolute inset-0"
          style={{ background: `linear-gradient(115deg, transparent 40%, ${rgba(accent, 0.06)} 50%, transparent 60%)`, backgroundSize: '200% 200%' }}
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* fine grid + vignette for depth */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 72%)',
      }} />
    </div>
  );
}

// ── the cat ──────────────────────────────────────────────────────────────────
// Eyes track the pointer; paws rise to cover the eyes while typing the password,
// and lower to a "peek" when the visitor reveals it. Wrong password → a quick
// worried shake.
function PeekingCat({ accent, covered, peeking, error }: {
  accent: string; covered: boolean; peeking: boolean; error: boolean;
}) {
  const pupilX = useSpring(0, { stiffness: 120, damping: 14 });
  const pupilY = useSpring(0, { stiffness: 120, damping: 14 });
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (covered) { pupilX.set(0); pupilY.set(0); return; }
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      pupilX.set(Math.max(-1, Math.min(1, dx)) * 5);
      pupilY.set(Math.max(-1, Math.min(1, dy)) * 4);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [covered, pupilX, pupilY]);

  // paw vertical position: hidden below by default, up over eyes when covered,
  // a partial "peek" gap when revealing the password.
  const pawY = covered ? (peeking ? 30 : 8) : 96;

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 200 170"
      className="w-36 h-32 mx-auto"
      animate={error ? { x: [0, -7, 7, -5, 5, 0], rotate: [0, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="catFur" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#33333f" />
          <stop offset="100%" stopColor="#1b1b24" />
        </radialGradient>
      </defs>

      {/* ears */}
      <path d="M48 60 L40 18 L82 44 Z" fill="url(#catFur)" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M152 60 L160 18 L118 44 Z" fill="url(#catFur)" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M52 52 L48 30 L70 44 Z" fill={accent} opacity="0.5" />
      <path d="M148 52 L152 30 L130 44 Z" fill={accent} opacity="0.5" />

      {/* head */}
      <ellipse cx="100" cy="98" rx="66" ry="58" fill="url(#catFur)" stroke={accent} strokeWidth="2.5" />

      {/* whiskers */}
      <g stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="40" y1="104" x2="8" y2="98" />
        <line x1="40" y1="112" x2="10" y2="116" />
        <line x1="160" y1="104" x2="192" y2="98" />
        <line x1="160" y1="112" x2="190" y2="116" />
      </g>

      {/* eyes */}
      <g>
        <ellipse cx="76" cy="92" rx="16" ry={covered && !peeking ? 2 : 17} fill="#0c0c12" />
        <ellipse cx="124" cy="92" rx="16" ry={covered && !peeking ? 2 : 17} fill="#0c0c12" />
        {!(covered && !peeking) && (
          <>
            <motion.g style={{ x: pupilX, y: pupilY }}>
              <circle cx="76" cy="92" r="8.5" fill={accent} />
              <circle cx="124" cy="92" r="8.5" fill={accent} />
              <circle cx="79" cy="88" r="2.6" fill="#fff" />
              <circle cx="127" cy="88" r="2.6" fill="#fff" />
            </motion.g>
          </>
        )}
      </g>

      {/* nose + mouth */}
      <path d="M94 112 L106 112 L100 119 Z" fill={accent} />
      <path d="M100 119 Q100 126 92 126 M100 119 Q100 126 108 126" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" />

      {/* paws — rise to cover the eyes while typing */}
      <motion.g animate={{ y: pawY }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <ellipse cx="74" cy="84" rx="22" ry="18" fill="url(#catFur)" stroke={accent} strokeWidth="2.5" />
        <ellipse cx="126" cy="84" rx="22" ry="18" fill="url(#catFur)" stroke={accent} strokeWidth="2.5" />
        {/* toe beans */}
        <g fill={accent} opacity="0.55">
          <ellipse cx="68" cy="88" rx="3.4" ry="4.4" />
          <ellipse cx="78" cy="89" rx="3.4" ry="4.4" />
          <ellipse cx="120" cy="89" rx="3.4" ry="4.4" />
          <ellipse cx="130" cy="88" rx="3.4" ry="4.4" />
        </g>
      </motion.g>
    </motion.svg>
  );
}

// ── gate ─────────────────────────────────────────────────────────────────────
export function PortfolioPasswordGate({
  accentColor,
  onSubmit,
  hasError,
  isChecking,
}: {
  accentColor: string;
  onSubmit: (password: string) => void;
  hasError: boolean;
  isChecking: boolean;
}) {
  const accent = accentColor || '#e84545';
  const accentRgb = hexToRgb(accent);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const canSubmit = value.length > 0 && !isChecking;

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(value);
  }, [canSubmit, value, onSubmit]);

  const covered = focused || value.length > 0;

  return (
    <div className="relative z-[1] min-h-[100dvh] flex items-center justify-center p-6 overflow-hidden">
      <AnimatedBackdrop accent={accentRgb} reduced={reduced} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* glow ring behind the card */}
        <div
          className="absolute -inset-px rounded-3xl opacity-70"
          style={{ background: `linear-gradient(135deg, ${rgba(accentRgb, 0.55)}, transparent 55%)`, filter: 'blur(14px)' }}
        />
        <div
          className="relative rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl"
          style={{
            background: 'rgba(15,15,22,0.72)',
            border: `1px solid ${rgba(accentRgb, 0.25)}`,
            boxShadow: `0 30px 90px -30px ${rgba(accentRgb, 0.5)}, 0 8px 30px rgba(0,0,0,0.5)`,
          }}
        >
          <PeekingCat accent={accent} covered={covered} peeking={revealed} error={hasError} />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Protected Portfolio</h1>
            <p className="text-sm text-white/55 leading-relaxed">
              {hasError
                ? 'Hmm, that password didn’t work. Want to try again?'
                : 'This portfolio is private. Enter the password and I’ll let you in.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={revealed ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter password"
                autoFocus
                autoComplete="current-password"
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-white/[0.06] text-white placeholder-white/30 text-sm outline-none transition-all duration-200"
                style={{
                  border: `1px solid ${focused ? rgba(accentRgb, 0.6) : 'rgba(255,255,255,0.14)'}`,
                  boxShadow: focused ? `0 0 0 4px ${rgba(accentRgb, 0.18)}` : 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                aria-label={revealed ? 'Hide password' : 'Show password'}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white/45 hover:text-white/80 transition-colors"
              >
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {hasError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-400"
                >
                  Incorrect password. Please try again.
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!canSubmit}
              className="group w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: accent, boxShadow: `0 10px 30px -8px ${rgba(accentRgb, 0.7)}` }}
            >
              {isChecking ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  Unlock Portfolio
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-white/30">🔒 End-to-end private · powered by WiseResume</p>
        </div>
      </motion.div>
    </div>
  );
}
