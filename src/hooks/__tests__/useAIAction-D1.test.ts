/**
 * D1 — useAIAction hook unit tests
 * Tests the real hook implementation: execute action → invalidate cache.
 * Credit deduction is now server-side; this hook just executes and handles errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Unmock the real hook so we can test its implementation
vi.unmock("@/hooks/useAIAction");

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

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

// Mock privacy disclosure — always accepted in unit tests
vi.mock("@/components/ai/AIPrivacyDisclosure", () => ({
  hasAcceptedAIPrivacy: vi.fn().mockReturnValue(true),
}));

vi.mock("@/components/ai/AIPrivacyDisclosureProvider", () => ({
  useAIPrivacyDisclosure: vi.fn(() => ({
    requestDisclosure: vi.fn().mockResolvedValue(true),
  })),
}));

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

  // Regression for Task #5 / Task #3 parser unification: a structured
  // `not_configured` error must route through the canonical aiErrorParser
  // ("WiseResume AI is not configured…") and NOT fall through to the
  // legacy `parseErrorMessage` regex sniffer's generic
  // "AI temporarily unavailable" copy. This test guards against anyone
  // re-introducing the dual-parser behaviour.
  it("maps a structured not_configured error to the canonical message", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const structuredErr: Error & { body?: unknown; status?: number } = Object.assign(
      new Error("API key not configured"),
      {
        body: { code: "not_configured", message: "API key not configured" },
        status: 503,
      },
    );
    const action = vi.fn().mockRejectedValue(structuredErr);

    await act(async () => {
      await result.current.execute(action);
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    const [msg] = toastError.mock.calls[0] as [string, unknown];
    expect(msg).toMatch(/not configured/i);
    expect(msg).not.toMatch(/temporarily unavailable/i);
  });
});
