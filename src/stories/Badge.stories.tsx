import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "glass"],
    },
  },
  args: {
    children: "Badge",
    variant: "default",
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4 bg-background">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="glass">Glass</Badge>
    </div>
  ),
};

export const UseCases: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4 bg-background">
      <Badge variant="default">New</Badge>
      <Badge variant="secondary">React</Badge>
      <Badge variant="secondary">TypeScript</Badge>
      <Badge variant="destructive">3 Errors</Badge>
      <Badge variant="outline">Draft</Badge>
      <Badge>+250 XP</Badge>
    </div>
  ),
};
