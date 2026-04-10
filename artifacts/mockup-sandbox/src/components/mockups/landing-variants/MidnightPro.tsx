import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Target, Wand2, Mic, PenTool, BarChart3, Check, ArrowRight, Star, Zap, Shield, Globe } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles, title: "AI Resume Writing",
    desc: "Turns vague job duties into quantified achievements that hiring managers remember.",
    accent: "#818cf8", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", size: "large"
  },
  {
    icon: Target, title: "ATS Score Analysis",
    desc: "Real-time match percentage against any job description. Fix gaps before you apply.",
    accent: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.3)", size: "small"
  },
  {
    icon: Wand2, title: "Smart Tailoring",
    desc: "Paste a JD and AI rewrites your resume to match in 30 seconds flat.",
    accent: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.3)", size: "small"
  },
  {
    icon: Mic, title: "Interview Coaching",
    desc: "Real voice AI practice. It listens, responds, and scores you live.",
    accent: "#f472b6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.3)", size: "small"
  },
  {
    icon: PenTool, title: "Cover Letters",
    desc: "Tailored cover letters that match your resume and the job requirements — instantly.",
    accent: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.3)", size: "small"
  },
  {
    icon: BarChart3, title: "Application Tracker",
    desc: "Your entire job search in one place — status, notes, and analytics.",
    accent: "#fb923c", bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.3)", size: "large"
  },
];

const FeatureIcon = ({ feature, size }: { feature: typeof FEATURES[0]; size: number }) => {
  const Icon = feature.icon;
  return <Icon size={size} color={feature.accent} />;
};

const ResumeCard = () => (
  <div style={{
    width: 320, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20,
    padding: 24, fontFamily: "sans-serif", color: "#fff",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#818cf8,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>A</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f0ff" }}>Alex Johnson</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Product Designer · San Francisco</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", borderRadius: 20, padding: "3px 10px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
        <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>92% ATS</span>
      </div>
    </div>

    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>AI Suggestion</div>
    <div style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textDecoration: "line-through", marginBottom: 6 }}>
        Worked on improving the app experience
      </div>
      <div style={{ fontSize: 12, color: "#c7d2fe", lineHeight: 1.5 }}>
        ↑ Redesigned onboarding flow, <strong style={{ color: "#818cf8" }}>reducing drop-off by 34%</strong> and increasing D7 retention to 61%
      </div>
    </div>

    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {["Figma", "Product Strategy", "User Research", "A/B Testing"].map(t => (
        <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}>{t}</span>
      ))}
    </div>
  </div>
);

