import type { Meta, StoryObj } from "@storybook/react";

function SpacingDoc() {
  const cards = [
    { padding: "p-3", label: "p-3 — Compact card" },
    { padding: "p-4", label: "p-4 — Standard card (.p-card)" },
    { padding: "p-6", label: "p-6 — Spacious card" },
  ];

  const gaps = [
    { gap: "gap-2", label: "gap-2 — Tight" },
    { gap: "gap-3", label: "gap-3 — Standard" },
    { gap: "gap-4", label: "gap-4 — Comfortable" },
    { gap: "gap-6", label: "gap-6 — Loose" },
  ];

  return (
    <div className="p-8 bg-background min-w-[640px] space-y-10">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Spacing & Layout</h1>
        <p className="text-sm text-muted-foreground">
          WiseResume uses a mobile-first spacing system with semantic utilities for consistent layout.
        </p>
      </div>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Card Padding</p>
        <div className="space-y-3">
          {cards.map(({ padding, label }) => (
            <div key={padding} className={`glass-card rounded-xl ${padding} border-2 border-dashed border-primary/30`}>
              <p className="text-sm font-mono text-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flex Gaps</p>
        <div className="space-y-4">
          {gaps.map(({ gap, label }) => (
            <div key={gap} className={`flex ${gap}`}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs text-primary">{i}</span>
                </div>
              ))}
              <span className="text-xs text-muted-foreground self-center ml-2">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semantic Utilities</p>
        <div className="space-y-2">
          {[
            { cls: ".px-edge", def: "px-3 md:px-4", use: "Page horizontal padding" },
            { cls: ".space-section", def: "mb-4 md:mb-6", use: "Between major sections" },
            { cls: ".p-card", def: "p-3 md:p-4", use: "Default card padding" },
            { cls: ".px-mobile", def: "px-4 sm:px-6 lg:px-8", use: "Responsive horizontal padding" },
            { cls: ".container-responsive", def: "w-full mx-auto + max 1280px", use: "Full-width responsive container" },
          ].map(({ cls, def, use }) => (
            <div key={cls} className="glass-surface rounded-lg p-3 flex gap-4">
              <p className="text-sm font-mono text-primary w-40 shrink-0">{cls}</p>
              <p className="text-xs font-mono text-muted-foreground w-48 shrink-0">{def}</p>
              <p className="text-xs text-foreground">{use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakpoints</p>
        <div className="space-y-1.5">
          {[
            { bp: "xs", w: "375px", note: "Small phones" },
            { bp: "sm", w: "640px", note: "Large phones / small tablets" },
            { bp: "md", w: "768px", note: "Tablets" },
            { bp: "lg", w: "1024px", note: "Small desktops" },
            { bp: "xl", w: "1280px", note: "Desktops" },
            { bp: "2xl", w: "1400px", note: "Large desktops" },
          ].map(({ bp, w, note }) => (
            <div key={bp} className="flex items-center gap-4 glass-surface rounded-lg px-3 py-2">
              <span className="text-sm font-mono text-primary w-8">{bp}</span>
              <span className="text-xs font-mono text-foreground w-16">{w}</span>
              <span className="text-xs text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Spacing",
  component: SpacingDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
