import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GitHubProjectsSection } from "../GitHubProjectsSection";

const baseProject = {
  name: "proj",
  description: "",
  url: "",
  language: null,
  stars: 0,
  topics: [] as string[],
};

describe("GitHubProjectsSection link safety", () => {
  it("renders a navigable link for a safe project URL", () => {
    render(
      <GitHubProjectsSection
        projects={[{ ...baseProject, name: "safe", url: "https://github.com/u/p" }]}
        accentColor="#ffffff"
        style="minimal"
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links.some((a) => a.getAttribute("href") === "https://github.com/u/p")).toBe(true);
  });

  it("does NOT render a navigable link for a javascript: project URL", () => {
    render(
      <GitHubProjectsSection
        projects={[{ ...baseProject, name: "evil", url: "javascript:alert(document.cookie)" }]}
        accentColor="#ffffff"
        style="minimal"
      />,
    );
    // An <a> without an href is not exposed with role="link".
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("evil")).toBeDefined();
  });
});
