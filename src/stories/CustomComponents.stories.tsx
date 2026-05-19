import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { PlanChip } from "@/components/ui/PlanChip";
import { AITrustBadge } from "@/components/ui/AITrustBadge";
import { MiniSpinner } from "@/components/ui/MiniSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { Button } from "@/components/ui/button";

const meta: Meta = {
  title: "Components/Custom App",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const LoadingButtonDemo: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    const trigger = () => {
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    };
    return (
      <div className="space-y-3 p-6 bg-background rounded-xl w-72">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LoadingButton</p>
        <LoadingButton isLoading={loading} loadingText="Saving…" onClick={trigger}>
          Save Resume
        </LoadingButton>
        <LoadingButton isLoading={loading} variant="outline" onClick={trigger}>
          Export PDF
        </LoadingButton>
        <LoadingButton isLoading={loading} variant="destructive" loadingText="Deleting…" onClick={trigger}>
          Delete
        </LoadingButton>
        <p className="text-[10px] text-muted-foreground">Click any button to preview loading state</p>
      </div>
    );
  },
};

export const PlanChipDemo: Story = {
  render: () => {
    const expiresIn3Days = new Date(Date.now() + 3 * 86_400_000).toISOString();
    return (
      <div className="space-y-3 p-6 bg-background rounded-xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PlanChip</p>
        <div className="flex flex-wrap gap-2 items-center">
          <PlanChip plan="pro" />
          <PlanChip plan="premium" />
          <PlanChip plan="pro" trialPlan="pro" trialExpiresAt={expiresIn3Days} />
          <PlanChip plan="premium" trialPlan="premium" trialExpiresAt={expiresIn3Days} />
        </div>
        <p className="text-[10px] text-muted-foreground">Free plan renders nothing</p>
      </div>
    );
  },
};

export const AITrustBadgeDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl w-96">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AITrustBadge</p>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Dismissible (default)</p>
        <AITrustBadge key={Math.random()} />
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Non-dismissible</p>
        <AITrustBadge dismissible={false} />
      </div>
    </div>
  ),
};

export const MiniSpinnerDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MiniSpinner</p>
      <div className="flex items-end gap-4">
        {[12, 16, 20, 24, 32].map(size => (
          <div key={size} className="flex flex-col items-center gap-2">
            <MiniSpinner size={size} />
            <span className="text-[10px] text-muted-foreground">{size}px</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Uses <code className="bg-muted px-1 rounded">role="status"</code> and <code className="bg-muted px-1 rounded">aria-label="Loading"</code> for accessibility.
      </p>
    </div>
  ),
};

export const SkeletonDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl w-80">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skeleton</p>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex gap-3 items-center">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  ),
};

export const GlassSurfaceDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl w-96">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GlassSurface</p>
      <div className="space-y-3">
        <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
          <GlassSurface className="absolute inset-2 rounded-lg" blur={12} saturate={160}>
            <p className="text-sm text-foreground font-medium p-3">blur=12 saturate=160</p>
          </GlassSurface>
        </div>
        <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
          <GlassSurface className="absolute inset-2 rounded-lg" blur={20} saturate={200}>
            <p className="text-sm text-foreground font-medium p-3">blur=20 saturate=200</p>
          </GlassSurface>
        </div>
        <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
          <GlassSurface className="absolute inset-2 rounded-lg" blur={8} saturate={120} distortion={10}>
            <p className="text-sm text-foreground font-medium p-3">blur=8 distortion=10</p>
          </GlassSurface>
        </div>
      </div>
    </div>
  ),
};
