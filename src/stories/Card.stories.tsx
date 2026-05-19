import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Resume Score</CardTitle>
        <CardDescription>Your resume strength analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">
          Your resume is well-optimised for ATS systems. Consider adding more quantified achievements.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Improve</Button>
        <Button variant="outline" size="sm">View Report</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Achievement Unlocked</CardTitle>
            <CardDescription>Resume Wizard</CardDescription>
          </div>
          <Badge>+250 XP</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You've completed your first resume. Keep improving to unlock more achievements.
        </p>
      </CardContent>
    </Card>
  ),
};

export const CompactCard: Story = {
  render: () => (
    <Card className="w-72 p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-lg">🎯</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Job Match Score</p>
          <p className="text-xs text-muted-foreground">92% match — Strong fit</p>
        </div>
      </div>
    </Card>
  ),
};

export const GlassCard: Story = {
  render: () => (
    <div className="p-8 bg-background">
      <div className="glass-card rounded-xl p-4 w-72">
        <p className="text-sm font-semibold text-foreground mb-1">Glass Card</p>
        <p className="text-xs text-muted-foreground">Uses .glass-card utility — bg-card + border + subtle shadow.</p>
      </div>
    </div>
  ),
};
