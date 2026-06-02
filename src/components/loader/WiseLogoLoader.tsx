import partW from "./wise-loader-assets/part-w.png";
import partSep from "./wise-loader-assets/part-sep.png";
import partText from "./wise-loader-assets/part-text.png";
import partBadge from "./wise-loader-assets/part-badge.png";

/**
 * WiseLogoLoader
 * The single, brand-aware loading visual for the app.
 *
 * Two render modes, chosen automatically by size:
 *  - **Full logo** (>= 48px): the Wise logo's real parts pop into place, hold,
 *    fade out, and repeat. Pure CSS animation, no deps.
 *  - **Compact ring** (< 48px): a clean brand-coloured spinner ring. Used for
 *    button/icon loaders where the multi-part logo would be illegible and would
 *    pull ~650KB of PNGs into a tiny slot.
 *
 * Brand-aware: `variant="wisehire"` recolours everything blue; `"wiseresume"`
 * (default) is red. When `variant` is omitted the brand is auto-detected from
 * the current route (the same `/wisehire`, `/enterprises`, `?for=companies`
 * signals the splash and PageLoadingSpinner already use), so inline spinners
 * inside WiseHire areas pick up blue without callers threading a prop.
 *
 *   <WiseLogoLoader size="xs" />                  // 16px ring (icon button)
 *   <WiseLogoLoader size="sm" />                  // 20px ring (button)
 *   <WiseLogoLoader size="md" />                  // 96px logo (card/panel)
 *   <WiseLogoLoader size="lg" />                  // 160px logo (page)
 *   <WiseLogoLoader size={200} variant="wisehire" />
 */

export type WiseLoaderVariant = "wiseresume" | "wisehire";
export type WiseLoaderSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_TOKENS: Record<WiseLoaderSize, number> = {
  xs: 16, // small icon buttons
  sm: 20, // normal buttons
  md: 96, // cards / panels
  lg: 160, // page loading
  xl: 200, // hero / splash
};

// At/below this px the full multi-part logo is illegible and heavy, so we
// render the compact ring instead.
const COMPACT_MAX = 44;

type BrandStyle = {
  /** ring + accent colour */
  ring: string;
  /** ring track (low-alpha brand) */
  track: string;
  /** rounded-square background gradient for the full logo */
  bg: string;
  /** filter applied to the (red) PNG parts to recolour them; undefined = none */
  filter?: string;
};

// WiseHire reuses the same red logo art recoloured to blue via the same
// hue-rotate filter the app already applies to AppIcon in WiseHire areas.
const BRAND: Record<WiseLoaderVariant, BrandStyle> = {
  wiseresume: {
    ring: "#9E1B22",
    track: "rgba(158,27,34,0.18)",
    bg: "radial-gradient(125% 120% at 28% 18%, #c4262e 0%, #9E1B22 52%, #7c1319 100%)",
    filter: undefined,
  },
  wisehire: {
    ring: "#1D4ED8",
    track: "rgba(29,78,216,0.18)",
    bg: "radial-gradient(125% 120% at 28% 18%, #3b82f6 0%, #1D4ED8 52%, #1e3a8a 100%)",
    filter: "hue-rotate(220deg) saturate(2) brightness(0.85)",
  },
};

/** Auto-detect brand from the current route when no `variant` prop is given. */
export function detectWiseVariant(): WiseLoaderVariant {
  if (typeof window === "undefined") return "wiseresume";
  const path = window.location.pathname;
  if (path.startsWith("/wisehire") || path === "/enterprises") return "wisehire";
  if (new URLSearchParams(window.location.search).get("for") === "companies") return "wisehire";
  return "wiseresume";
}

type Part = {
  k: string;
  x: number; y: number; w: number; h: number; z: number;
  img?: string;
};

// layout is authored on a 200×200 grid, then scaled by `size`
const PARTS: Part[] = [
  { k: "bg",    x: 0,   y: 0,   w: 200, h: 200,  z: 1 },
  { k: "paper", x: 42,  y: 26,  w: 120, h: 150,  z: 2 },
  { k: "w",     x: 65,  y: 56,  w: 72,  h: 61,   z: 3, img: partW },
  { k: "sep",   x: 57,  y: 128, w: 90,  h: 8.8,  z: 3, img: partSep },
  { k: "text",  x: 53,  y: 144, w: 98,  h: 23.2, z: 3, img: partText },
  { k: "badge", x: 130, y: 6,   w: 68,  h: 68,   z: 4, img: partBadge },
];

