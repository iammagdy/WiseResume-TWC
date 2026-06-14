import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PublicSections } from "../PublicSections";
import { mockProfile, mockResumes } from "../../../../test/mocks/data";
import React from "react";


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

  it("handles null experience without crashing", () => {
    const resumeWithNullExperience = {
      ...mockResumes[0],
      experience: null as any,
    };
    render(<PublicSections {...defaultProps} resume={resumeWithNullExperience as any} />);
    // Should not crash - Experience section won't render
    expect(screen.getByText("About")).toBeDefined();
  });

  it("handles undefined education without crashing", () => {
    const resumeWithUndefinedEducation = {
      ...mockResumes[0],
      education: undefined as any,
    };
    render(<PublicSections {...defaultProps} resume={resumeWithUndefinedEducation as any} />);
    // Should not crash - Education section won't render
    expect(screen.getByText("About")).toBeDefined();
  });

  it("handles non-array testimonials without crashing", () => {
    const profileWithBadTestimonials = {
      ...mockProfile,
      testimonials: { invalid: "object" } as any,
    };
    render(<PublicSections {...defaultProps} profile={profileWithBadTestimonials as any} />);
    // Should not crash
    expect(screen.getByText("About")).toBeDefined();
  });

  it("handles null skills without crashing", () => {
    const resumeWithNullSkills = {
      ...mockResumes[0],
      skills: null as any,
    };
    render(<PublicSections {...defaultProps} resume={resumeWithNullSkills as any} allSkills={[]} />);
    // Should not crash
    expect(screen.getByText("About")).toBeDefined();
  });

  it("handles object instead of array for caseStudies without crashing", () => {
    const profileWithObjectCaseStudies = {
      ...mockProfile,
      caseStudies: { not: "an array" } as any,
    };
    render(<PublicSections {...defaultProps} profile={profileWithObjectCaseStudies as any} />);
    // Should not crash - Case Studies section won't render
    expect(screen.getByText("About")).toBeDefined();
  });
});
