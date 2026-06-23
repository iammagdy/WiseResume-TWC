import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, AlertCircle, Lock } from 'lucide-react';

// ── color helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [232, 69, 69];
}
function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function rotateHue([r, g, b]: [number, number, number], deg: number): [number, number, number] {
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
  const a2 = rotateHue(accent, 36);
  const a3 = rotateHue(accent, -52);
  const blobs = [
    { c: accent, size: 620, x: '8%', y: '12%', dur: 17, delay: 0 },
    { c: a2, size: 520, x: '74%', y: '16%', dur: 21, delay: 1.5 },
    { c: a3, size: 560, x: '60%', y: '76%', dur: 19, delay: 0.8 },
    { c: accent, size: 460, x: '18%', y: '80%', dur: 23, delay: 2.2 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(140% 120% at 50% 0%, #14080a 0%, #0a0608 60%, #050304 100%)' }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size, height: b.size, left: b.x, top: b.y,
            marginLeft: -b.size / 2, marginTop: -b.size / 2,
            background: `radial-gradient(circle at 50% 50%, ${rgba(b.c, 0.5)} 0%, ${rgba(b.c, 0.1)} 45%, transparent 70%)`,
            filter: 'blur(50px)', willChange: 'transform',
          }}
          animate={reduced ? undefined : { x: [0, 34, -20, 0], y: [0, -26, 22, 0], scale: [1, 1.12, 0.94, 1] }}
          transition={reduced ? undefined : { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
        backgroundSize: '46px 46px',
        maskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 72%)',
      }} />
    </div>
  );
}

