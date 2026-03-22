/**
 * D2 — Editor component unit tests
 * Tests ContactSection, SkillsSection, and ExperienceSection in isolation.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";

// Mock hooks that do API calls or have complex dependencies
vi.mock("@/hooks/useAIEnhance", () => ({
  useAIEnhance: vi.fn(() => ({
    enhance: vi.fn(),
    isEnhancing: false,
  })),
  ActionType: {},
}));

vi.mock("@/hooks/useResumeNudges", () => ({
  useResumeNudges: vi.fn(() => ({
    getNudgeForSection: vi.fn().mockReturnValue(undefined),
    getNudgesForExperience: vi.fn().mockReturnValue([]),
    dismissNudge: vi.fn(),
  })),
}));

import { ContactSection } from "@/components/editor/ContactSection";
import { SkillsSection } from "@/components/editor/SkillsSection";
import { ExperienceSection } from "@/components/editor/ExperienceSection";
import { mockResumeStore } from "@/test/mocks/zustandStores";
import type { ResumeData } from "@/types/resume";

// Helper: inject specific resume data for a test
function withResume(overrides: Partial<ResumeData>) {
  const prev = mockResumeStore.currentResume;
  mockResumeStore.currentResume = { ...prev, ...overrides } as ResumeData;
  return () => {
    mockResumeStore.currentResume = prev;
  };
}

describe("ContactSection (D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeStore.currentResume = {
      contactInfo: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "555-1234",
        location: "San Francisco, CA",
      },
      summary: "Experienced engineer",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      templateId: "modern",
    };
  });

  it("renders name, email, and phone fields", () => {
    renderWithProviders(<ContactSection />);
    // Should render inputs for fullName, email, phone
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
  });

  it("shows empty state when contact info is empty", () => {
    const restore = withResume({
      contactInfo: { fullName: "", email: "", phone: "", location: "" },
    });
    renderWithProviders(<ContactSection />);
    // Empty state should show prompt to add contact info
    expect(
      screen.getByText(/add your contact information/i)
    ).toBeInTheDocument();
    restore();
  });

  it("returns null when no resume loaded", () => {
    mockResumeStore.currentResume = null as unknown as ResumeData;
    const { container } = renderWithProviders(<ContactSection />);
    expect(container.firstChild).toBeNull();
  });
});

describe("SkillsSection (D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeStore.currentResume = {
      contactInfo: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "555-1234",
        location: "SF",
      },
      summary: "Engineer",
      experience: [],
      education: [],
      skills: ["React", "TypeScript", "Node.js"],
      certifications: [],
      templateId: "modern",
    };
  });

  it("renders existing skills as badges", () => {
    renderWithProviders(<SkillsSection />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("calls updateResume when add skill is submitted", () => {
    renderWithProviders(<SkillsSection />);
    const input = screen.getByPlaceholderText(/add a skill/i);
    fireEvent.change(input, { target: { value: "PostgreSQL" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(mockResumeStore.updateResume).toHaveBeenCalled();
  });

  it("shows empty state when no skills", () => {
    const restore = withResume({ skills: [] });
    renderWithProviders(<SkillsSection />);
    expect(screen.getByText(/add your skills/i)).toBeInTheDocument();
    restore();
  });

  it("returns null when no resume loaded", () => {
    mockResumeStore.currentResume = null as unknown as ResumeData;
    const { container } = renderWithProviders(<SkillsSection />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ExperienceSection (D2)", () => {
  const mockExperience = [
    {
      id: "exp-1",
      company: "Tech Corp",
      position: "Senior Engineer",
      startDate: "2020-01",
      endDate: "",
      current: true,
      description: "Led React development",
      achievements: ["Improved performance by 40%"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeStore.currentResume = {
      contactInfo: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "555-1234",
        location: "SF",
      },
      summary: "Engineer",
      experience: mockExperience,
      education: [],
      skills: [],
      certifications: [],
      templateId: "modern",
    };
  });

  it("renders experience entries", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText("Tech Corp")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
  });

  it("shows empty state when no experience", () => {
    const restore = withResume({ experience: [] });
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText(/add your work experience/i)).toBeInTheDocument();
    restore();
  });

  it("returns null when no resume loaded", () => {
    mockResumeStore.currentResume = null as unknown as ResumeData;
    const { container } = renderWithProviders(<ExperienceSection />);
    expect(container.firstChild).toBeNull();
  });
});
