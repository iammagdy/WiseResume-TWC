import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePublicPortfolio } from "../usePublicPortfolio";
import { mockSupabaseClient } from "../../test/mocks/supabase";
import { mockProfile } from "../../test/mocks/data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Since usePublicPortfolio uses react-router-dom hooks, we need to mock it
vi.mock("react-router-dom", () => ({
  useParams: () => ({ username: "johndoe" }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("usePublicPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and return profile data for a given username", async () => {
    // Mock the RPC response
    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: {
        profile: {
          ...mockProfile,
          portfolioExtras: {
            caseStudies: [{ id: "1", title: "Study" }],
            services: [{ id: "1", title: "Service" }],
            testimonials: "invalid", // force safeArray branch fallback
            highlights: null // force safeArray branch fallback
          }
        },
        resume: { id: "res-1", title: "Test Resume" }
      }, 
      error: null 
    });

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.profile.username).toBe("johndoe");
  });

  it("should handle fetch errors gracefully", async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: null, 
      error: { message: "Not found" } 
    });

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("should not fetch when username is undefined", () => {
    const { result } = renderHook(() => usePublicPortfolio(undefined), { wrapper });

    // The query should be in 'pending' status but fetchStatus should be 'idle'
    // because enabled is false when username is undefined.
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);

    // Verify RPC was not called
    expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();
  });

  it("should handle missing profile and resume fields by providing default fallbacks", async () => {
    // Mock the RPC response with empty objects
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        profile: {
          // No portfolioExtras tests the fallback `{}` mapping
        },
        resume: {}
      },
      error: null
    });

    const { result } = renderHook(() => usePublicPortfolio("janedoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;
    expect(data).toBeDefined();

    // Verify Profile fallbacks
    expect(data?.profile.fullName).toBeNull();
    expect(data?.profile.username).toBe("janedoe");
    expect(data?.profile.views).toBe(0);
    expect(data?.profile.portfolioStyle).toBe("minimal");
    expect(data?.profile.portfolioLayout).toBe("single");
    expect(data?.profile.portfolioFont).toBe("inter");
    expect(data?.profile.openToWork).toBe(false);
    expect(data?.profile.caseStudies).toEqual([]);
    expect(data?.profile.services).toEqual([]);
    expect(data?.profile.testimonials).toEqual([]);
    expect(data?.profile.highlights).toEqual([]);
    expect(data?.profile.portfolioSyncMode).toBe("auto");
    expect(data?.profile.githubProjectsCache).toEqual([]);

    // Verify Resume fallbacks
    expect(data?.resume.id).toBe("");
    expect(data?.resume.title).toBe("Untitled");
    expect(data?.resume.experience).toEqual([]);
    expect(data?.resume.education).toEqual([]);
    expect(data?.resume.skills).toEqual([]);
    expect(data?.resume.projects).toEqual([]);
    expect(data?.resume.certifications).toEqual([]);
    expect(data?.resume.awards).toEqual([]);
    expect(data?.resume.publications).toEqual([]);
    expect(data?.resume.volunteering).toEqual([]);
    expect(data?.resume.hobbies).toEqual([]);
  });

  it("should handle null data gracefully", async () => {
    // Mock the RPC response returning null data without an error
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => usePublicPortfolio("johndoe"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});