// ── Scout — the ATS-scanner mascot ───────────────────────────────────────────
// Camera lenses for eyes; pupils follow the pointer; shutters slide down to cover
// the lenses while you type, and lift to a one-eyed peek when you reveal the
// password. Ported from the "Scout Password Screen" design.
function ScoutMascot({ accent, leftCover, rightCover, reduced }: {
  accent: string; leftCover: boolean; rightCover: boolean; reduced: boolean;
}) {
  const px = useSpring(0, { stiffness: 140, damping: 13 });
  const py = useSpring(0, { stiffness: 140, damping: 13 });
  const deep = `color-mix(in srgb, ${accent} 72%, #1b0406)`;
  const highlight = `color-mix(in srgb, ${accent} 32%, #ffffff)`;
  const shutterT = 'transform .42s cubic-bezier(.16,1,.3,1)';

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1, h = window.innerHeight || 1;
      const x = Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1));
      const y = Math.max(-1, Math.min(1, (e.clientY / h) * 2 - 1));
      px.set(x * 6); py.set(y * 4.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [px, py]);

  return (
    <motion.div
      className="mx-auto"
      style={{ width: 150, height: 168 }}
      animate={reduced ? undefined : { y: [0, -7, 0] }}
      transition={reduced ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 160 175" style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <clipPath id="pg-lensL"><circle cx="60" cy="88" r="18" /></clipPath>
          <clipPath id="pg-lensR"><circle cx="100" cy="88" r="18" /></clipPath>
        </defs>

        {/* antenna */}
        <line x1="80" y1="46" x2="80" y2="28" stroke="#6b6470" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="24" r="5" fill={accent} style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />

        {/* head */}
        <rect x="26" y="46" width="108" height="86" rx="22" fill="#2b2730" />
        <rect x="34" y="54" width="92" height="70" rx="16" fill="#16131a" />
        <rect x="22" y="78" width="9" height="22" rx="4.5" fill="#3a3640" />
        <rect x="129" y="78" width="9" height="22" rx="4.5" fill="#3a3640" />

        {/* lens housings */}
        <circle cx="60" cy="88" r="18" fill="#0c0910" />
        <circle cx="100" cy="88" r="18" fill="#0c0910" />
        <circle cx="60" cy="88" r="18" fill="none" stroke={deep} strokeWidth="2.5" />
        <circle cx="100" cy="88" r="18" fill="none" stroke={deep} strokeWidth="2.5" />

        {/* LEFT lens — pupil + shutter */}
        <g clipPath="url(#pg-lensL)">
          <motion.g style={{ x: px, y: py }}>
            <circle cx="60" cy="88" r="9" fill={accent} />
            <circle cx="56" cy="84" r="2.4" fill={highlight} />
          </motion.g>
          <rect x="40" y="62" width="40" height="38" rx="3" fill="#514a55"
            style={{ transform: leftCover ? 'translateY(0)' : 'translateY(-40px)', transition: shutterT }} />
        </g>

        {/* RIGHT lens — pupil + shutter */}
        <g clipPath="url(#pg-lensR)">
          <motion.g style={{ x: px, y: py }}>
            <circle cx="100" cy="88" r="9" fill={accent} />
            <circle cx="96" cy="84" r="2.4" fill={highlight} />
          </motion.g>
          <rect x="80" y="62" width="40" height="38" rx="3" fill="#514a55"
            style={{ transform: rightCover ? 'translateY(0)' : 'translateY(-40px)', transition: shutterT }} />
        </g>

        {/* scan beam + label */}
        <motion.rect x="40" y="114" width="80" height="3" rx="1.5" fill={accent}
          animate={reduced ? undefined : { opacity: [0.35, 0.9, 0.35], y: [0, 5, 0] }}
          transition={reduced ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ opacity: 0.5 }} />
        <text x="80" y="124" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="700" letterSpacing="1.5" fill="#6b6470">ATS</text>
      </svg>
    </motion.div>
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

  // Left shutter covers while typing AND while revealed; right shutter covers only
  // during a full cover — so revealing the password leaves one lens open (a peek).
  const active = focused || value.length > 0;
  const leftCover = active || revealed;
  const rightCover = active && !revealed;

  return (
    <div className="relative z-[1] min-h-[100dvh] flex items-center justify-center p-6 overflow-hidden">
      <AnimatedBackdrop accent={accentRgb} reduced={reduced} />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full"
        style={{ maxWidth: 420 }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 28,
            padding: '38px 34px 30px',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 40px 80px -28px rgba(20,8,8,0.7)',
            background: `radial-gradient(ellipse 70% 55% at 0% 0%, ${rgba(accentRgb, 0.5)}, transparent 55%), radial-gradient(ellipse 70% 60% at 100% 100%, ${rgba(accentRgb, 0.42)}, transparent 55%), #140d10`,
          }}
        >
          {/* Protected pill */}
          <div
            className="mx-auto mb-[22px] flex w-fit items-center justify-center gap-[7px] rounded-full px-[14px] py-[6px]"
            style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', font: '600 0.68rem/1 Inter, system-ui, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e6b3b6' }}
          >
            <span className="block w-[6px] h-[6px] rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
            Protected
          </div>

          <div className="text-center" style={{ font: '800 1.7rem/1.1 Inter, system-ui, sans-serif', letterSpacing: '-0.03em', color: '#fbf6f3' }}>
            Protected Portfolio
          </div>
          <div className="text-center mx-auto" style={{ font: '400 0.9rem/1.5 Inter, system-ui, sans-serif', color: '#b9aeb0', margin: '10px auto 6px', maxWidth: 300 }}>
            {hasError ? 'That password didn’t match — want to try again?' : 'This portfolio is private. Enter the password and I’ll let you in.'}
          </div>

          <ScoutMascot accent={accent} leftCover={leftCover} rightCover={rightCover} reduced={reduced} />

          <form onSubmit={handleSubmit}>
            {/* input row */}
            <div
              className="flex items-center gap-[6px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${focused ? rgba(accentRgb, 0.6) : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 16, padding: '0 8px 0 18px', height: 56,
                boxShadow: focused ? `0 0 0 3px ${rgba(accentRgb, 0.18)}` : 'none',
                transition: 'border-color .18s, box-shadow .18s',
              }}
            >
              <input
                type={revealed ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter password"
                autoFocus
                autoComplete="current-password"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fbf6f3', font: '400 1rem Inter, system-ui, sans-serif' }}
              />
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                aria-label={revealed ? 'Hide password' : 'Show password'}
                tabIndex={-1}
                className="flex-none grid place-items-center rounded-[11px] border-none cursor-pointer bg-transparent"
                style={{ width: 40, height: 40, color: revealed ? '#e98a90' : '#8d8488', transition: 'color .18s' }}
              >
                {revealed ? <EyeOff className="w-[21px] h-[21px]" /> : <Eye className="w-[21px] h-[21px]" />}
              </button>
            </div>

            {hasError && (
              <div className="flex items-center gap-[6px]" style={{ marginTop: 10, font: '500 0.78rem/1.3 Inter, system-ui, sans-serif', color: '#ff8d92' }}>
                <AlertCircle className="w-[13px] h-[13px] shrink-0" />
                That password didn’t match. Try again.
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full border-none cursor-pointer text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 54, marginTop: 16, borderRadius: 16, font: '600 1rem Inter, system-ui, sans-serif',
                background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 62%, #000))`,
                boxShadow: `0 8px 22px -6px ${rgba(accentRgb, 0.6)}`, transition: 'transform .12s',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isChecking ? (
                <>
                  <span className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                  Checking…
                </>
              ) : (
                <>
                  Unlock Portfolio
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-[7px]" style={{ marginTop: 18, font: '500 0.74rem Inter, system-ui, sans-serif', color: '#8d8488' }}>
            <Lock className="w-[13px] h-[13px]" style={{ color: '#c9a23a' }} />
            End-to-end private · powered by WiseResume
          </div>
        </div>
      </motion.div>
    </div>
  );
}
