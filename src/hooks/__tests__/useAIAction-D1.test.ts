/**
 * D1 — useAIAction hook unit tests
 * Tests the real hook implementation: execute action → invalidate cache.
 * Credit deduction is now server-side; this hook just executes and handles errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Unmock the real hook so we can test its implementation
vi.unmock("@/hooks/useAIAction");

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

// Import after mocks are registered
import { useAIAction } from "@/hooks/useAIAction";

describe("useAIAction (D1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes action and returns result", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue({ summary: "tailored" });

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(value).toEqual({ summary: "tailored" });
  });

  it("invalidates credits cache after successful action", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue("done");

    await act(async () => {
      await result.current.execute(action);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["me"] })
    );
  });

  it("returns null and does not invalidate cache when action throws", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockRejectedValue(new Error("AI failed"));

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(value).toBeNull();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
