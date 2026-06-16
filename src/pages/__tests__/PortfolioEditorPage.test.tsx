import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockProfile, mockResumes } from "../../test/mocks/data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed"),
    compare: vi.fn(async () => true),
    hashSync: vi.fn(() => "hashed"),
    compareSync: vi.fn(() => true),
  },
}));

vi.mock("@/components/portfolio/CareerCardSheet", () => ({
  CareerCardSheet: () => null,
}));

vi.mock("@/components/portfolio/qr/QRGeneratorSheet", () => ({
  QRGeneratorSheet: () => null,
}));

import PortfolioEditorPage from "../PortfolioEditorPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { $id: "user-123", id: "user-123" }, isAuthenticated: true }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: { ...mockProfile, $id: "user-123", user_id: "user-123" },
    isLoading: false,
    loading: false,
    updateProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/hooks/useResumes", () => ({
  useResumes: () => ({
    data: mockResumes,
    isLoading: false,
    resumes: mockResumes,
  }),
  getResumeDocumentId: (doc: { $id?: string; id?: string } | null | undefined) =>
    doc?.$id ?? doc?.id,
}));

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => ({
    plan: "free",
    isPremium: false,
    isPro: false,
    isFree: true,
    isTrialing: false,
  }),
}));

vi.mock("@/lib/appwrite", () => ({
  databases: {
    listDocuments: vi.fn().mockResolvedValue({ total: 0, documents: [] }),
    updateDocument: vi.fn().mockResolvedValue({}),
  },
  DATABASE_ID: "test-db",
  ID: { unique: () => "unique-id" },
  Query: {
    equal: (f: string, v: unknown) => `${f}=${v}`,
    limit: (n: number) => `limit=${n}`,
    orderAsc: (f: string) => `orderAsc=${f}`,
    orderDesc: (f: string) => `orderDesc=${f}`,
    isNotNull: (f: string) => `isNotNull=${f}`,
    isNull: (f: string) => `isNull=${f}`,
  },
}));

vi.mock("@/lib/appwrite-functions", () => ({
  appwriteFunctions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("@/hooks/usePortfolioUsernameRules", () => ({
  usePortfolioUsernameRules: () => ({ rules: [], isLoading: false }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

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

  it("renders the portfolio editor without crashing", () => {
    render(<PortfolioEditorPage />, { wrapper });
    // The page should mount without throwing
    expect(document.body).toBeDefined();
  });

  it("shows Portfolio heading or tab", async () => {
    render(<PortfolioEditorPage />, { wrapper });
    // The page renders some navigable content
    const heading = screen.queryByText(/portfolio/i);
    expect(heading).toBeTruthy();
  });
});
