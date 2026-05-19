import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function MotionDoc() {
  const [key, setKey] = useState(0);

  const cssAnimations = [
    { cls: "animate-fade-in", label: "animate-fade-in", dur: "0.5s ease-out" },
    { cls: "animate-slide-up", label: "animate-slide-up", dur: "0.6s ease-out" },
    { cls: "animate-scale-in", label: "animate-scale-in", dur: "0.3s ease-out" },
    { cls: "animate-float", label: "animate-float", dur: "3s ease-in-out infinite" },
  ];

  const loopAnimations = [
    { cls: "animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]", label: "animate-shimmer", dur: "2s linear infinite" },
    { cls: "animate-pulse-glow glow-primary", label: "animate-pulse-glow", dur: "2s ease-in-out infinite" },
    { cls: "animate-bounce-gentle", label: "animate-bounce-gentle", dur: "1.5s ease-in-out infinite" },
  ];

  const easings = [
    { label: "Spring snap", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Badges, popups, skill tags" },
    { label: "Smooth decelerate", value: "cubic-bezier(0.22, 1, 0.36, 1)", use: "Cards, panels, slides" },
    { label: "Ease-out", value: "ease-out", use: "Entrances" },
    { label: "Ease-in", value: "ease-in", use: "Exits" },
    { label: "Linear", value: "linear", use: "Marquees, loops" },
  ];

  return (
    <div className="p-8 bg-background min-w-[700px] space-y-10">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Motion & Animation</h1>
        <p className="text-sm text-muted-foreground mb-4">
          All interactive animations use <strong>framer-motion</strong>. CSS keyframes are used for continuous/ambient effects.
          All respect <code className="text-xs bg-muted px-1 py-0.5 rounded">prefers-reduced-motion</code>.
        </p>
        <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
          Replay entrances
        </Button>
      </div>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entrance Animations</p>
        <div key={key} className="grid grid-cols-2 gap-3">
          {cssAnimations.map(({ cls, label, dur }) => (
            <div key={label} className={`${cls} glass-card rounded-xl p-4`}>
              <p className="text-sm font-medium text-foreground font-mono">{label}</p>
              <p className="text-xs text-muted-foreground">{dur}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Continuous Animations</p>
        <div className="grid grid-cols-2 gap-3">
          {loopAnimations.map(({ cls, label, dur }) => (
            <div key={label} className={`${cls} glass-card rounded-xl p-4`}>
              <p className="text-sm font-medium text-foreground font-mono">{label}</p>
              <p className="text-xs text-muted-foreground">{dur}</p>
            </div>
          ))}
          <div className="glass-card rounded-xl p-4">
            <p className="text-shimmer text-sm font-semibold">text-shimmer</p>
            <p className="text-xs text-muted-foreground">4s linear infinite</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Easing Reference</p>
        <div className="space-y-2">
          {easings.map(({ label, value, use }) => (
            <div key={label} className="glass-surface rounded-lg p-3 flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs font-mono text-primary">{value}</p>
              <p className="text-xs text-muted-foreground">Use: {use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reduced Motion Rule</p>
        <div className="glass-surface rounded-xl p-4 border-l-4 border-warning">
          <p className="text-sm font-medium text-foreground mb-1">CSS keyframes do NOT auto-respect reduced motion</p>
          <p className="text-xs text-muted-foreground">
            Always add <code className="bg-muted px-1 py-0.5 rounded">@media (prefers-reduced-motion: reduce)</code> overrides,
            or check <code className="bg-muted px-1 py-0.5 rounded">useReducedMotion()</code> from framer-motion before
            triggering JS animations. The global index.css rule collapses all durations to 0.01ms automatically.
          </p>
        </div>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Motion",
  component: MotionDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
