import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <div className="bg-background p-6 rounded-xl w-80">
      <Tabs defaultValue="resume">
        <TabsList className="w-full">
          <TabsTrigger value="resume" className="flex-1">Resume</TabsTrigger>
          <TabsTrigger value="cover" className="flex-1">Cover Letter</TabsTrigger>
          <TabsTrigger value="portfolio" className="flex-1">Portfolio</TabsTrigger>
        </TabsList>
        <TabsContent value="resume">
          <p className="text-sm text-muted-foreground pt-4">Resume content goes here.</p>
        </TabsContent>
        <TabsContent value="cover">
          <p className="text-sm text-muted-foreground pt-4">Cover letter content goes here.</p>
        </TabsContent>
        <TabsContent value="portfolio">
          <p className="text-sm text-muted-foreground pt-4">Portfolio content goes here.</p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const TwoTabs: Story = {
  render: () => (
    <div className="bg-background p-6 rounded-xl w-64">
      <Tabs defaultValue="light">
        <TabsList>
          <TabsTrigger value="light">Light</TabsTrigger>
          <TabsTrigger value="dark">Dark</TabsTrigger>
        </TabsList>
        <TabsContent value="light">
          <p className="text-sm text-muted-foreground pt-3">Light theme preview.</p>
        </TabsContent>
        <TabsContent value="dark">
          <p className="text-sm text-muted-foreground pt-3">Dark theme preview.</p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
