import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PublicSections } from "../PublicSections";
import { mockProfile, mockResumes } from "../../../../test/mocks/data";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock child components to keep it simple
vi.mock("../StatsStrip", () => ({ StatsStrip: () => <div data-testid="stats">Stats</div> }));
vi.mock("../HighlightsStrip", () => ({ HighlightsStrip: () => <div data-testid="highlights">Highlights</div> }));
vi.mock("../SectionNav", () => ({ SectionNav: () => <nav data-testid="nav">Nav</nav> }));
vi.mock("../SectionHeader", () => ({ SectionHeader: ({ title }: any) => <h2>{title}</h2> }));
vi.mock("../BioReveal", () => ({ BioReveal: ({ bio }: any) => <div>{bio}</div> }));

describe("PublicSections", () => {
  const defaultProps = {
    profile: mockProfile as any,
    resume: mockResumes[0] as any,
    pStyle: "minimal",
    accentColor: "#3b82f6",
    isTwoCol: false,
    navSections: [{ id: "about", label: "About" }],
    highlights: [],
    allSkills: ["React", "TypeScript"],
    portfolioSummary: "Test Summary",
  };

  it("renders the portfolio summary", () => {
    render(<PublicSections {...defaultProps} />);
    expect(screen.getByText("Test Summary")).toBeDefined();
  });

  it("renders the About section when bio is present", () => {
    render(<PublicSections {...defaultProps} />);
    expect(screen.getByText("About")).toBeDefined();
    expect(screen.getByText(mockProfile.portfolioBio)).toBeDefined();
  });

  it("renders StatsStrip", () => {
    render(<PublicSections {...defaultProps} />);
    expect(screen.getByTestId("stats")).toBeDefined();
  });
});
