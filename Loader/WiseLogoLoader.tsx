import partW from "./wise-loader-assets/part-w.png";
import partSep from "./wise-loader-assets/part-sep.png";
import partText from "./wise-loader-assets/part-text.png";
import partBadge from "./wise-loader-assets/part-badge.png";

/**
 * WiseLogoLoader
 * Indeterminate loader: the Wise AI logo's real parts (red bg, paper, W,
 * separator, "WISE Ai" text, AI star badge) pop into place, hold, then
 * fade out and repeat. Pure CSS animation — no deps.
 *
 *   <WiseLogoLoader size={120} />
 *   <WiseLogoLoader size={200} durationMs={3200} />
 *
 * For a full-screen overlay, wrap it:
 *   <div className="fixed inset-0 grid place-items-center bg-background/80 backdrop-blur-sm z-50">
 *     <WiseLogoLoader size={160} />
 *   </div>
 */

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
  /** rendered size in px (square). Default 200. */
  size?: number;
  /** loop duration in ms. Default 3800. */
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function WiseLogoLoader({
  size = 200,
  durationMs = 3800,
  className,
  style,
}: WiseLogoLoaderProps) {
  const u = size / 200;

  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
      style={{ position: "relative", width: size, height: size, ...style }}
    >
      <style>{css}</style>
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

        if (p.k === "bg") return <div key={p.k} className="wll-bg" style={base} />;
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
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        );
      })}
    </div>
  );
}

const css = `
@keyframes wiseAsm {
  0%   { transform: rotate(var(--rot)) scale(0); opacity: 0; }
  22%  { transform: rotate(0deg) scale(1); opacity: 1; }
  70%  { transform: rotate(0deg) scale(1); opacity: 1; }
  100% { transform: rotate(var(--rot)) scale(0); opacity: 0; }
}
.wll-bg {
  border-radius: 27%;
  background: radial-gradient(125% 120% at 28% 18%, #c4262e 0%, #9E1B22 52%, #7c1319 100%);
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
