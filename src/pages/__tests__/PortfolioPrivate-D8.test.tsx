/**
 * D8 — Portfolio & Public Profile
 * T071: Private portfolio (is_public: false) shows "not found" / private message, not resume data
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("@/hooks/usePublicPortfolio", () => ({
  usePublicPortfolio: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/useActiveStatus", () => ({
  useActiveStatus: vi.fn(() => ({ isActive: false })),
  isActiveWithin24h: vi.fn(() => false),
}));

vi.mock("@/hooks/usePortfolioTracking", () => ({
  usePortfolioTracking: vi.fn(() => ({
    stickyVisible: false,
    heroRef: { current: null },
    sendTrackingBeacon: vi.fn(),
  })),
}));

vi.mock("@/hooks/usePortfolioSEO", () => ({
  usePortfolioSEO: vi.fn(),
}));

vi.mock("@/lib/portfolioThemes", () => ({
  getThemeById: vi.fn(() => ({
    colors: { bg: "#0a0a14", text: "#fff", accent: "#e84545", muted: "#9ca3af", card: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.08)" },
    layout: { heroAlign: "center", cardRadius: "1rem", cardVariant: "bordered" },
  })),
  buildThemeCSSVars: vi.fn(() => ({})),
  PORTFOLIO_THEMES: [],
}));

vi.mock("@/components/portfolio/public/StickyHeader", () => ({
  StickyHeader: () => null,
}));

import PublicPortfolioPage from "@/pages/PublicPortfolioPage";

describe("PublicPortfolioPage (D8) — private profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT render resume data when portfolio is null (private/not found)", () => {
    renderWithProviders(<PublicPortfolioPage />, { initialPath: "/p/private-user" });
    expect(screen.queryByText(/senior software engineer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/jane doe/i)).not.toBeInTheDocument();
  });

  it("renders a not-found / private message", () => {
    renderWithProviders(<PublicPortfolioPage />, { initialPath: "/p/private-user" });
    // The NotFound component renders: "This portfolio doesn't exist or isn't public yet."
    expect(
      screen.getByText(/doesn't exist or isn't public/i)
    ).toBeInTheDocument();
  });
});
