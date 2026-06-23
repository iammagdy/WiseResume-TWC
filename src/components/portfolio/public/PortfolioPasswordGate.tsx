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
// A chibi kitten that's alive: it breathes, blinks, twitches its ears and swishes
// its tail, and its eyes follow the pointer. When you type the password it shyly
// covers its eyes with its paws (and peeks when you reveal the password). Wrong
// password → a worried wiggle. All idle motion is disabled under reduced-motion.
function PeekingCat({ accent, covered, peeking, error, reduced }: {
  accent: string; covered: boolean; peeking: boolean; error: boolean; reduced: boolean;
}) {
  const pupilX = useSpring(0, { stiffness: 140, damping: 13 });
  const pupilY = useSpring(0, { stiffness: 140, damping: 13 });
  const ref = useRef<SVGSVGElement>(null);
  const eyesOpen = !(covered && !peeking);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (covered) { pupilX.set(0); pupilY.set(0); return; }
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      pupilX.set(Math.max(-1, Math.min(1, dx)) * 6);
      pupilY.set(Math.max(-1, Math.min(1, dy)) * 5);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [covered, pupilX, pupilY]);

  // Paw group offset: tucked off-screen below by default, up over the eyes when
  // typing, a little lower (peek gap) when the password is revealed.
  const pawY = covered ? (peeking ? 30 : 0) : 132;

  const Eye = ({ cx }: { cx: number }) => (
    <g>
      <ellipse cx={cx} cy={108} rx={17} ry={20} fill="url(#pg-eye)" />
      <motion.g style={{ x: pupilX, y: pupilY }}>
        <circle cx={cx} cy={108} r={11} fill={accent} opacity={0.85} />
        <circle cx={cx} cy={109} r={7.5} fill="#070710" />
        <circle cx={cx - 4} cy={103} r={3.6} fill="#fff" />
        <circle cx={cx + 4} cy={113} r={1.7} fill="#fff" opacity={0.8} />
      </motion.g>
    </g>
  );

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 220 210"
      className="w-40 h-40 mx-auto -mt-2 -mb-1"
      animate={error ? { x: [0, -8, 8, -6, 6, 0], rotate: [0, -3, 3, -2, 0] } : { x: 0, rotate: 0 }}
      transition={{ duration: 0.5 }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pg-fur" cx="50%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#41414f" />
          <stop offset="100%" stopColor="#232330" />
        </radialGradient>
        <radialGradient id="pg-eye" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#23232f" />
          <stop offset="100%" stopColor="#06060c" />
        </radialGradient>
      </defs>

      {/* soft accent glow behind the cat */}
      <ellipse cx="110" cy="118" rx="92" ry="84" fill={accent} opacity="0.10" />

      {/* breathing bob wraps everything (translate-only — no per-frame bbox cost) */}
      <motion.g
        animate={reduced ? undefined : { y: [0, -4, 0] }}
        transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* tail — swishes */}
        <motion.path
          d="M176 168 Q214 150 206 112 Q202 92 188 98"
          fill="none" stroke={accent} strokeOpacity="0.85" strokeWidth="11" strokeLinecap="round"
          style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' } as React.CSSProperties}
          animate={reduced ? undefined : { rotate: [0, 9, 0, -7, 0] }}
          transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ears — occasional twitch */}
        <motion.g
          style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' } as React.CSSProperties}
          animate={reduced ? undefined : { rotate: [0, 0, 0, -7, 4, 0] }}
          transition={reduced ? undefined : { duration: 5.5, times: [0, 0.62, 0.72, 0.8, 0.88, 1], repeat: Infinity }}
        >
          <path d="M58 92 L66 36 L106 74 Z" fill="url(#pg-fur)" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M162 92 L154 36 L114 74 Z" fill="url(#pg-fur)" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M68 84 L72 52 L94 72 Z" fill={accent} opacity="0.55" strokeLinejoin="round" />
          <path d="M152 84 L148 52 L126 72 Z" fill={accent} opacity="0.55" strokeLinejoin="round" />
        </motion.g>

        {/* head */}
        <ellipse cx="110" cy="114" rx="82" ry="73" fill="url(#pg-fur)" stroke={accent} strokeWidth="2.5" />

        {/* blush */}
        <ellipse cx="64" cy="130" rx="13" ry="8" fill={accent} opacity="0.28" />
        <ellipse cx="156" cy="130" rx="13" ry="8" fill={accent} opacity="0.28" />

        {/* whiskers */}
        <g stroke="rgba(255,255,255,0.32)" strokeWidth="1.6" strokeLinecap="round">
          <line x1="50" y1="124" x2="14" y2="118" />
          <line x1="50" y1="132" x2="12" y2="136" />
          <line x1="170" y1="124" x2="206" y2="118" />
          <line x1="170" y1="132" x2="208" y2="136" />
        </g>

        {/* eyes — blink (only meaningful while open) */}
        {eyesOpen ? (
          <motion.g
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
            animate={reduced ? undefined : { scaleY: [1, 1, 1, 0.08, 1] }}
            transition={reduced ? undefined : { duration: 4.6, times: [0, 0.82, 0.88, 0.92, 0.97], repeat: Infinity, ease: 'easeInOut' }}
          >
            <Eye cx={84} />
            <Eye cx={136} />
          </motion.g>
        ) : (
          // happy closed eyes (shown briefly as the paws come up)
          <g fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round">
            <path d="M72 110 Q84 121 96 110" />
            <path d="M124 110 Q136 121 148 110" />
          </g>
        )}

        {/* nose + mouth */}
        <path d="M103 136 Q110 133 117 136 Q113 145 110 147 Q107 145 103 136 Z" fill={accent} />
        <path d="M110 147 Q104 154 99 148 M110 147 Q116 154 121 148" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" />

        {/* paws — rise to cover the eyes while typing */}
        <motion.g animate={{ y: pawY }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
          {[84, 136].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy={110} rx={28} ry={24} fill="url(#pg-fur)" stroke={accent} strokeWidth="2.5" />
              <g fill={accent} opacity="0.5">
                <ellipse cx={cx} cy={101} rx={4} ry={5} />
                <ellipse cx={cx - 11} cy={106} rx={3.4} ry={4.4} />
                <ellipse cx={cx + 11} cy={106} rx={3.4} ry={4.4} />
              </g>
            </g>
          ))}
        </motion.g>
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
          <PeekingCat accent={accent} covered={covered} peeking={revealed} error={hasError} reduced={reduced} />

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
