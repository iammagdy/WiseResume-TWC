/**
 * D8 — Portfolio & Public Profile
 * T069: Username conflict — "Taken" indicator visible when usernameAvailable is false
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { SetupTab } from "@/components/portfolio/editor/SetupTab";
import type { PortfolioSections } from "@/components/portfolio/editor/ContentVisibilitySection";

const defaultSections: PortfolioSections = {
  experience: true,
  education: true,
  skills: true,
  projects: true,
  certifications: true,
  awards: true,
  publications: true,
  volunteering: true,
  githubProjects: false,
};

const baseProps = {
  username: "johndoe",
  onUsernameChange: vi.fn(),
  usernameError: "",
  usernameAvailable: null as boolean | null,
  checkingUsername: false,
  resumes: [],
  selectedResumeId: "",
  onSelectedResumeIdChange: vi.fn(),
  bio: "",
  onBioChange: vi.fn(),
  onGenerateBio: vi.fn(),
  generatingBio: false,
  sections: defaultSections,
  onToggleSectionVisibility: vi.fn(),
  openSections: new Set<string>(),
  toggleSection: vi.fn(),
  openToWork: false,
  onOpenToWorkChange: vi.fn(),
  availabilityHeadline: "",
  onAvailabilityHeadlineChange: vi.fn(),
  onGenerateAvailability: vi.fn(),
  generatingAvailability: false,
};

describe("PortfolioUsernameConflict (D8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Taken' indicator when usernameAvailable is false", () => {
    renderWithProviders(
      <SetupTab {...baseProps} usernameAvailable={false} checkingUsername={false} />
    );
    expect(screen.getByText(/taken/i)).toBeInTheDocument();
  });

  it("does NOT show 'Taken' when username is available", () => {
    renderWithProviders(
      <SetupTab {...baseProps} usernameAvailable={true} checkingUsername={false} />
    );
    expect(screen.queryByText(/^taken$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });

  it("shows format error when usernameError is set", () => {
    renderWithProviders(
      <SetupTab
        {...baseProps}
        usernameError="Only lowercase letters and hyphens allowed"
        usernameAvailable={null}
      />
    );
    expect(
      screen.getByText(/only lowercase letters and hyphens allowed/i)
    ).toBeInTheDocument();
  });
});
