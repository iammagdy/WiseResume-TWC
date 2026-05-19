import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Mail, Trash2, Plus, ArrowRight } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4 bg-background">
      <Button variant="default">Primary CTA</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-background">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus className="w-4 h-4" /></Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4 bg-background">
      <Button>
        <Mail className="w-4 h-4" />
        Send Email
      </Button>
      <Button variant="outline">
        Continue
        <ArrowRight className="w-4 h-4" />
      </Button>
      <Button variant="destructive">
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>
      <Button variant="ghost" size="icon">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  ),
};

export const DisabledStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4 bg-background">
      <Button disabled>Primary</Button>
      <Button variant="secondary" disabled>Secondary</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="ghost" disabled>Ghost</Button>
    </div>
  ),
};
