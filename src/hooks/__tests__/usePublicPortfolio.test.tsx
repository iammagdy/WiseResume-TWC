import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePortfolioGate, usePublicPortfolio, usePublicPortfolioByDomain, isAppHostname } from "../usePublicPortfolio";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ username: "johndoe" }),
}));

const fetchSpy = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("fetches gate data through the same-origin public portfolio API", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      passwordEnabled: true,
      accentColor: "#123456",
      exists: true,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { result } = renderHook(() => usePortfolioGate("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public-portfolio?mode=gate&username=johndoe"),
      undefined,
    );
    expect(result.current.data).toEqual({
      passwordEnabled: true,
      accentColor: "#123456",
      exists: true,
    });
  });

  it("should fetch and return profile data for a given username", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      profile: { username: "johndoe", portfolioStyle: "minimal" },
      resume: { $id: "res-1", experience: [], education: [], skills: [], projects: [], certifications: [] },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.profile.username).toBe("johndoe");
  });

  it("should handle fetch errors gracefully", async () => {
    fetchSpy.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error).toBeDefined();
  });

  it("should not fetch when username is undefined", () => {
    const { result } = renderHook(() => usePublicPortfolio(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should return null when profile not found", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 404 }));

    const { result } = renderHook(() => usePublicPortfolio("unknown"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("should handle missing resume fields by providing empty array fallbacks", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      profile: { username: "janedoe" },
      resume: { $id: "resume-1" },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

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

  it("resolves custom domains through the same-origin public portfolio API", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      profile: { username: "janedoe" },
      resume: { $id: "resume-1" },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { result } = renderHook(() => usePublicPortfolioByDomain("portfolio.example.com"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public-portfolio?mode=domain&domain=portfolio.example.com"),
      undefined,
    );
    expect(result.current.data?.profile.username).toBe("janedoe");
  });
});
