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
        profile: { ...mockProfile, portfolioExtras: {} },
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
});