export type WiseLogoLoaderProps = {
  /** named token (xs|sm|md|lg|xl) or rendered px (square). Default "lg". */
  size?: WiseLoaderSize | number;
  /** brand styling. Omit to auto-detect from the current route. */
  variant?: WiseLoaderVariant;
  /** loop duration in ms (full-logo mode only). Default 3800. */
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function WiseLogoLoader({
  size = "lg",
  variant,
  durationMs = 3800,
  className,
  style,
}: WiseLogoLoaderProps) {
  const px = typeof size === "number" ? size : SIZE_TOKENS[size];
  const brand = BRAND[variant ?? detectWiseVariant()];

  // Small slots get the clean compact ring instead of the heavy logo.
  if (px <= COMPACT_MAX) {
    const bw = Math.max(1.5, px * 0.12);
    return (
      <span
        className={className}
        role="status"
        aria-label="Loading"
        style={{
          position: "relative",
          display: "inline-flex",
          width: px,
          height: px,
          ...style,
        }}
      >
        <span
          data-wll-ring
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: `${bw}px solid ${brand.track}`,
            borderTopColor: brand.ring,
            animation: "wiseRingSpin 0.7s linear infinite",
          }}
        />
        <style>{ringCss}</style>
      </span>
    );
  }

  const u = px / 200;

  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
      style={{ position: "relative", width: px, height: px, ...style }}
    >
      <style>{asmCss}</style>
      {PARTS.map((p, i) => {
        const sgn = i % 2 ? 1 : -1;
        const base: React.CSSProperties = {
          position: "absolute",
          left: p.x * u,
          top: p.y * u,
          width: p.w * u,
          height: p.h * u,
          zIndex: p.z,
          transformOrigin: "center",
          willChange: "transform, opacity",
          // custom props consumed by the @keyframes below
          ["--rot" as any]: `${sgn * 9}deg`,
          animation: `wiseAsm ${durationMs}ms cubic-bezier(.34,1.56,.64,1) ${(-i * 0.11 * (durationMs / 3800)).toFixed(3)}s infinite`,
        };

        if (p.k === "bg")
          return <div key={p.k} className="wll-bg" style={{ ...base, background: brand.bg }} />;
        if (p.k === "paper")
          return (
            <div key={p.k} className="wll-paper" style={base}>
              <span className="wll-fold" />
            </div>
          );
        return (
          <div key={p.k} style={base}>
            <img
              src={p.img}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter: brand.filter,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

const ringCss = `
@keyframes wiseRingSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  [data-wll-ring] { animation-duration: 1.6s !important; }
}
`;

const asmCss = `
@keyframes wiseAsm {
  0%   { transform: rotate(var(--rot)) scale(0); opacity: 0; }
  22%  { transform: rotate(0deg) scale(1); opacity: 1; }
  70%  { transform: rotate(0deg) scale(1); opacity: 1; }
  100% { transform: rotate(var(--rot)) scale(0); opacity: 0; }
}
.wll-bg {
  border-radius: 27%;
  box-shadow:
    inset 0 3px 7px rgba(255,255,255,0.22),
    inset 0 -10px 22px rgba(0,0,0,0.30),
    0 16px 30px -12px rgba(120,18,24,0.55);
}
.wll-paper {
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(150deg, #ffffff 0%, #f0f0f1 100%);
  box-shadow: 0 8px 16px -6px rgba(0,0,0,0.28), inset 0 1px 0 #fff;
}
.wll-fold {
  position: absolute; top: 0; right: 0; width: 30px; height: 30px;
  background: linear-gradient(225deg, #dcdcdf 0%, #dcdcdf 48%, transparent 49%);
  border-bottom-left-radius: 10px;
}
@media (prefers-reduced-motion: reduce) {
  .wll-bg, .wll-paper, [class] > img { animation: none !important; }
}
`;
