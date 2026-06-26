/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { mockNavigate, mockParams } from "@/test/mocks/router";

vi.mock("@/hooks/usePlan", () => ({
  usePlan: vi.fn(() => ({ isPro: true, isPremium: false, isLoading: false, plan: "pro" })),
}));

vi.mock("@/hooks/useResumes", () => ({
  useResume: vi.fn(() => ({
    data: {
      $id: "resume-1",
      title: "Senior Product Designer",
      contactInfo: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "555-1234",
        location: "Cairo",
      },
      summary: "Design leader",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
    },
  })),
  useResumes: vi.fn(() => ({
    data: [
      {
        $id: "resume-1",
        title: "Senior Product Designer",
        contactInfo: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          phone: "555-1234",
          location: "Cairo",
        },
        summary: "Design leader",
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        parent_resume_id: null,
      },
    ],
  })),
  dbToResumeData: vi.fn((data: any) => data),
}));

vi.mock("@/store/settingsStore", () => ({
  useSettingsStore: vi.fn((selector) =>
    selector({
      hasSeenAIStudioTour: true,
      setHasSeenAIStudioTour: vi.fn(),
      defaultTemplate: "wiseresume-classic",
    })
  ),
}));

vi.mock("@/components/editor/ai/AIDetectorSheet", () => ({
  AIDetectorSheet: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        mock-humanizer-sheet
        <button type="button" onClick={() => onOpenChange?.(false)}>
          close humanizer
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/editor/TailorSheet", () => ({
  TailorSheet: () => null,
}));

vi.mock("@/components/editor/JobAnalysisSheet", () => ({
  JobAnalysisSheet: () => null,
}));

vi.mock("@/components/editor/ai/RecruiterSimSheet", () => ({
  RecruiterSimSheet: () => null,
}));

vi.mock("@/components/editor/ai/LinkedInOptimizerSheet", () => ({
  LinkedInOptimizerSheet: () => null,
}));

vi.mock("@/components/editor/ai/SmartFitWizardSheet", () => ({
  SmartFitWizardSheet: () => null,
}));

vi.mock("@/components/editor/AgenticChatSheet", () => ({
  AgenticChatSheet: () => null,
}));

vi.mock("@/components/editor/CareerPathSheet", () => ({
  CareerPathSheet: () => null,
}));

vi.mock("@/components/editor/ai/AIEnhanceSheet", () => ({
  AIEnhanceSheet: () => null,
}));

vi.mock("@/components/ai-studio/ResumeABCompareSheet", () => ({
  default: () => null,
}));

vi.mock("@/components/interview/CompanyBriefingSheet", () => ({
  CompanyBriefingSheet: () => null,
}));

import AIStudioPage from "@/pages/AIStudioPage";

describe("AIStudioPage workspace IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.tool = "";
    window.localStorage.clear();
  });

  it("shows the workspace framing and only the primary workflows", () => {
    renderWithProviders(<AIStudioPage />);

    expect(screen.getAllByText(/wise ai workspace/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tailor for a job/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/improve my resume/i)).toBeInTheDocument();
    expect(screen.getByText(/prepare for interview/i)).toBeInTheDocument();
    expect(screen.getAllByText(/company briefing/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^cover letter$/i)).toBeInTheDocument();
    expect(screen.getByText(/linkedin \/ personal brand/i)).toBeInTheDocument();

    expect(screen.queryByText(/qr generator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/batch qr/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/humanize/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/salary coach/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rejection analyzer/i)).not.toBeInTheDocument();
  });

  it("keeps hidden tools usable in recent history", () => {
    window.localStorage.setItem(
      "wr-recent-ai-tools",
      JSON.stringify(["/ai-studio/humanizer"])
    );

    renderWithProviders(<AIStudioPage />);

    expect(screen.getByText(/recent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /humanize/i })).toBeInTheDocument();
  });

  it("still opens hidden deep links like /ai-studio/humanizer", async () => {
    mockParams.tool = "humanizer";

    renderWithProviders(<AIStudioPage />);

    expect(await screen.findByText("mock-humanizer-sheet")).toBeInTheDocument();
  });

  it("returns to /ai-studio when a deep-linked sheet is dismissed", async () => {
    mockParams.tool = "humanizer";

    renderWithProviders(<AIStudioPage />);

    await screen.findByText("mock-humanizer-sheet");
    fireEvent.click(screen.getByRole("button", { name: /close humanizer/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/ai-studio", { replace: true });
  });
});
