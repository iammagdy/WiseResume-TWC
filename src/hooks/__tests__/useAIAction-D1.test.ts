/**
 * D1 — useAIAction hook unit tests
 * Tests the real hook implementation: credit check → execute → deduct → toast.
 * Unmocks useAIAction (which is globally mocked in setup.ts for consumers).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Unmock the real hook so we can test its implementation
vi.unmock("@/hooks/useAIAction");

// Mock dependencies
const mockCheckCredits = vi.fn().mockResolvedValue(true);
const mockIncrementUsage = { mutate: vi.fn() };

vi.mock("@/hooks/useAICredits", () => ({
  useAICreditsMutations: () => ({
    checkCredits: mockCheckCredits,
    incrementUsage: mockIncrementUsage,
  }),
}));

vi.mock("@/lib/aiCostEstimates", () => ({
  getAICost: vi.fn().mockReturnValue(2),
}));

// Import after mocks are registered
import { useAIAction } from "@/hooks/useAIAction";

describe("useAIAction (D1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckCredits.mockResolvedValue(true);
  });

  it("executes action and returns result when credits available", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue({ summary: "tailored" });

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(value).toEqual({ summary: "tailored" });
  });

  it("returns null when credits check fails", async () => {
    mockCheckCredits.mockResolvedValue(false);
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn();

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(action).not.toHaveBeenCalled();
    expect(value).toBeNull();
  });

  it("returns null and does not deduct credits when action throws", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockRejectedValue(new Error("AI failed"));

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(value).toBeNull();
    expect(mockIncrementUsage.mutate).not.toHaveBeenCalled();
  });

  it("deducts credits equal to operation cost on success", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue("done");

    await act(async () => {
      await result.current.execute(action);
    });

    // getAICost returns 2 in our mock
    expect(mockIncrementUsage.mutate).toHaveBeenCalledTimes(2);
  });

  it("exposes cost from getAICost", () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    expect(result.current.cost).toBe(2);
  });
});
