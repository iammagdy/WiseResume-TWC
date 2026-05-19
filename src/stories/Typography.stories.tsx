import type { Meta, StoryObj } from "@storybook/react";

function TypographyDoc() {
  return (
    <div className="p-8 bg-background max-w-2xl space-y-10">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Typography</h1>
        <p className="text-sm text-muted-foreground">
          Font: <strong>Inter</strong>. Base size: 16px. All semantic utilities are defined in{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/index.css</code>.
        </p>
      </div>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semantic Headings</p>
        <div className="space-y-3 border-l-2 border-border pl-4">
          <div>
            <p className="text-h1 text-foreground">.text-h1</p>
            <p className="text-xs text-muted-foreground">clamp(1.75rem, 7vw, 2.25rem) · font-semibold · tracking-tight</p>
          </div>
          <div>
            <p className="text-h2 text-foreground">.text-h2</p>
            <p className="text-xs text-muted-foreground">text-2xl · font-semibold</p>
          </div>
          <div>
            <p className="text-h3 text-foreground">.text-h3</p>
            <p className="text-xs text-muted-foreground">text-xl · font-semibold</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">App Utilities</p>
        <div className="space-y-3 border-l-2 border-border pl-4">
          <div>
            <p className="text-page-title text-foreground">.text-page-title</p>
            <p className="text-xs text-muted-foreground">clamp(1.125rem, 4.5vw, 1.375rem) · font-semibold — used on mobile app headers</p>
          </div>
          <div>
            <p className="text-section-header text-foreground">.text-section-header</p>
            <p className="text-xs text-muted-foreground">clamp(1rem, 4vw, 1.125rem) · font-semibold</p>
          </div>
          <div>
            <p className="text-body text-foreground">.text-body</p>
            <p className="text-xs text-muted-foreground">text-base · font-normal · lh 1.6</p>
          </div>
          <div>
            <p className="text-caption text-foreground">.text-caption</p>
            <p className="text-xs text-muted-foreground">text-sm · font-medium · uppercase · tracking-wider</p>
          </div>
          <div>
            <p className="text-tiny text-foreground">.text-tiny</p>
            <p className="text-xs text-muted-foreground">text-xs · font-medium</p>
          </div>
          <div>
            <p className="text-label">.text-label</p>
            <p className="text-xs text-muted-foreground">text-xs · font-medium · text-muted-foreground</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tailwind Scale</p>
        <div className="space-y-2 border-l-2 border-border pl-4">
          {(["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"] as const).map((size) => (
            <div key={size} className="flex items-baseline gap-3">
              <span className={`text-${size} text-foreground font-medium`}>Aa</span>
              <span className="text-xs text-muted-foreground">{`text-${size}`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Effects</p>
        <div className="space-y-3 border-l-2 border-border pl-4">
          <div>
            <p className="text-shimmer text-2xl font-bold">.text-shimmer</p>
            <p className="text-xs text-muted-foreground">Animated gradient sweep — for premium headings</p>
          </div>
          <div>
            <p className="gradient-text text-2xl font-bold">.gradient-text</p>
            <p className="text-xs text-muted-foreground">Static primary → rose gradient fill</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Typography",
  component: TypographyDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
