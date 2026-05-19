import type { Meta, StoryObj } from "@storybook/react";
import { PORTFOLIO_THEMES } from "@/lib/portfolioThemes";

function ThemeCard({ theme }: { theme: typeof PORTFOLIO_THEMES[number] }) {
  const { preview, name, description, category, isNew, layout, animation, typography } = theme;
  const isLight = preview.bg.startsWith("#f") || preview.bg === "#ffffff" || preview.bg === "#fefefe";
  const borderColor = theme.colors.border;
  const textSecondary = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";

  return (
    <div
      style={{ background: preview.bg, border: `1px solid ${borderColor}`, color: preview.text }}
      className="rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm" style={{ fontFamily: typography.headingFont }}>
            {name}
          </p>
          <p className="text-[10px]" style={{ color: textSecondary }}>
            {category} · {layout.cardVariant} · {animation}
          </p>
        </div>
        <div className="flex gap-1">
          {isNew && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: preview.accent, color: isLight ? "#fff" : "#000", opacity: 0.9 }}>
              NEW
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px]" style={{ color: textSecondary }}>{description}</p>
      <div className="flex gap-2">
        <span className="text-[11px] px-2 py-1 rounded-md font-medium"
          style={{ background: preview.accent, color: "#fff" }}>
          Primary CTA
        </span>
        <span className="text-[11px] px-2 py-1 rounded-md border font-medium"
          style={{ borderColor: preview.accent, color: preview.accent }}>
          Secondary
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {(["bg", "accent", "card", "text"] as const).map(key => (
          <span key={key} className="flex items-center gap-1 text-[9px]" style={{ color: textSecondary }}>
            <span className="w-2.5 h-2.5 rounded-full border border-white/10 inline-block"
              style={{ background: key === "text" ? preview.text : preview[key] }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

function PortfolioThemesDoc() {
  const categories = ["all", "developer", "creative", "corporate", "freelancer"] as const;
  return (
    <div className="p-8 bg-background min-w-[760px] space-y-8">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Portfolio Themes</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Applied via <code className="text-xs bg-muted px-1 py-0.5 rounded">buildThemeCSSVars(theme, userAccent?)</code> which sets{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">--pf-bg --pf-fg --pf-card --pf-border --pf-muted --pf-accent --pf-heading-font --pf-body-font --pf-heading-weight --pf-card-radius</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          Defined in <code className="bg-muted px-1 py-0.5 rounded">portfolioThemes.ts</code> · Applied/cleaned by{" "}
          <code className="bg-muted px-1 py-0.5 rounded">usePortfolioSEO.ts</code> · {PORTFOLIO_THEMES.length} themes total
        </p>
      </div>

      {categories.map(cat => {
        const themes = cat === "all"
          ? PORTFOLIO_THEMES.filter(t => t.category === "all")
          : PORTFOLIO_THEMES.filter(t => t.category === cat);
        if (themes.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {cat === "all" ? "Universal" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {themes.map(t => <ThemeCard key={t.id} theme={t} />)}
            </div>
          </section>
        );
      })}

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">buildThemeCSSVars API</p>
        <div className="bg-muted rounded-lg p-4 space-y-1.5 font-mono text-xs text-foreground">
          <p><span className="text-primary">import</span> {"{ buildThemeCSSVars, getThemeById }"} <span className="text-primary">from</span> <span className="text-accent-foreground">'@/lib/portfolioThemes'</span>;</p>
          <p className="mt-2 text-muted-foreground">{"// Apply theme CSS variables to the portfolio root element"}</p>
          <p><span className="text-primary">const</span> theme = getThemeById(<span className="text-accent-foreground">'developer-terminal'</span>)!;</p>
          <p><span className="text-primary">const</span> vars = buildThemeCSSVars(theme, userAccentOverride);</p>
          <p><span className="text-muted-foreground">{"// Returns React.CSSProperties — spread onto style prop"}</span></p>
          <p>{"<div style={vars}>…</div>"}</p>
        </div>
      </section>

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
            <div key={base} className="bg-muted rounded-lg p-3 flex gap-4 text-xs">
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
