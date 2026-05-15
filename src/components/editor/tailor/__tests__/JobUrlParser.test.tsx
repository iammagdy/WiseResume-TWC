import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { JobUrlParser } from "@/components/editor/tailor/JobUrlParser";

describe("JobUrlParser", () => {
  it("uses a stacked mobile-first layout for URL input and extract button", () => {
    const { container } = render(
      <JobUrlParser value="" onChange={vi.fn()} />,
    );

    expect(container.querySelector(".flex.flex-col.sm\\:flex-row.gap-2")).toBeTruthy();
  });

  it("keeps the full extract button label visible", () => {
    render(<JobUrlParser value="" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /extract job details/i }),
    ).toBeInTheDocument();
  });
});