const FloatingBadge = ({ style, text, color }: { style?: React.CSSProperties; text: string; color: string }) => (
  <div style={{
    position: "absolute", display: "flex", alignItems: "center", gap: 6,
    background: "rgba(10,10,20,0.85)", backdropFilter: "blur(12px)",
    border: `1px solid ${color}40`, borderRadius: 12, padding: "8px 14px",
    boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`,
    whiteSpace: "nowrap", ...style
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{text}</span>
  </div>
);

export function MidnightPro() {
  const [scrollY, setScrollY] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, e.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div style={{ minHeight: "100vh", background: "#060611", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes aurora1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.1)} 66%{transform:translate(-30px,60px) scale(0.95)} }
        @keyframes aurora2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-80px,30px) scale(1.05)} 66%{transform:translate(50px,-50px) scale(1.1)} }
        @keyframes aurora3 { 0%,100%{transform:translate(0,0) scale(1.05)} 50%{transform:translate(40px,40px) scale(0.9)} }
        @keyframes float { 0%,100%{transform:translateY(0px) rotate(-2deg)} 50%{transform:translateY(-16px) rotate(2deg)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes badgefloat1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes badgefloat2 { 0%,100%{transform:translateY(-6px)} 50%{transform:translateY(6px)} }
        @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:0.8} 100%{transform:scale(1.6);opacity:0} }
        .shimmer-btn { background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 30%, #a855f7 50%, #7c3aed 70%, #4f46e5 100%); background-size: 200% auto; animation: shimmer 3s linear infinite; }
        .fade-up { opacity:0; transform:translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .fade-up.visible { opacity:1; transform:translateY(0); }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); }

        /* RESPONSIVE */
        .mp-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .mp-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: auto auto; gap: 16px; }
        .mp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
        .mp-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
        .mp-bento-large { grid-column: span 2; }
        .mp-badges { display: block; }
        .mp-card-visual { display: flex; justify-content: center; align-items: center; height: 480px; }
        .mp-nav { display: flex; }

        @media (max-width: 900px) {
          .mp-hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .mp-feature-grid { grid-template-columns: 1fr 1fr; }
          .mp-bento-large { grid-column: span 2; }
          .mp-pricing-grid { grid-template-columns: 1fr; gap: 12px; }
          .mp-card-visual { height: 380px; }
        }

        @media (max-width: 640px) {
          .mp-hero-grid { grid-template-columns: 1fr; gap: 32px; }
          .mp-feature-grid { grid-template-columns: 1fr; }
          .mp-bento-large { grid-column: span 1; }
          .mp-pricing-grid { grid-template-columns: 1fr; }
          .mp-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .mp-badges { display: none; }
          .mp-card-visual { height: 300px; }
          .mp-nav { display: none; }
        }
      `}</style>

      {/* AURORA BACKGROUND */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: "60%", height: "60%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 70%)", animation: "aurora1 18s ease-in-out infinite", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "30%", right: "-20%", width: "55%", height: "55%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(168,85,247,0.3) 0%, transparent 70%)", animation: "aurora2 22s ease-in-out infinite", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "20%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(59,130,246,0.2) 0%, transparent 70%)", animation: "aurora3 26s ease-in-out infinite", filter: "blur(70px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* HEADER */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? "rgba(6,6,17,0.85)" : "transparent",
        backdropFilter: scrollY > 60 ? "blur(20px)" : "none",
        borderBottom: scrollY > 60 ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "all 0.3s ease"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>WiseResume</span>
          </div>
          <nav className="mp-nav" style={{ gap: 32, alignItems: "center" }}>
            {["Features", "Pricing"].map(l => (
              <a key={l} href="#" style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>{l}</a>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => {}} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", padding: "8px 16px" }}>Sign In</button>
            <button onClick={() => {}} className="shimmer-btn" style={{ color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}>
              Get Started Free
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 100 }}>
        <div className="mp-hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
          {/* Left: Text */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 8px #818cf8" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.02em" }}>AI-Powered Career Platform</span>
            </div>

            <h1 style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-2px", margin: "0 0 24px" }}>
              Land your dream<br />job with a{" "}
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={{ background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #e879f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  perfect resume
                </span>
                <span style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #818cf8, #e879f9)", borderRadius: 2, opacity: 0.6 }} />
              </span>
            </h1>

            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
              AI builds, tailors, and optimizes your resume for every job posting in seconds. Join professionals who get more interviews.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
              <button onClick={() => {}} className="shimmer-btn" style={{ color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}>
                Get Started Free <ArrowRight size={18} />
              </button>
              <button onClick={() => {}} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                Sign In
              </button>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {["Free to start", "No credit card", "AI-powered"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                  <Check size={14} color="#818cf8" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Floating UI */}
          <div className="mp-card-visual" style={{ position: "relative" }}>
            <div style={{ animation: "float 6s ease-in-out infinite", position: "relative" }}>
              <ResumeCard />
              <div style={{ position: "absolute", inset: -1, borderRadius: 21, background: "linear-gradient(135deg, rgba(99,102,241,0.3), transparent, rgba(168,85,247,0.2))", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 20, boxShadow: "0 0 60px rgba(99,102,241,0.25), 0 0 120px rgba(168,85,247,0.12)", pointerEvents: "none" }} />
            </div>
            <div className="mp-badges" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <FloatingBadge text="ATS Score: 92%" color="#34d399" style={{ top: 30, right: -20, animation: "badgefloat1 4s ease-in-out infinite" }} />
              <FloatingBadge text="Interview Ready" color="#818cf8" style={{ bottom: 80, left: -30, animation: "badgefloat2 5s ease-in-out infinite" }} />
              <FloatingBadge text="Tailored in 30s" color="#f472b6" style={{ bottom: 20, right: 10, animation: "badgefloat1 6s ease-in-out infinite 1s" }} />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div className="mp-stat-grid" style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
          {[
            { value: "50K+", label: "Resumes Created", color: "#818cf8" },
            { value: "92%", label: "ATS Pass Rate", color: "#34d399" },
            { value: "4.8★", label: "User Rating", color: "#fbbf24" },
            { value: "30s", label: "Avg. Tailor Time", color: "#f472b6" },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "8px 0", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: s.color, letterSpacing: "-1px", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — Bento Grid */}
      <section
        id="features-section"
        ref={setRef("features-section")}
        style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>PLATFORM</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 16 }}>Everything you need<br />to get hired</h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}>Powerful AI tools built for every step of the job search — from your first resume to your final offer.</p>
        </div>

        {/* Bento grid */}
        <div className="mp-feature-grid">
          {/* Large card top-left */}
          <div
            className="card-hover mp-bento-large"
            onMouseEnter={() => setHoveredFeature(0)}
            onMouseLeave={() => setHoveredFeature(null)}
            style={{ padding: 36, borderRadius: 20, background: FEATURES[0].bg, border: `1px solid ${hoveredFeature === 0 ? FEATURES[0].border : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.3s", cursor: "default" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${FEATURES[0].accent}20`, border: `1px solid ${FEATURES[0].accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <FeatureIcon feature={FEATURES[0]} size={24} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.5px" }}>{FEATURES[0].title}</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, maxWidth: 380 }}>{FEATURES[0].desc}</p>
            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: `${FEATURES[0].accent}15`, border: `1px solid ${FEATURES[0].accent}30`, color: FEATURES[0].accent }}>GPT-4o Powered</span>
              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>Instant results</span>
            </div>
          </div>

          {/* Small cards */}
          {FEATURES.slice(1, 5).map((f, idx) => (
            <div
              key={f.title}
              className="card-hover"
              onMouseEnter={() => setHoveredFeature(idx + 1)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{ padding: 28, borderRadius: 20, background: f.bg, border: `1px solid ${hoveredFeature === idx + 1 ? f.border : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.3s", cursor: "default" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${f.accent}20`, border: `1px solid ${f.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={20} color={f.accent} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}

          {/* Large card bottom-right */}
          <div
            className="card-hover mp-bento-large"
            onMouseEnter={() => setHoveredFeature(5)}
            onMouseLeave={() => setHoveredFeature(null)}
            style={{ padding: 36, borderRadius: 20, background: FEATURES[5].bg, border: `1px solid ${hoveredFeature === 5 ? FEATURES[5].border : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.3s", cursor: "default" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${FEATURES[5].accent}20`, border: `1px solid ${FEATURES[5].accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <FeatureIcon feature={FEATURES[5]} size={24} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.5px" }}>{FEATURES[5].title}</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, maxWidth: 380 }}>{FEATURES[5].desc}</p>
            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: `${FEATURES[5].accent}15`, border: `1px solid ${FEATURES[5].accent}30`, color: FEATURES[5].accent }}>Visual Pipeline</span>
              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>Analytics included</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0 auto", padding: "80px 24px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>PRICING</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1.2px", marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)" }}>Start free. Upgrade when you need more power.</p>
        </div>

        <div className="mp-pricing-grid">
          {[
            { name: "Free", price: "$0", period: "/forever", desc: "Perfect to get started", features: ["1 resume", "Basic AI suggestions", "ATS score check", "PDF export"], cta: "Get Started", highlight: false },
            { name: "Pro", price: "$9", period: "/mo", desc: "For serious job seekers", features: ["Unlimited resumes", "Advanced AI tools", "Smart tailoring", "Interview coaching", "Cover letter generator", "Application tracker"], cta: "Get Pro", highlight: true },
            { name: "Premium", price: "$19", period: "/mo", desc: "For career professionals", features: ["Everything in Pro", "Custom branding", "Analytics dashboard", "White-label exports", "Early access features", "Dedicated support"], cta: "Get Premium", highlight: false, special: true },
          ].map((plan) => (
            <div key={plan.name} style={{
              padding: 28, borderRadius: 20,
              background: plan.highlight ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
              border: plan.highlight ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.07)",
              position: "relative", transform: plan.highlight ? "scale(1.04)" : "none",
              boxShadow: plan.highlight ? "0 0 60px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.08)" : "none"
            }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 20, padding: "4px 16px", fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ marginBottom: 4, fontSize: 16, fontWeight: 700, color: plan.highlight ? "#c7d2fe" : "#fff" }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                <span style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-2px", color: plan.highlight ? "#818cf8" : "#fff" }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>{plan.desc}</div>
              <button onClick={() => {}} style={{
                width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 22, border: "none",
                background: plan.highlight ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.07)",
                color: "#fff",
                boxShadow: plan.highlight ? "0 0 24px rgba(99,102,241,0.4)" : "none"
              }}>{plan.cta}</button>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                    <Check size={14} color={plan.highlight ? "#818cf8" : "#4ade80"} style={{ flexShrink: 0 }} />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px 120px" }}>
        <div style={{ borderRadius: 28, padding: "72px 48px", textAlign: "center", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", position: "relative", overflow: "hidden", boxShadow: "0 0 80px rgba(99,102,241,0.12)" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 16, position: "relative" }}>
            Start building your perfect<br />
            <span style={{ background: "linear-gradient(135deg, #818cf8, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>resume today</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", marginBottom: 36, position: "relative" }}>Join thousands of professionals who get more interviews with WiseResume.</p>
          <button onClick={() => {}} className="shimmer-btn" style={{ color: "#fff", border: "none", padding: "16px 40px", borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, boxShadow: "0 0 50px rgba(99,102,241,0.5)", position: "relative" }}>
            Get Started for Free <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* INSTALL CTA */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ borderRadius: 20, padding: "40px 32px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99,102,241,0.4)", flexShrink: 0 }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Install WiseResume on your device</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Access your resumes and AI tools anytime — even offline. Works on iOS, Android & desktop.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => {}} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              📱 Add to Home Screen
            </button>
            <button onClick={() => {}} className="shimmer-btn" style={{ color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              ⬇ Install App
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>WiseResume</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>© {new Date().getFullYear()} WiseResume · The intelligent career co-pilot</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MidnightPro;
