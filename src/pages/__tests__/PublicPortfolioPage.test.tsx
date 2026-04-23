import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PublicPortfolioPage from "../PublicPortfolioPage";
import { mockProfile, mockResumes } from "../../test/mocks/data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

// Mock the hook
vi.mock("@/hooks/usePublicPortfolio", () => ({
  usePublicPortfolio: (username: string) => ({
    data: {
      profile: mockProfile,
      resume: mockResumes[0],
    },
    isLoading: false,
    isError: false,
  }),
  usePortfolioGate: () => ({
    data: { requiresPassword: false },
    isLoading: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={["/p/johndoe"]}>
    <Routes>
      <Route path="/p/:username" element={<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>} />
    </Routes>
  </MemoryRouter>
);

describe("PublicPortfolioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("renders the public portfolio for a user", async () => {
    render(<PublicPortfolioPage />, { wrapper });
    
    // Check if the user's name is rendered (Hero section main heading)
    const headings = await screen.findAllByText(mockProfile.fullName);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("shows the 'Open to Work' badge if enabled", async () => {
    render(<PublicPortfolioPage />, { wrapper });
    expect(await screen.findByText("Open to Work")).toBeDefined();
  });
});
