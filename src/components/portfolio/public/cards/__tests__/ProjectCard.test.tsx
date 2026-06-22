import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProjectCard } from "../ProjectCard";

describe("ProjectCard link safety", () => {
  it("renders a clickable link for a safe http(s) project URL", () => {
    const project = { name: "My Project", url: "https://example.com/demo" } as any;
    render(<ProjectCard project={project} style="minimal" />);
    const links = screen.getAllByRole("link");
    expect(links.some((a) => a.getAttribute("href") === "https://example.com/demo")).toBe(true);
  });

  it("does NOT render an anchor for a javascript: project URL (renders name as text)", () => {
    const project = { name: "Evil Project", url: "javascript:alert(document.cookie)" } as any;
    render(<ProjectCard project={project} style="minimal" />);
    // No anchors at all — unsafe scheme is dropped, name shown as plain text.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Evil Project")).toBeDefined();
  });

  it("does NOT render a GitHub anchor for a data: github URL", () => {
    const project = {
      name: "Proj",
      githubUrl: "data:text/html,<script>alert(1)</script>",
    } as any;
    render(<ProjectCard project={project} style="minimal" />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
