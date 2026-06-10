import { describe, it, expect, vi } from "vitest";
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
  usernameAvailable: true as boolean | null,
  checkingUsername: false,
  bio: "",
  onBioChange: vi.fn(),
  onGenerateBio: vi.fn(),
  generatingBio: false,
  sections: defaultSections,
  onToggleSectionVisibility: vi.fn(),
  openSections: new Set<string>(),
  toggleSection: vi.fn(),
  availabilityHeadline: "",
  onAvailabilityHeadlineChange: vi.fn(),
  onGenerateAvailability: vi.fn(),
  generatingAvailability: false,
  availabilityStatus: "not-looking" as const,
  onAvailabilityStatusChange: vi.fn(),
  videoIntroUrl: "",
  onVideoIntroUrlChange: vi.fn(),
};

describe("SetupTab resume picker", () => {
  it("shows the selected resume title instead of concatenating every option", () => {
    renderWithProviders(
      <SetupTab
        {...baseProps}
        resumes={[
          { $id: "resume-a", title: "John Duo" },
          { $id: "resume-b", title: "Magdy Saber" },
        ]}
        selectedResumeId="resume-a"
        onSelectedResumeIdChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("John Duo");
    expect(trigger).not.toHaveTextContent("Magdy Saber");
    expect(trigger).not.toHaveTextContent("Select a resumeJohn Duo");
  });

  it("accepts resumes normalized with id from Appwrite documents", () => {
    renderWithProviders(
      <SetupTab
        {...baseProps}
        resumes={[
          { id: "resume-a", title: "Primary CV", is_primary: true },
          { id: "resume-b", title: "Tailored CV" },
        ]}
        selectedResumeId="resume-b"
        onSelectedResumeIdChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Tailored CV");
  });
});
