import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardHero } from "@/components/dashboard/DashboardHero";

describe("DashboardHero", () => {
  it("renders a dedicated continue editing action for returning users", () => {
    render(
      <DashboardHero
        hasResumes
        onBuild={vi.fn()}
        onTailor={vi.fn()}
        onContinueEditing={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /continue editing/i }),
    ).toBeInTheDocument();
  });

  it("uses a stacked mobile CTA layout for returning users", () => {
    const { container } = render(
      <DashboardHero
        hasResumes
        onBuild={vi.fn()}
        onTailor={vi.fn()}
        onContinueEditing={vi.fn()}
      />,
    );

    expect(container.querySelector(".grid-cols-1.sm\\:grid-cols-2")).toBeTruthy();
  });
});
