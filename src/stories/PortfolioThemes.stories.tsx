import type { Meta, StoryObj } from "@storybook/react";

function ThemeCard({ title, desc, accent, bg, border, text }: {
  title: string; desc: string;
  accent: string; bg: string; border: string; text: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, color: text }}
      className="rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{title}</p>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: accent, color: "#fff" }}>
          Theme
        </span>
      </div>
      <p className="text-xs opacity-70">{desc}</p>
      <div className="flex gap-2">
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: accent, color: "#fff" }}>
          Primary CTA
        </span>
        <span className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: accent, color: accent }}>
          Secondary
        </span>
      </div>
    </div>
  );
}

function PortfolioThemesDoc() {
  return (
    <div className="p-8 bg-background min-w-[700px] space-y-8">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Portfolio Themes</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Applied via <code className="text-xs bg-muted px-1 py-0.5 rounded">data-theme</code> on{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;html&gt;</code>.
          Each theme sets <code className="text-xs bg-muted px-1 py-0.5 rounded">--pf-accent</code> and related variables.
        </p>
        <p className="text-xs text-muted-foreground">
          Defined in <code className="bg-muted px-1 py-0.5 rounded">portfolioThemes.ts</code> · Applied/cleaned by{" "}
          <code className="bg-muted px-1 py-0.5 rounded">usePortfolioSEO.ts</code>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ThemeCard
          title="Minimal"
          desc="Clean whitespace-heavy layout. Light backgrounds, subtle borders, refined typography."
          accent="#2563eb"
          bg="#ffffff"
          border="#e5e7eb"
          text="#111827"
        />
        <ThemeCard
          title="Developer Terminal"
          desc="Dark background, monospace font, terminal-green accent. Scanline hover effects."
          accent="#9ce66a"
          bg="#0d1117"
          border="rgba(255,255,255,0.08)"
          text="#e6edf3"
        />
        <ThemeCard
          title="Neon Cyber"
          desc="Dark base with neon glowing borders and pulsing accent. Holographic shimmer overlays."
          accent="#a855f7"
          bg="#0a0a14"
          border="rgba(168,85,247,0.25)"
          text="#f0e6ff"
        />
        <ThemeCard
          title="Creative Spotlight"
          desc="Light, warm background with bold typography and hover scale effects."
          accent="#f97316"
          bg="#faf9f6"
          border="rgba(0,0,0,0.08)"
          text="#1a1a1a"
        />
      </div>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scroll-Triggered Animation Classes</p>
        <div className="space-y-1.5">
          {[
            { base: ".pf-exp-card", trigger: ".pf-card-revealed", effect: "Slide-up (mobile) / slide-left (desktop)" },
            { base: ".pf-skill-tag", trigger: ".pf-skill-revealed", effect: "Spring pop-in" },
            { base: ".pf-bio-line-inner", trigger: ".pf-bio-revealed", effect: "Line-by-line text reveal" },
            { base: ".pf-section-title", trigger: ".title-revealed", effect: "Underline draws left-to-right" },
            { base: ".pf-section-line", trigger: ".pf-section-line-drawn", effect: "Divider scaleX 0→1" },
            { base: ".pf-timeline-dot", trigger: ".pf-dot-visible", effect: "Scale pop on scroll" },
            { base: ".pf-stats-strip", trigger: ".pf-stats-visible", effect: "Fade + slide up" },
          ].map(({ base, trigger, effect }) => (
            <div key={base} className="glass-surface rounded-lg p-3 flex gap-4 text-xs">
              <span className="font-mono text-primary w-36 shrink-0">{base}</span>
              <span className="font-mono text-accent w-40 shrink-0">{trigger}</span>
              <span className="text-muted-foreground">{effect}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Portfolio Themes",
  component: PortfolioThemesDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
