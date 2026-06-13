import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePublicPortfolio, isAppHostname, validateCustomDomain } from "../usePublicPortfolio";
import {
  getPortfolioCanonicalUrl,
  getPortfolioDisplayUrl,
  PRIMARY_PORTFOLIO_DOMAIN,
} from "../../lib/portfolioUrl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ username: "johndoe" }),
}));

// Mock Appwrite databases used by usePublicPortfolio
const mockListDocuments = vi.fn();
vi.mock("@/lib/appwrite", () => ({
  databases: { listDocuments: (...args: unknown[]) => mockListDocuments(...args) },
  DATABASE_ID: "test-db",
  Query: {
    equal: (field: string, value: unknown) => `${field}=${value}`,
    limit: (n: number) => `limit=${n}`,
  },
}));

const makeProfileDoc = (overrides: Record<string, unknown> = {}) => ({
  $id: "profile-1",
  user_id: "user-123",
  username: "johndoe",
  portfolioEnabled: true,
  portfolioExtras: {},
  ...overrides,
});

const makeResumeDoc = (overrides: Record<string, unknown> = {}) => ({
  $id: "resume-1",
  ...overrides,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// ── Portfolio URL helpers ──────────────────────────────────────────────────────

describe("portfolioUrl helpers", () => {
  it("PRIMARY_PORTFOLIO_DOMAIN is wiseresume.app", () => {
    expect(PRIMARY_PORTFOLIO_DOMAIN).toBe("https://wiseresume.app");
  });

  it("getPortfolioCanonicalUrl returns wiseresume.app URL", () => {
    expect(getPortfolioCanonicalUrl("magdy")).toBe("https://wiseresume.app/p/magdy");
  });

  it("getPortfolioDisplayUrl shows wiseresume.app without protocol", () => {
    expect(getPortfolioDisplayUrl("magdy")).toBe("wiseresume.app/p/magdy");
  });

  it("display URL does NOT contain resume.thewise.cloud", () => {
    expect(getPortfolioDisplayUrl("magdy")).not.toContain("resume.thewise.cloud");
  });

  it("canonical URL does NOT contain resume.thewise.cloud", () => {
    expect(getPortfolioCanonicalUrl("magdy")).not.toContain("resume.thewise.cloud");
  });
});

// ── validateCustomDomain ──────────────────────────────────────────────────────

describe("validateCustomDomain", () => {
  it("rejects wiseresume.app", () => {
    expect(validateCustomDomain("wiseresume.app")).not.toBeNull();
  });

  it("rejects www.wiseresume.app", () => {
    expect(validateCustomDomain("www.wiseresume.app")).not.toBeNull();
  });

  it("rejects resume.thewise.cloud", () => {
    expect(validateCustomDomain("resume.thewise.cloud")).not.toBeNull();
  });

  it("rejects thewise.cloud", () => {
    expect(validateCustomDomain("thewise.cloud")).not.toBeNull();
  });

  it("allows a genuine custom portfolio domain", () => {
    expect(validateCustomDomain("portfolio.johndoe.com")).toBeNull();
  });

  it("allows another genuine custom portfolio domain", () => {
    expect(validateCustomDomain("cv.janedoe.io")).toBeNull();
  });

  it("rejects invalid domain format", () => {
    expect(validateCustomDomain("not a domain")).not.toBeNull();
  });
});

// ── isAppHostname ─────────────────────────────────────────────────────────────

describe("isAppHostname", () => {
  it("classifies wiseresume.app as first-party", () => {
    expect(isAppHostname("wiseresume.app")).toBe(true);
  });

  it("classifies www.wiseresume.app as first-party", () => {
    expect(isAppHostname("www.wiseresume.app")).toBe(true);
  });

  it("classifies resume.thewise.cloud as first-party", () => {
    expect(isAppHostname("resume.thewise.cloud")).toBe(true);
  });

  it("classifies thewise.cloud as first-party", () => {
    expect(isAppHostname("thewise.cloud")).toBe(true);
  });

  it("classifies localhost as first-party", () => {
    expect(isAppHostname("localhost")).toBe(true);
  });

  it("classifies 127.0.0.1 as first-party", () => {
    expect(isAppHostname("127.0.0.1")).toBe(true);
  });

  it("does NOT classify fakewiseresume.app as first-party", () => {
    expect(isAppHostname("fakewiseresume.app")).toBe(false);
  });

  it("does NOT classify mywiseresume.app as first-party", () => {
    expect(isAppHostname("mywiseresume.app")).toBe(false);
  });

  it("does NOT classify an unrelated custom domain as first-party", () => {
    expect(isAppHostname("john-doe-portfolio.com")).toBe(false);
  });

  it("does NOT classify another unrelated custom domain as first-party", () => {
    expect(isAppHostname("mycv.io")).toBe(false);
  });
});

describe("usePublicPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and return profile data for a given username", async () => {
    mockListDocuments
      .mockResolvedValueOnce({ total: 1, documents: [makeProfileDoc()] })
      .mockResolvedValueOnce({ total: 1, documents: [makeResumeDoc({ $id: "res-1" })] });

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.profile.username).toBe("johndoe");
  });

  it("should handle fetch errors gracefully", async () => {
    // The hook retries up to 2 times — reject all calls
    mockListDocuments.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error).toBeDefined();
  });

  it("should not fetch when username is undefined", () => {
    const { result } = renderHook(() => usePublicPortfolio(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it("should return null when profile not found", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

    const { result } = renderHook(() => usePublicPortfolio("unknown"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("should handle missing resume fields by providing empty array fallbacks", async () => {
    mockListDocuments
      .mockResolvedValueOnce({
        total: 1,
        documents: [makeProfileDoc({ username: "janedoe" })],
      })
      .mockResolvedValueOnce({ total: 0, documents: [] });

    const { result } = renderHook(() => usePublicPortfolio("janedoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;
    expect(data).toBeDefined();
    expect(data?.resume.experience).toEqual([]);
    expect(data?.resume.education).toEqual([]);
    expect(data?.resume.skills).toEqual([]);
    expect(data?.resume.projects).toEqual([]);
    expect(data?.resume.certifications).toEqual([]);
  });
});
