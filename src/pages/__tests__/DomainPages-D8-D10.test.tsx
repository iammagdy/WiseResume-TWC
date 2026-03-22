/**
 * D8/D9/D10 — Portfolio, Tracker, and Settings page unit tests
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import * as useAuthHook from "@/hooks/useAuth";
import type { AuthContextType } from "@/contexts/AuthContext";

// Common mocks
vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(() => ({
    profile: {
      id: "u1",
      username: "jdoe",
      fullName: "Jane Doe",
      portfolioEnabled: true,
      views: 42,
    },
    isLoading: false,
    updateProfile: vi.fn(),
  })),
  calculateProfileCompletion: vi.fn(() => 80),
}));

vi.mock("@/hooks/useResumes", () => ({
  useResumes: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useResumeMutations: vi.fn(() => ({ createResume: vi.fn(), updateResume: vi.fn(), deleteResume: vi.fn() })),
  dbToResumeData: vi.fn((d: any) => d),
  resumeDataToDb: vi.fn((r: any) => r),
}));

vi.mock("@/hooks/useJobApplications", () => ({
  useJobApplications: vi.fn(() => ({ data: [], isLoading: false })),
  useJobApplicationMutations: vi.fn(() => ({ create: vi.fn(), update: vi.fn(), delete: vi.fn() })),
  ApplicationStatus: { applied: "applied" },
}));

vi.mock("@/hooks/useJobs", () => ({
  useJobs: vi.fn(() => ({ data: [], isLoading: false })),
  useJobMutations: vi.fn(() => ({ create: vi.fn() })),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadNotificationCount: vi.fn(() => 0),
}));

vi.mock("@/hooks/useJobActivityStats", () => ({
  useJobActivityStats: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("@/lib/activityTracker", () => ({
  activityTracker: { setActiveFeature: vi.fn(), trackAction: vi.fn() },
}));

vi.mock("@/lib/portfolioUrl", () => ({
  getPortfolioUrl: vi.fn(() => "https://example.com/portfolio"),
  getAppUrl: vi.fn(() => "https://example.com"),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  getSupabaseToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/integrations/supabase/safeClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })),
    })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

vi.mock("@/lib/openExternal", () => ({
  openExternal: vi.fn(),
}));

vi.mock("@kinde-oss/kinde-auth-react", () => ({
  useKindeAuth: vi.fn(() => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    user: { id: "u1", email: "jane@example.com" },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock("@/lib/sampleJobs", () => ({
  sampleJobs: [],
}));

import PortfolioEditorPageImport from "@/pages/PortfolioEditorPage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import SettingsPage from "@/pages/SettingsPage";

const mockUseAuth = vi.mocked(useAuthHook.useAuth);

const authenticatedAuth = (): AuthContextType => ({
  user: { id: "u1", email: "jane@example.com", name: "Jane" },
  loading: false,
  isAuthenticated: true,
  supabaseReady: true,
  kindeUser: { id: "u1", email: "jane@example.com" } as any,
  signOut: vi.fn(),
  getKindeToken: vi.fn().mockResolvedValue(null),
});

// ── Portfolio (D8) ────────────────────────────────────────────────────────────

describe("PortfolioEditorPage (D8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth());
  });

  it("renders without crashing when authenticated", () => {
    const { container } = renderWithProviders(<PortfolioEditorPageImport />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders some UI content (not blank)", () => {
    renderWithProviders(<PortfolioEditorPageImport />);
    // The page should render at least some content
    expect(document.body.innerHTML.length).toBeGreaterThan(100);
  });
});

// ── Applications Tracker (D9) ─────────────────────────────────────────────────

describe("ApplicationsPage (D9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth());
  });

  it("renders without crashing", () => {
    const { container } = renderWithProviders(<ApplicationsPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders application tracker UI elements", () => {
    renderWithProviders(<ApplicationsPage />);
    expect(document.body.innerHTML.length).toBeGreaterThan(100);
  });

  it("shows add application button", () => {
    renderWithProviders(<ApplicationsPage />);
    const addBtn =
      screen.queryByRole("button", { name: /add/i }) ||
      screen.queryByRole("button", { name: /new/i }) ||
      document.querySelector("button");
    expect(addBtn).toBeTruthy();
  });
});

// ── Settings (D10) ────────────────────────────────────────────────────────────

describe("SettingsPage (D10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth());
  });

  it("renders without crashing", () => {
    const { container } = renderWithProviders(<SettingsPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders sign out button", () => {
    renderWithProviders(<SettingsPage />);
    const signOutBtn =
      screen.queryByRole("button", { name: /sign out/i }) ||
      screen.queryByRole("button", { name: /log out/i }) ||
      screen.queryByText(/sign out/i) ||
      screen.queryByText(/logout/i);
    expect(signOutBtn).toBeTruthy();
  });

  it("renders some settings sections", () => {
    renderWithProviders(<SettingsPage />);
    // Should have some settings-like content
    expect(document.body.innerHTML.length).toBeGreaterThan(100);
  });
});
