import type { Meta, StoryObj } from "@storybook/react";

const tokens = [
  { name: "background", label: "Background" },
  { name: "foreground", label: "Foreground" },
  { name: "card", label: "Card" },
  { name: "card-foreground", label: "Card Foreground" },
  { name: "popover", label: "Popover" },
  { name: "muted", label: "Muted" },
  { name: "muted-foreground", label: "Muted Foreground" },
  { name: "primary", label: "Primary" },
  { name: "primary-foreground", label: "Primary Foreground" },
  { name: "secondary", label: "Secondary" },
  { name: "secondary-foreground", label: "Secondary Foreground" },
  { name: "accent", label: "Accent" },
  { name: "accent-foreground", label: "Accent Foreground" },
  { name: "destructive", label: "Destructive" },
  { name: "destructive-foreground", label: "Destructive Foreground" },
  { name: "border", label: "Border" },
  { name: "input", label: "Input" },
  { name: "ring", label: "Ring" },
  { name: "success", label: "Success" },
  { name: "warning", label: "Warning" },
  { name: "error", label: "Error" },
  { name: "info", label: "Info" },
];

function ColorSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="w-full h-16 rounded-lg border border-border"
        style={{ background: `hsl(var(--${name}))` }}
      />
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{`--${name}`}</p>
    </div>
  );
}

function ColorTokensDoc() {
  return (
    <div className="p-8 bg-background min-w-[800px]">
      <h1 className="text-h1 text-foreground mb-2">Color Tokens</h1>
      <p className="text-sm text-muted-foreground mb-8">
        All colors use <code className="text-xs bg-muted px-1.5 py-0.5 rounded">hsl(var(--token))</code>.
        Toggle Light / Dark in the toolbar above to preview both themes.
      </p>
      <div className="grid grid-cols-4 gap-4">
        {tokens.map((t) => (
          <ColorSwatch key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Design System/Color Tokens",
  component: ColorTokensDoc,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const All: StoryObj = {};
