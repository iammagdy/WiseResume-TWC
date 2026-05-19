import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const meta: Meta = {
  title: "Components/Inputs",
  component: Input,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const TextInput: Story = {
  render: () => (
    <div className="space-y-4 w-72 bg-background p-4 rounded-xl">
      <div className="space-y-1.5">
        <Label htmlFor="default">Default</Label>
        <Input id="default" placeholder="Enter text…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filled">With value</Label>
        <Input id="filled" defaultValue="John Smith" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="disabled">Disabled</Label>
        <Input id="disabled" disabled placeholder="Disabled input" />
      </div>
    </div>
  ),
};

export const GlassInput: Story = {
  render: () => (
    <div className="space-y-4 w-72 bg-background p-4 rounded-xl">
      <div className="space-y-1.5">
        <Label>Glass Input</Label>
        <div className="glass-input rounded-lg">
          <Input className="border-0 bg-transparent focus-visible:ring-0" placeholder="Styled with .glass-input" />
        </div>
      </div>
    </div>
  ),
};

export const TextareaInput: Story = {
  render: () => (
    <div className="space-y-4 w-80 bg-background p-4 rounded-xl">
      <div className="space-y-1.5">
        <Label>Summary</Label>
        <Textarea placeholder="Write a professional summary…" rows={4} />
      </div>
    </div>
  ),
};
