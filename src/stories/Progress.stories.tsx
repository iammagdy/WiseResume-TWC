import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "@/components/ui/progress";

const meta: Meta<typeof Progress> = {
  title: "Components/Progress",
  component: Progress,
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
  },
  args: { value: 60 },
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {};

export const Levels: Story = {
  render: () => (
    <div className="space-y-4 w-80 bg-background p-6 rounded-xl">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Resume Strength</span>
          <span>92%</span>
        </div>
        <Progress value={92} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Profile Complete</span>
          <span>75%</span>
        </div>
        <Progress value={75} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>XP to Next Level</span>
          <span>40%</span>
        </div>
        <Progress value={40} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Getting started</span>
          <span>10%</span>
        </div>
        <Progress value={10} />
      </div>
    </div>
  ),
};
