import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardSpotlightHero } from "@/components/dashboard/DashboardSpotlightHero";

const mockResume = {
  $id: "resume-1",
  title: "Product Manager Resume",
  template: "modern",
  $updatedAt: new Date().toISOString(),
  $createdAt: new Date().toISOString(),
} as import("@/hooks/useResumes").DatabaseResume;

describe("DashboardSpotlightHero", () => {
  it("renders a dedicated continue editing action for returning users", () => {
    render(
      <DashboardSpotlightHero
        resume={mockResume}
        healthScore={{
          overallScore: 82,
          categories: {
            keywordOptimization: 80,
            contentQuality: 80,
            sectionStructure: 80,
            parsability: 80,
            contactCompleteness: 80,
            lengthDensity: 80,
            templateFriendliness: 80,
          },
          topStrength: "Strong summary",
          topImprovement: "Add metrics to bullets",
          scoredAt: new Date().toISOString(),
        }}
        onTailor={vi.fn()}
        onOpenEditor={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /continue editing/i }),
    ).toBeInTheDocument();
  });

  it("uses a stacked mobile CTA layout for returning users", () => {
    const { container } = render(
      <DashboardSpotlightHero
        resume={mockResume}
        onTailor={vi.fn()}
        onOpenEditor={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-testid="returning-user-cta-grid"]')).toBeTruthy();
  });
});
