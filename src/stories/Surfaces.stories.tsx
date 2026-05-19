import type { Meta, StoryObj } from "@storybook/react";

function SurfacesDoc() {
  const surfaces = [
    { cls: "glass", label: ".glass", desc: "bg-card + border + shadow-soft — general elevated surface" },
    { cls: "glass-card", label: ".glass-card", desc: "bg-card + border + slightly deeper shadow — card containers" },
    { cls: "glass-surface", label: ".glass-surface", desc: "bg-card + border — flat panels" },
    { cls: "glass-elevated", label: ".glass-elevated", desc: "bg-card + border + shadow-soft-md — modals, popovers" },
    { cls: "glass-header", label: ".glass-header", desc: "bg-background/95 + backdrop-blur + border-bottom — sticky headers" },
  ];

  return (
    <div className="p-8 bg-background space-y-6 min-w-[640px]">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Surface System</h1>
        <p className="text-sm text-muted-foreground">
          All <code className="text-xs bg-muted px-1 py-0.5 rounded">.glass-*</code> surfaces render solid
          token-based backgrounds. Backdrop-filter is disabled in native WebView.
        </p>
      </div>
      <div className="space-y-3">
        {surfaces.map(({ cls, label, desc }) => (
          <div key={cls} className={`${cls} rounded-xl p-4`}>
            <p className="text-sm font-semibold text-foreground font-mono">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Glow & Shadow Effects</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4 glow-primary">
            <p className="text-sm font-medium text-foreground font-mono">.glow-primary</p>
            <p className="text-xs text-muted-foreground">Primary color drop shadow</p>
          </div>
          <div className="glass-card rounded-xl p-4 glow-accent">
            <p className="text-sm font-medium text-foreground font-mono">.glow-accent</p>
            <p className="text-xs text-muted-foreground">Accent color drop shadow</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-glow">
            <p className="text-sm font-medium text-foreground font-mono">.border-glow</p>
            <p className="text-xs text-muted-foreground">Gradient border via CSS mask</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-glow border-glow-pulse">
            <p className="text-sm font-medium text-foreground font-mono">.border-glow-pulse</p>
            <p className="text-xs text-muted-foreground">Animated border glow</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Surfaces",
  component: SurfacesDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
