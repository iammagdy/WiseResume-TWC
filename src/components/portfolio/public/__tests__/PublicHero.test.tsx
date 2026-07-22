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

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  AvatarFallback: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  AvatarImage: (props: any) => <img {...props} />,
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

  it("renders the LCP avatar with responsive previews and stable dimensions", () => {
    const props = {
      ...defaultProps,
      profile: {
        ...mockProfile,
        avatarUrl: "https://fra.cloud.appwrite.io/v1/storage/buckets/avatars/files/avatar-1/view?project=project-1",
      } as any,
    };
    render(<PublicHero {...props} />);

    const avatar = screen.getByAltText(`${mockProfile.fullName} avatar`);
    expect(avatar).toHaveAttribute("width", "144");
    expect(avatar).toHaveAttribute("height", "144");
    expect(avatar).toHaveAttribute("loading", "eager");
    expect(avatar).toHaveAttribute("fetchpriority", "high");
    expect(avatar).toHaveAttribute("decoding", "async");
    expect(avatar).toHaveAttribute("sizes", "144px");
    expect(avatar.getAttribute("src")).toContain("/preview?");
    expect(avatar.getAttribute("srcset")).toContain("432w");
  });
});
