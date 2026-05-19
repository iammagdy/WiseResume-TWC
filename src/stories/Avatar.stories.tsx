import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
      <Avatar className="w-8 h-8">
        <AvatarImage src="https://github.com/shadcn.png" alt="User" />
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar className="w-10 h-10">
        <AvatarImage src="https://github.com/shadcn.png" alt="User" />
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar className="w-12 h-12">
        <AvatarImage src="https://github.com/shadcn.png" alt="User" />
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const FallbackInitials: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
      <Avatar className="w-8 h-8">
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar className="w-10 h-10">
        <AvatarFallback>AM</AvatarFallback>
      </Avatar>
      <Avatar className="w-12 h-12">
        <AvatarFallback>WR</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const PlanGlowRings: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-6 bg-background rounded-xl">
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarFallback>FR</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs text-muted-foreground">Free</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="w-12 h-12 plan-glow-pro">
            <AvatarFallback>PR</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs text-muted-foreground">Pro</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="w-12 h-12 plan-glow-premium">
            <AvatarFallback>PM</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs text-muted-foreground">Premium</p>
      </div>
    </div>
  ),
};
