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
          scoreBasis: "resume-completeness-v1",
          overallScore: 82,
          categories: {
            contactCompleteness: 80,
            summaryCompleteness: 80,
            experienceCompleteness: 80,
            educationCompleteness: 80,
            skillsCompleteness: 80,
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
