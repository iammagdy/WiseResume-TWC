import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PortfolioEditorPage from "../PortfolioEditorPage";
import { mockProfile, mockResumes } from "../../test/mocks/data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: mockProfile,
    loading: false,
    updateProfile: vi.fn(),
  }),
}));

vi.mock("@/hooks/useResumes", () => ({
  useResumes: () => ({
    data: mockResumes,
    isLoading: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

import { MemoryRouter } from "react-router-dom";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </MemoryRouter>
);

describe("PortfolioEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("renders the editor with the profile data", async () => {
    render(<PortfolioEditorPage />, { wrapper });
    
    expect(screen.getByText("Portfolio")).toBeDefined();
    expect(await screen.findByDisplayValue(mockProfile.username)).toBeDefined();
  });

  it("shows the status bar with the portfolio URL", async () => {
    render(<PortfolioEditorPage />, { wrapper });
    const matches = await screen.findAllByText(/resume\.thewise\.cloud\/p\/johndoe/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("can switch between tabs", async () => {
     // This would involve clicking the tab buttons and checking for tab-specific content
     // Setup is default
  });
});
