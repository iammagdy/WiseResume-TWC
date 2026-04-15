import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PublicHero } from "../PublicHero";
import { mockProfile, mockResumes } from "../../../../test/mocks/data";
import React from "react";


// Mock TypewriterText
vi.mock("../TypewriterText", () => ({
  TypewriterText: () => <div data-testid="typewriter">Typewriter</div>,
  buildTypewriterPhrases: () => ["Phrase 1"],
}));

describe("PublicHero", () => {
  const defaultProps = {
    profile: mockProfile as any,
    resume: mockResumes[0] as any,
    pStyle: "minimal",
    accentColor: "#3b82f6",
    initials: "JD",
    liveLastActiveAt: null,
    allSkills: ["React", "TypeScript"],
  };

  it("renders the user's full name", () => {
    render(<PublicHero {...defaultProps} />);
    expect(screen.getByText(mockProfile.fullName)).toBeDefined();
  });

  it("renders the job title when provided", () => {
    render(<PublicHero {...defaultProps} />);
    expect(screen.getByText(mockProfile.jobTitle)).toBeDefined();
  });

  it("renders 'Open to Work' badge when enabled", () => {
    const props = { ...defaultProps, profile: { ...mockProfile, openToWork: true } as any };
    render(<PublicHero {...props} />);
    expect(screen.getByText("Open to Work")).toBeDefined();
  });

  it("renders social links when provided", () => {
    const props = { 
      ...defaultProps, 
      profile: { 
        ...mockProfile, 
        linkedinUrl: "https://linkedin.com/in/johndoe",
        githubUrl: "https://github.com/johndoe"
      } as any
    };
    render(<PublicHero {...props} />);
    expect(screen.getByTitle("LinkedIn")).toBeDefined();
    expect(screen.getByTitle("GitHub")).toBeDefined();
  });
});
