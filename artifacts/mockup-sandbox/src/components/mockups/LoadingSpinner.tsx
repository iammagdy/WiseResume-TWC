import { useEffect, useState } from "react";

const css = `
  @keyframes spin-cw  { to { transform: rotate(360deg); } }
  @keyframes glow-pulse {
    0%, 100% { transform: scale(0.75); opacity: 0.4; }
    50%       { transform: scale(1.25); opacity: 1; }
  }
  @keyframes logo-breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.08); }
  }
  @keyframes dot-bounce {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-5px); }
  }
  @keyframes shimmer-text {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;

const LOGO_URL = "/__mockup/app-icon.png";

function Dots() {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "hsl(0 72% 55% / 0.7)",
            animation: `dot-bounce 0.9s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoadingSpinner() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{css}</style>

      {/* Arc ring + logo */}
      <div
        style={{
          position: "relative",
          width: 112,
          height: 112,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, hsl(0 72% 55% / 0.22) 0%, transparent 70%)",
            animation: "glow-pulse 3s ease-in-out infinite",
          }}
        />

        {/* Gradient arc spinner */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, hsl(0 72% 55%) 0deg, hsl(0 72% 55% / 0.35) 210deg, transparent 270deg, transparent 360deg)",
            animation: "spin-cw 1.25s linear infinite",
          }}
        />

        {/* Inner mask → turns circle into ring */}
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: "50%",
            background: "#0a0a0f",
          }}
        />

        {/* Logo */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            transition: "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s",
            transform: entered ? "scale(1)" : "scale(0.55)",
            opacity: entered ? 1 : 0,
          }}
        >
          <div style={{ animation: "logo-breathe 2.8s ease-in-out 0.6s infinite" }}>
            <img src={LOGO_URL} width={48} height={48} alt="WiseResume" style={{ borderRadius: 12 }} />
          </div>
        </div>
      </div>

      {/* Brand name + dots */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          transition: "opacity 0.45s 0.25s, transform 0.45s 0.25s",
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(10px)",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.22em",
            backgroundImage:
              "linear-gradient(90deg, hsl(0 72% 55%), hsl(0 72% 55% / 0.65), hsl(0 72% 55%))",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer-text 2.5s linear infinite",
          }}
        >
          WISERESUME
        </span>
        <Dots />
      </div>
    </div>
  );
}
